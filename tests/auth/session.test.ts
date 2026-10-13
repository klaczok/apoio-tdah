/** @jest-environment node */

import { criarTokenSessao, verificarTokenSessao, ID_USUARIO_LEGADO } from '@/server/auth/session'

const config = {
  segredoSessao: 'segredo-de-teste-com-entropia-suficiente',
  ttlSessaoSegundos: 7 * 24 * 60 * 60,
}

const now = new Date('2026-10-09T12:00:00Z')
const verificar = (token: string, instante = now) =>
  verificarTokenSessao(config.segredoSessao, token, instante)

describe('sessão', () => {
  it('aceita um token recém-criado e retorna a identidade autenticada', async () => {
    const token = await criarTokenSessao(config, now, 'u-123')

    await expect(verificar(token)).resolves.toEqual({ usuarioId: 'u-123' })
  })

  it('a verificação devolve o ID do usuário persistido como sujeito', async () => {
    const token = await criarTokenSessao(config, now, 'f47ac10b-58cc-4372-a567-0e02b2c3d479')

    const identidade = await verificar(token)
    expect(identidade).toEqual({ usuarioId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  })

  it('o usuário legado continua com sujeito estável durante a transição', async () => {
    const token = await criarTokenSessao(config, now, ID_USUARIO_LEGADO)

    await expect(verificar(token)).resolves.toEqual({ usuarioId: 'usuario-unico' })
  })

  it('rejeita um token adulterado', async () => {
    const token = await criarTokenSessao(config, now, 'u-123')
    const tampered = token.slice(0, -4) + 'XXXX'

    await expect(verificar(tampered)).resolves.toBeNull()
  })

  it('rejeita um token após expirar', async () => {
    const token = await criarTokenSessao(config, now, 'u-123')
    const depoisDeExpirar = new Date(now.getTime() + (config.ttlSessaoSegundos + 1) * 1000)

    await expect(verificar(token, depoisDeExpirar)).resolves.toBeNull()
  })

  it('rejeita um token assinado com outro segredo', async () => {
    const token = await criarTokenSessao(config, now, 'u-123')

    await expect(verificarTokenSessao('outro-segredo', token, now)).resolves.toBeNull()
  })

  it('rejeita conteúdo que não é um token', async () => {
    await expect(verificar('')).resolves.toBeNull()
    await expect(verificar('nao-e-token')).resolves.toBeNull()
  })

  it('rejeita token com sujeito inválido', async () => {
    const tokenSemSujeito = await criarTokenSessao(config, now, '')

    await expect(verificar(tokenSemSujeito)).resolves.toBeNull()
  })

  it('não expõe o segredo de sessão no token', async () => {
    const token = await criarTokenSessao(config, now, 'u-123')

    expect(token).not.toContain(config.segredoSessao)
  })
})
