/** @jest-environment node */

import { POST } from '@/app/api/auth/cadastro/route'
import { hashSenha } from '@/server/auth/senha'
import { verifySessionToken } from '@/server/auth/session'
import { getUserStore } from '@/server/identidade'
import { getStateStore } from '@/server/persistence'

const EMAIL = 'nova@exemplo.com'
const SENHA = 'senha-com-oito-ou-mais'
const SESSION_SECRET = 'segredo-de-teste-com-entropia-suficiente'

function requisicaoCadastro(
  campos: Record<string, string>,
  url = 'http://localhost/api/auth/cadastro'
): Request {
  const body = new URLSearchParams(campos)
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
}

function usarDriver(driver: string) {
  process.env.PERSISTENCE_DRIVER = driver
  const g = globalThis as { __userStore?: unknown; __estadoStores?: unknown }
  delete g.__userStore
  delete g.__estadoStores
}

function localizacao(resposta: Response): string {
  return resposta.headers.get('location') ?? ''
}

describe('POST /api/auth/cadastro', () => {
  beforeEach(() => {
    usarDriver('memory')
    process.env.SESSION_SECRET = SESSION_SECRET
  })

  it('cadastro válido emite sessão e entra na área privada sem repetir credenciais', async () => {
    const resposta = await POST(
      requisicaoCadastro({ email: EMAIL, senha: SENHA, confirmacao: SENHA })
    )

    expect(resposta.status).toBe(303)
    expect(localizacao(resposta)).toBe('/hoje')

    const cookie = resposta.headers.getSetCookie().join(';')
    expect(cookie).toContain('apoio_sessao=')
    expect(cookie).toContain('HttpOnly')

    const token = /apoio_sessao=([^;]+)/.exec(cookie)?.[1]
    const sessao = await verifySessionToken(SESSION_SECRET, token!, new Date())
    const usuarios = await getUserStore()
    const conta = await usuarios.buscarPorEmail(EMAIL)
    expect(conta.ok && conta.value).toBeTruthy()
    expect(sessao).toEqual({ usuarioId: conta.ok && conta.value ? conta.value.id : null })
  })

  it('cadastro cria o EstadoPrivado vazio do novo proprietário', async () => {
    await POST(requisicaoCadastro({ email: EMAIL, senha: SENHA, confirmacao: SENHA }))

    const usuarios = await getUserStore()
    const conta = await usuarios.buscarPorEmail(EMAIL)
    if (!conta.ok || !conta.value) throw new Error('conta não criada')

    const store = await getStateStore(conta.value.id)
    const estado = await store.load()
    expect(estado.ok).toBe(true)
    if (estado.ok) {
      expect(estado.value.version).toBe(1)
      expect(estado.value.dados).toEqual({
        notasPorDia: {},
        rotina: expect.anything(),
        propostaSemanal: null,
        semanaAtiva: null,
        dias: {},
      })
    }
  })

  it('normaliza caixa e espaços do e-mail antes de persistir e autenticar', async () => {
    const resposta = await POST(
      requisicaoCadastro({ email: '  Nova@Exemplo.COM ', senha: SENHA, confirmacao: SENHA })
    )
    expect(resposta.status).toBe(303)
    expect(localizacao(resposta)).toBe('/hoje')

    const usuarios = await getUserStore()
    const conta = await usuarios.buscarPorEmail(EMAIL)
    expect(conta.ok && conta.value?.email).toBe(EMAIL)
  })

  it('e-mail em formato inválido retorna erro associado ao campo', async () => {
    const resposta = await POST(
      requisicaoCadastro({ email: 'nao-e-email', senha: SENHA, confirmacao: SENHA })
    )
    expect(localizacao(resposta)).toContain('/cadastro?')
    expect(localizacao(resposta)).toContain('erro=email-invalido')
    expect(localizacao(resposta)).not.toContain(SENHA)
    expect(localizacao(resposta)).not.toContain('senha=')
  })

  it('senha fora dos requisitos retorna erro de senha', async () => {
    const resposta = await POST(
      requisicaoCadastro({ email: EMAIL, senha: 'curta', confirmacao: 'curta' })
    )
    expect(localizacao(resposta)).toContain('erro=senha-fraca')
    expect(localizacao(resposta)).not.toContain('curta')
  })

  it('confirmação divergente retorna erro de confirmação', async () => {
    const resposta = await POST(
      requisicaoCadastro({ email: EMAIL, senha: SENHA, confirmacao: 'outra-senha-valida' })
    )
    expect(localizacao(resposta)).toContain('erro=confirmacao-divergente')
    expect(localizacao(resposta)).not.toContain(SENHA)
  })

  it('e-mail duplicado produz erro claro sem expor dados da conta', async () => {
    const usuarios = await getUserStore()
    await usuarios.criarUsuario({ email: EMAIL, senhaHash: await hashSenha('senha-existente') })

    const resposta = await POST(
      requisicaoCadastro({ email: 'NOVA@exemplo.com', senha: SENHA, confirmacao: SENHA })
    )
    expect(localizacao(resposta)).toContain('erro=email-em-uso')
    expect(localizacao(resposta)).not.toContain('scrypt')
    expect(localizacao(resposta)).not.toContain('senha-existente')
  })

  it('repositório indisponível produz erro tratável e não emite sessão', async () => {
    usarDriver('driver-inexistente')
    const resposta = await POST(
      requisicaoCadastro({ email: EMAIL, senha: SENHA, confirmacao: SENHA })
    )
    expect(localizacao(resposta)).toContain('erro=indisponivel')
    expect(resposta.headers.getSetCookie().join(';')).not.toContain('apoio_sessao=')
  })

  it('falhas preservam o e-mail informado e nunca a senha na URL', async () => {
    const resposta = await POST(
      requisicaoCadastro({ email: EMAIL, senha: 'curta', confirmacao: 'curta' })
    )
    const url = decodeURIComponent(localizacao(resposta))
    expect(url).toContain(`email=${EMAIL}`)
    expect(url).not.toContain('curta')
  })

  it('não expõe senha, hash ou segredo em nenhuma resposta', async () => {
    for (const resposta of [
      await POST(requisicaoCadastro({ email: EMAIL, senha: SENHA, confirmacao: SENHA })),
      await POST(
        requisicaoCadastro({ email: EMAIL, senha: 'x'.repeat(9), confirmacao: 'y'.repeat(9) })
      ),
    ]) {
      const conteudo = [
        localizacao(resposta),
        resposta.headers.getSetCookie().join(';'),
        await resposta.text(),
      ].join(' ')
      expect(conteudo).not.toContain(SENHA)
      expect(conteudo).not.toContain('scrypt')
      expect(conteudo).not.toContain(SESSION_SECRET)
    }
  })
})
