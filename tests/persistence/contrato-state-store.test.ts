/** @jest-environment node */

import { newDb, type IMemoryDb } from 'pg-mem'
import { MemoryStateStore, type CelulaMemoria } from '@/server/persistence/memory'
import { PostgresStateStore, type Queryable } from '@/server/persistence/postgres'
import type { StateStore } from '@/server/persistence/store'
import { estadoVazio, SCHEMA_VERSION, type EstadoPrivado } from '@/server/persistence/estado'
import { rotinaVazia } from '@/server/rotina/modelo'

function dados(notasPorDia: Record<string, string>): EstadoPrivado {
  return { ...estadoVazio(), notasPorDia }
}

type Cenario = {
  nome: string
  preparar: () => Promise<{
    store: StateStore
    corromper: (valor: unknown, schemaVersion?: number) => Promise<void>
    quebrar: () => Promise<void>
  }>
}

const cenarios: Cenario[] = [
  {
    nome: 'MemoryStateStore',
    preparar: async () => {
      const celula: CelulaMemoria = { dados: null, version: 0, indisponivel: false }
      const store = new MemoryStateStore(celula)
      return {
        store,
        corromper: async (valor, schemaVersion) => {
          celula.dados = valor
          if (schemaVersion !== undefined) celula.schemaVersion = schemaVersion
        },
        quebrar: async () => {
          celula.indisponivel = true
        },
      }
    },
  },
  {
    nome: 'PostgresStateStore',
    preparar: async () => {
      const db: IMemoryDb = newDb()
      const pool = new (db.adapters.createPg().Pool)() as unknown as Queryable
      let quebrado = false
      const proxy: Queryable = {
        query: (text, params) =>
          quebrado ? Promise.reject(new Error('falha simulada')) : pool.query(text, params),
      }
      const store = new PostgresStateStore(proxy, 'u-contrato')
      return {
        store,
        corromper: async (valor, schemaVersion) => {
          await pool.query(
            "UPDATE estado_usuario SET dados = $1::jsonb, schema_version = $2 WHERE id = 'u-contrato'",
            [JSON.stringify(valor), schemaVersion ?? SCHEMA_VERSION]
          )
        },
        quebrar: async () => {
          quebrado = true
        },
      }
    },
  },
]

describe.each(cenarios)('contrato StateStore — $nome', ({ preparar }) => {
  it('primeira leitura retorna estado vazio versionado', async () => {
    const { store } = await preparar()

    const resultado = await store.load()

    expect(resultado).toEqual({ ok: true, value: { version: 0, dados: estadoVazio() } })
  })

  it('gravação seguida de leitura devolve os mesmos dados', async () => {
    const { store } = await preparar()
    const esperado = dados({ '2026-10-09': 'levar documento' })

    expect(await store.save(esperado, 0)).toEqual({ ok: true, value: 1 })

    const lido = await store.load()
    expect(lido.ok && lido.value.dados).toEqual(esperado)
    expect(lido.ok && lido.value.version).toBe(1)
  })

  it('faz round-trip de caracteres especiais conforme serialização canônica', async () => {
    const { store } = await preparar()
    const texto = 'Aspas "duplas", vírgula; ponto-e-vírgula\nnova linha\r\nCRLF\tTab áéíóú çñ 😀'

    await store.save(dados({ '2026-10-09': texto }), 0)

    const lido = await store.load()
    expect(lido.ok && lido.value.dados.notasPorDia['2026-10-09']).toBe(texto)
  })

  it('rejeita gravação com versão defasada sem sobrescrever', async () => {
    const { store } = await preparar()

    await store.save(dados({ '2026-10-09': 'primeira' }), 0)
    const conflito = await store.save(dados({ '2026-10-09': 'segunda' }), 0)

    expect(conflito).toEqual({ ok: false, error: { kind: 'conflito-versao' } })

    const lido = await store.load()
    expect(lido.ok && lido.value.dados.notasPorDia['2026-10-09']).toBe('primeira')
  })

  it('gravação de dados fora do schema não é confirmada', async () => {
    const { store } = await preparar()

    const resultado = await store.save({ notasPorDia: 'invalido' } as never, 0)

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.error.kind).toBe('schema-invalido')
  })

  it('conteúdo armazenado que viola o schema gera erro explícito', async () => {
    const { store, corromper } = await preparar()
    await store.save(estadoVazio(), 0)
    await corromper({ notasPorDia: 'nao-e-um-mapa' })

    const resultado = await store.load()

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.error.kind).toBe('schema-invalido')
  })

  it('migra estado gravado no schema v1 preservando o conteúdo', async () => {
    const { store, corromper } = await preparar()
    await store.save(estadoVazio(), 0)
    await corromper({ notasPorDia: { '2026-10-09': 'legado' } }, 1)

    const lido = await store.load()

    expect(lido.ok).toBe(true)
    if (lido.ok) {
      expect(lido.value.dados.notasPorDia['2026-10-09']).toBe('legado')
      expect(lido.value.dados.rotina).toEqual(rotinaVazia())
    }
  })

  it('recupera de falha transitória de armazenamento', async () => {
    const { store, quebrar } = await preparar()
    await quebrar()

    const leitura = await store.load()
    const gravacao = await store.save(estadoVazio(), 0)

    for (const resultado of [leitura, gravacao]) {
      expect(resultado.ok).toBe(false)
      if (!resultado.ok) expect(resultado.error.kind).toBe('armazenamento-indisponivel')
    }
  })

  it('não retorna hash de credencial nas leituras comuns', async () => {
    const { store } = await preparar()
    await store.save(dados({ '2026-10-09': 'nota' }), 0)

    const lido = await store.load()
    const serializado = JSON.stringify(lido.ok ? lido.value : lido.error)

    expect(serializado).not.toContain('scrypt')
    expect(serializado).not.toContain('password')
    expect(serializado).not.toContain('senha')
  })
})

