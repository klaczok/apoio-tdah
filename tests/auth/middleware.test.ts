/** @jest-environment node */

import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'
import { createSessionToken } from '@/server/auth/session'

const SESSION_SECRET = 'segredo-de-teste-com-entropia-suficiente'

async function tokenValido() {
  return createSessionToken(
    { sessionSecret: SESSION_SECRET, sessionTtlSeconds: 7 * 24 * 60 * 60 },
    new Date()
  )
}

function requisicao(caminho: string, cookie?: string) {
  const headers = new Headers()
  if (cookie) headers.set('cookie', `apoio_sessao=${cookie}`)
  return new NextRequest(`http://localhost${caminho}`, { headers })
}

describe('proteção de rotas privadas', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = SESSION_SECRET
  })

  it('requisição sem sessão é redirecionada ao login', async () => {
    const resposta = await middleware(requisicao('/hoje'))

    expect(resposta.status).toBe(307)
    expect(resposta.headers.get('location')).toBe('http://localhost/login')
  })

  it('sessão válida permite acesso à rota privada', async () => {
    const resposta = await middleware(requisicao('/hoje', await tokenValido()))

    expect(resposta.status).toBe(200)
  })

  it('rota ainda não existente também exige sessão', async () => {
    const resposta = await middleware(requisicao('/semana'))

    expect(resposta.status).toBe(307)
    expect(resposta.headers.get('location')).toBe('http://localhost/login')
  })

  it('rotas públicas não exigem sessão', async () => {
    for (const caminho of ['/', '/login', '/api/auth/login']) {
      const resposta = await middleware(requisicao(caminho))
      expect(resposta.status).toBe(200)
    }
  })

  it('token adulterado é rejeitado', async () => {
    const token = (await tokenValido()).slice(0, -4) + 'XXXX'
    const resposta = await middleware(requisicao('/hoje', token))

    expect(resposta.status).toBe(307)
    expect(resposta.headers.get('location')).toBe('http://localhost/login')
  })

  it('segredo de sessão ausente bloqueia o acesso', async () => {
    delete process.env.SESSION_SECRET
    const resposta = await middleware(requisicao('/hoje', await tokenValido()))

    expect(resposta.status).toBe(307)
  })
})
