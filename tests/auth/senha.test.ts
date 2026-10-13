/** @jest-environment node */

import {
  hashSenha,
  verificarSenha,
  parsePasswordHash,
  serializePasswordHash,
} from '@/server/auth/senha'

describe('hash de senha', () => {
  it('verifica a senha usada na derivação', async () => {
    const hash = await hashSenha('senha-segura-123')

    await expect(verificarSenha('senha-segura-123', hash)).resolves.toBe(true)
  })

  it('rejeita senha diferente', async () => {
    const hash = await hashSenha('senha-segura-123')

    await expect(verificarSenha('outra-senha', hash)).resolves.toBe(false)
  })

  it('usa salt individual por senha', async () => {
    const a = await hashSenha('mesma-senha')
    const b = await hashSenha('mesma-senha')

    expect(a.salt.equals(b.salt)).toBe(false)
    expect(a.key.equals(b.key)).toBe(false)
  })

  it('serializa e faz parse preservando a verificação', async () => {
    const hash = await hashSenha('senha-com-acentuação-çã')
    const serializado = serializePasswordHash(hash)

    expect(serializado.startsWith('scrypt:')).toBe(true)

    const lido = parsePasswordHash(serializado)
    await expect(verificarSenha('senha-com-acentuação-çã', lido)).resolves.toBe(true)
  })

  it('não contém a senha em texto simples na serialização', async () => {
    const hash = await hashSenha('segredo-inconfundivel-987')
    const serializado = serializePasswordHash(hash)

    expect(serializado).not.toContain('segredo-inconfundivel-987')
  })

  it('rejeita formato inválido e parâmetros degenerados', async () => {
    expect(() => parsePasswordHash('argon2:1:2:3:aa:bb')).toThrow()
    expect(() => parsePasswordHash('scrypt:0:8:1:0011223344556677:' + '00'.repeat(64))).toThrow()
    expect(() => parsePasswordHash('scrypt:16384:8:1:00:' + '00'.repeat(64))).toThrow()
    // scrypt exige N potência de dois
    expect(() => parsePasswordHash('scrypt:3:8:1:0011223344556677:' + '00'.repeat(64))).toThrow()
  })

  it('verificarSenha nunca lança com hash de parâmetros inválidos', async () => {
    const degenerado = {
      algorithm: 'scrypt' as const,
      N: 3,
      r: 8,
      p: 1,
      salt: Buffer.alloc(16),
      key: Buffer.alloc(64),
    }

    await expect(verificarSenha('qualquer', degenerado)).resolves.toBe(false)
  })
})
