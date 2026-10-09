/** @jest-environment node */

import { createSessionToken, verifySessionToken } from '@/server/auth/session'

const config = {
  sessionSecret: 'segredo-de-teste-com-entropia-suficiente',
  sessionTtlSeconds: 7 * 24 * 60 * 60,
}

const now = new Date('2026-10-09T12:00:00Z')
const verificar = (token: string, instante = now) =>
  verifySessionToken(config.sessionSecret, token, instante)

describe('sessão', () => {
  it('aceita um token recém-criado', async () => {
    const token = await createSessionToken(config, now)

    await expect(verificar(token)).resolves.toBe(true)
  })

  it('rejeita um token adulterado', async () => {
    const token = await createSessionToken(config, now)
    const tampered = token.slice(0, -4) + 'XXXX'

    await expect(verificar(tampered)).resolves.toBe(false)
  })

  it('rejeita um token após expirar', async () => {
    const token = await createSessionToken(config, now)
    const depoisDeExpirar = new Date(now.getTime() + (config.sessionTtlSeconds + 1) * 1000)

    await expect(verificar(token, depoisDeExpirar)).resolves.toBe(false)
  })

  it('rejeita um token assinado com outro segredo', async () => {
    const token = await createSessionToken(config, now)

    await expect(verifySessionToken('outro-segredo', token, now)).resolves.toBe(false)
  })

  it('rejeita conteúdo que não é um token', async () => {
    await expect(verificar('')).resolves.toBe(false)
    await expect(verificar('nao-e-token')).resolves.toBe(false)
  })

  it('não expõe o segredo de sessão no token', async () => {
    const token = await createSessionToken(config, now)

    expect(token).not.toContain(config.sessionSecret)
  })
})
