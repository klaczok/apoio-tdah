/** @jest-environment node */

import { newDb, type IMemoryDb } from 'pg-mem'
import { hashSenha, serializePasswordHash, type PasswordHash } from '@/server/auth/senha'
import { MemoryUserStore, type CelulaUsuarios } from '@/server/identidade/memory'
import { PostgresUserStore } from '@/server/identidade/postgres'
import { normalizarEmail, type UserStore } from '@/server/identidade/usuarios'
import type { Queryable } from '@/server/persistence/postgres'

const SENHA = 'senha-em-claro-123'

type Cenario = {
  nome: string
  preparar: () => Promise<{
    store: UserStore
    senhaHashPersistida: (id: string) => Promise<unknown>
    corromper: (id: string, senhaHash: string) => Promise<void>
    quebrar: () => void
  }>
}

const cenarios: Cenario[] = [
  {
    nome: 'MemoryUserStore',
    preparar: async () => {
      const celula: CelulaUsuarios = { registros: new Map(), indisponivel: false }
      const store = new MemoryUserStore(celula)
      return {
        store,
        senhaHashPersistida: async (id) => celula.registros.get(id)?.senhaHash,
        corromper: async (id, senhaHash) => {
          const registro = celula.registros.get(id)
          if (registro) registro.senhaHash = senhaHash
        },
        quebrar: () => {
          celula.indisponivel = true
        },
      }
    },
  },
  {
    nome: 'PostgresUserStore',
    preparar: async () => {
      const db: IMemoryDb = newDb()
      const pool = new (db.adapters.createPg().Pool)() as unknown as Queryable
      let quebrado = false
      const proxy: Queryable = {
        query: (text, params) =>
          quebrado ? Promise.reject(new Error('falha simulada')) : pool.query(text, params),
      }
      const store = new PostgresUserStore(proxy)
      return {
        store,
        senhaHashPersistida: async (id) => {
          const { rows } = await pool.query('SELECT senha_hash FROM usuarios WHERE id = $1', [id])
          return rows[0]?.senha_hash
        },
        corromper: async (id, senhaHash) => {
          await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [senhaHash, id])
        },
        quebrar: () => {
          quebrado = true
        },
      }
    },
  },
]

async function hashDe(senha: string): Promise<PasswordHash> {
  return hashSenha(senha)
}