// Casos exclusivos do adapter Postgres: exercitam tabela, proprietário e
// concorrência de linha — sem correspondente no adapter de memória.
describe('PostgresStateStore — isolamento por proprietário', () => {
  function novoPool(): Queryable {
    const db: IMemoryDb = newDb()
    return new (db.adapters.createPg().Pool)() as unknown as Queryable
  }

  it('isola dados entre tabelas no mesmo banco — preview não vê produção', async () => {
    const pool = novoPool()
    const producao = new PostgresStateStore(pool, 'u-contrato')
    const preview = new PostgresStateStore(pool, 'u-contrato', 'estado_usuario_preview')

    await producao.save(dados({ '2026-10-09': 'dado de produção' }), 0)

    const lidoPreview = await preview.load()
    expect(lidoPreview.ok && lidoPreview.value.dados).toEqual(estadoVazio())

    const lidoProducao = await producao.load()
    expect(lidoProducao.ok && lidoProducao.value.dados.notasPorDia['2026-10-09']).toBe(
      'dado de produção'
    )
  })

  it('rejeita nome de tabela que não é identificador seguro', async () => {
    const pool = novoPool()

    for (const nome of ['estado; DROP TABLE x', 'estado-usuario', '1tabela', '']) {
      expect(() => new PostgresStateStore(pool, 'u-contrato', nome)).toThrow()
    }
  })

  it('duas contas no mesmo banco não leem nem alteram o estado uma da outra', async () => {
    const pool = novoPool()
    const alice = new PostgresStateStore(pool, 'u-alice')
    const bob = new PostgresStateStore(pool, 'u-bob')

    expect(await bob.load()).toEqual({
      ok: true,
      value: { version: 0, dados: estadoVazio() },
    })

    await alice.save(dados({ '2026-10-09': 'nota da alice' }), 0)

    expect(await bob.load()).toEqual({
      ok: true,
      value: { version: 0, dados: estadoVazio() },
    })
    const lidoAlice = await alice.load()
    expect(lidoAlice.ok && lidoAlice.value.dados.notasPorDia['2026-10-09']).toBe('nota da alice')
  })

  it('concorrência otimista é independente por usuário', async () => {
    const pool = novoPool()
    const alice = new PostgresStateStore(pool, 'u-alice')
    const bob = new PostgresStateStore(pool, 'u-bob')

    expect(await alice.save(dados({}), 0)).toEqual({ ok: true, value: 1 })
    expect(await bob.save(dados({}), 0)).toEqual({ ok: true, value: 1 })

    const conflitoAlice = await alice.save(dados({}), 0)
    expect(conflitoAlice).toEqual({ ok: false, error: { kind: 'conflito-versao' } })
    expect(await bob.save(dados({}), 1)).toEqual({ ok: true, value: 2 })
  })

  it('primeira gravação concorrente na mesma conta confirma só uma', async () => {
    const pool = novoPool()
    const store = new PostgresStateStore(pool, 'u-novo')

    const [a, b] = await Promise.all([store.save(dados({}), 0), store.save(dados({}), 0)])

    expect([a, b].filter((r) => r.ok)).toHaveLength(1)
    expect([a, b].filter((r) => !r.ok && r.error.kind === 'conflito-versao')).toHaveLength(1)
  })
})
