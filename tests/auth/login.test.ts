/** @jest-environment node */

import { scryptSync, randomBytes } from 'node:crypto'
import { POST } from '@/app/api/auth/login/route'

const PASSWORD = 'senha-de-teste'
const EMAIL = 'pessoa@exemplo.com'
const SESSION_SECRET = 'segredo-de-teste-com-entropia-suficiente'

function hashDeTeste(senha: string): string {
  const salt = randomBytes(16)
  const key = scryptSync(senha, salt, 64, { N: 16384, r: 8, p: 1 })
  return `scrypt:16384:8:1:${salt.toString('hex')}:${key.toString('hex')}`
}

const PASSWORD_HASH = hashDeTeste(PASSWORD)

function requisicaoLogin(
  campos: Record<string, string>,
  url = 'http://localhost/api/auth/login'
): Request {
  const body = new URLSearchParams(campos)
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    process.env.AUTH_USER_EMAIL = EMAIL
    process.env.AUTH_PASSWORD_HASH = PASSWORD_HASH
    process.env.SESSION_SECRET = SESSION_SECRET
  })

  it('credencial válida cria sessão e redireciona para a área privada', async () => {
    const resposta = await POST(requisicaoLogin({ email: EMAIL, password: PASSWORD }))

    expect(resposta.status).toBe(303)
    expect(resposta.headers.get('location')).toBe('/hoje')

    const cookie = resposta.headers.getSetCookie().join(';')
    expect(cookie).toContain('apoio_sessao=')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=lax')
    expect(cookie).toContain('Path=/')
    expect(cookie).toContain('Max-Age=')
  })

  it('marca o cookie como Secure em requisição HTTPS', async () => {
    const resposta = await POST(
      requisicaoLogin(
        { email: EMAIL, password: PASSWORD },
        'https://apoio-tdah.vercel.app/api/auth/login'
      )
    )

    expect(resposta.headers.getSetCookie().join(';')).toContain('Secure')
  })

  it('não marca Secure em requisição HTTP local', async () => {
    const resposta = await POST(requisicaoLogin({ email: EMAIL, password: PASSWORD }))

    expect(resposta.headers.getSetCookie().join(';')).not.toContain('Secure')
  })

  it('credencial inválida retorna ao login com erro genérico', async () => {
    const resposta = await POST(requisicaoLogin({ email: EMAIL, password: 'senha-errada' }))

    expect(resposta.status).toBe(303)
    expect(resposta.headers.get('location')).toBe('/login?erro=credencial')
    expect(resposta.headers.getSetCookie().join(';')).not.toContain('apoio_sessao=')
  })

  it('e-mail desconhecido produz a mesma resposta que senha errada', async () => {
    const resposta = await POST(requisicaoLogin({ email: 'outro@exemplo.com', password: PASSWORD }))

    expect(resposta.status).toBe(303)
    expect(resposta.headers.get('location')).toBe('/login?erro=credencial')
  })

  it('campos ausentes produz a mesma resposta genérica', async () => {
    const resposta = await POST(requisicaoLogin({}))

    expect(resposta.status).toBe(303)
    expect(resposta.headers.get('location')).toBe('/login?erro=credencial')
  })

  it('não expõe hash, segredo ou senha nas respostas', async () => {
    for (const resposta of [
      await POST(requisicaoLogin({ email: EMAIL, password: PASSWORD })),
      await POST(requisicaoLogin({ email: EMAIL, password: 'errada' })),
    ]) {
      const conteudo = [
        resposta.headers.get('location') ?? '',
        resposta.headers.getSetCookie().join(';'),
        await resposta.text(),
      ].join(' ')
      expect(conteudo).not.toContain(PASSWORD)
      expect(conteudo).not.toContain(SESSION_SECRET)
      expect(conteudo).not.toContain(PASSWORD_HASH)
    }
  })
})