describe.each(cenarios)('contrato UserStore — $nome', ({ preparar }) => {
  it('cria usuário com id opaco estável, e-mail normalizado e timestamps', async () => {
    const { store } = await preparar()

    const criado = await store.criarUsuario({
      email: '  Pessoa@Exemplo.COM ',
      senhaHash: await hashDe(SENHA),
    })

    expect(criado.ok).toBe(true)
    if (!criado.ok) return
    const usuario = criado.value
    expect(usuario.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(usuario.email).toBe('pessoa@exemplo.com')
    expect(usuario.criadoEm).toBeInstanceOf(Date)
    expect(usuario.atualizadoEm).toBeInstanceOf(Date)

    const relido = await store.buscarPorId(usuario.id)
    expect(relido.ok && relido.value?.id).toBe(usuario.id)
  })

  it('rejeita duplicidade de e-mail normalizado, inclusive sob tentativas concorrentes', async () => {
    const { store } = await preparar()
    const senhaHash = await hashDe(SENHA)

    const primeiro = await store.criarUsuario({ email: 'a@exemplo.com', senhaHash })
    const duplicado = await store.criarUsuario({ email: ' A@exemplo.com', senhaHash })

    expect(primeiro.ok).toBe(true)
    expect(duplicado).toEqual({ ok: false, error: { kind: 'email-em-uso' } })

    const [x, y] = await Promise.all([
      store.criarUsuario({ email: 'concorrente@exemplo.com', senhaHash }),
      store.criarUsuario({ email: 'Concorrente@Exemplo.com ', senhaHash }),
    ])
    const resultados = [x, y]
    expect(resultados.filter((r) => r.ok)).toHaveLength(1)
    expect(resultados.filter((r) => !r.ok && r.error.kind === 'email-em-uso')).toHaveLength(1)
  })

  it('busca por e-mail normalizando a entrada', async () => {
    const { store } = await preparar()
    await store.criarUsuario({ email: 'busca@exemplo.com', senhaHash: await hashDe(SENHA) })

    const encontrado = await store.buscarPorEmail(' Busca@Exemplo.COM ')
    expect(encontrado.ok && encontrado.value?.email).toBe('busca@exemplo.com')

    const ausente = await store.buscarPorEmail('ninguem@exemplo.com')
    expect(ausente).toEqual({ ok: true, value: null })
  })

  it('busca por id retorna usuário ou nulo', async () => {
    const { store } = await preparar()
    const criado = await store.criarUsuario({
      email: 'por-id@exemplo.com',
      senhaHash: await hashDe(SENHA),
    })
    expect(criado.ok).toBe(true)
    if (!criado.ok) return

    const encontrado = await store.buscarPorId(criado.value.id)
    expect(encontrado.ok && encontrado.value?.email).toBe('por-id@exemplo.com')

    const ausente = await store.buscarPorId('id-inexistente')
    expect(ausente).toEqual({ ok: true, value: null })
  })

  it('rejeita entrada inválida sem persistir', async () => {
    const { store } = await preparar()

    for (const email of ['', '   ', 'sem-arroba']) {
      const resultado = await store.criarUsuario({ email, senhaHash: await hashDe(SENHA) })
      expect(resultado.ok).toBe(false)
      if (!resultado.ok) expect(resultado.error.kind).toBe('entrada-invalida')
    }
  })

  it('persiste hash de senha e nunca a senha em texto simples', async () => {
    const { store, senhaHashPersistida } = await preparar()

    const criado = await store.criarUsuario({
      email: 'segredo@exemplo.com',
      senhaHash: await hashDe(SENHA),
    })
    expect(criado.ok).toBe(true)
    if (!criado.ok) return

    const persistido = await senhaHashPersistida(criado.value.id)
    expect(typeof persistido).toBe('string')
    expect(String(persistido)).toMatch(/^scrypt:\d+:\d+:\d+:[0-9a-f]+:[0-9a-f]+$/)
    expect(String(persistido)).not.toContain(SENHA)
    expect(JSON.stringify(criado.value)).not.toContain(SENHA)
  })

  it('registro com hash corrompido gera erro explícito na leitura', async () => {
    const { store, corromper } = await preparar()
    const criado = await store.criarUsuario({
      email: 'corrupto@exemplo.com',
      senhaHash: await hashDe(SENHA),
    })
    expect(criado.ok).toBe(true)
    if (!criado.ok) return

    await corromper(criado.value.id, 'nao-e-um-hash')

    const lido = await store.buscarPorId(criado.value.id)
    expect(lido.ok).toBe(false)
    if (!lido.ok) expect(lido.error.kind).toBe('schema-invalido')
  })

  it('falha de armazenamento é explícita e não registra senha nem hash em log', async () => {
    const { store, quebrar } = await preparar()
    const espiao = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      quebrar()

      const senhaHash = await hashDe(SENHA)
      const criacao = await store.criarUsuario({ email: 'x@exemplo.com', senhaHash })
      const leitura = await store.buscarPorEmail('x@exemplo.com')

      for (const resultado of [criacao, leitura]) {
        expect(resultado.ok).toBe(false)
        if (!resultado.ok) expect(resultado.error.kind).toBe('armazenamento-indisponivel')
      }

      const log = espiao.mock.calls.flat().join(' ')
      expect(log).not.toContain(SENHA)
      expect(log).not.toContain(serializePasswordHash(senhaHash))
    } finally {
      espiao.mockRestore()
    }
  })
})

describe('normalizarEmail', () => {
  it('remove espaços externos e converte para minúsculas', () => {
    expect(normalizarEmail('  Foo@Bar.com ')).toBe('foo@bar.com')
    expect(normalizarEmail('a@b.c')).toBe('a@b.c')
  })
})

describe('PostgresUserStore — isolamento de tabelas', () => {
  it('nomes de tabela inseguros são rejeitados', async () => {
    const db: IMemoryDb = newDb()
    const pool = new (db.adapters.createPg().Pool)() as unknown as Queryable

    for (const nome of ['usuarios; DROP TABLE x', 'usuarios-x', '1t', '']) {
      expect(() => new PostgresUserStore(pool, nome)).toThrow()
    }
  })

  it('preview e produção não compartilham usuários', async () => {
    const db: IMemoryDb = newDb()
    const pool = new (db.adapters.createPg().Pool)() as unknown as Queryable
    const producao = new PostgresUserStore(pool, 'usuarios')
    const preview = new PostgresUserStore(pool, 'usuarios_preview')

    await producao.criarUsuario({ email: 'prod@exemplo.com', senhaHash: await hashDe(SENHA) })

    const lidoPreview = await preview.buscarPorEmail('prod@exemplo.com')
    expect(lidoPreview).toEqual({ ok: true, value: null })

    const lidoProducao = await producao.buscarPorEmail('prod@exemplo.com')
    expect(lidoProducao.ok && lidoProducao.value?.email).toBe('prod@exemplo.com')
  })
})
