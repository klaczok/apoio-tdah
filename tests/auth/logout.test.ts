/** @jest-environment node */

import { POST } from '@/app/api/auth/logout/route'

describe('POST /api/auth/logout', () => {
  it('encerra a sessão local e redireciona para a página pública', async () => {
    const resposta = await POST(new Request('http://localhost/api/auth/logout', { method: 'POST' }))

    expect(resposta.status).toBe(303)
    expect(resposta.headers.get('location')).toBe('http://localhost/')
  })

  it('expira o cookie de sessão', async () => {
    const resposta = await POST(new Request('http://localhost/api/auth/logout', { method: 'POST' }))

    const cookie = resposta.headers.getSetCookie().join(';')
    expect(cookie).toContain('apoio_sessao=')
    expect(cookie).toContain('Max-Age=0')
    expect(cookie).toContain('HttpOnly')
  })

  it('funciona mesmo sem sessão ativa', async () => {
    const resposta = await POST(new Request('http://localhost/api/auth/logout', { method: 'POST' }))

    expect(resposta.status).toBe(303)
  })
})
