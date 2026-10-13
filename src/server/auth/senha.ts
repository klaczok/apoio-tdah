import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'

export type PasswordHash = {
  algorithm: 'scrypt'
  N: number
  r: number
  p: number
  salt: Buffer
  key: Buffer
}

export const PARAMETROS_SCRYPT = { N: 16384, r: 8, p: 1 } as const
const KEY_LENGTH = 64

function derivarChave(
  senha: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(senha, salt, keylen, options, (error, key) => (error ? reject(error) : resolve(key)))
  })
}

export async function hashSenha(senha: string): Promise<PasswordHash> {
  const salt = randomBytes(16)
  const key = await derivarChave(senha, salt, KEY_LENGTH, PARAMETROS_SCRYPT)
  return { algorithm: 'scrypt', ...PARAMETROS_SCRYPT, salt, key }
}

export function passwordHashValido(hash: PasswordHash): boolean {
  return (
    hash.algorithm === 'scrypt' &&
    Number.isInteger(hash.N) &&
    hash.N > 1 &&
    (hash.N & (hash.N - 1)) === 0 &&
    Number.isInteger(hash.r) &&
    hash.r > 0 &&
    Number.isInteger(hash.p) &&
    hash.p > 0 &&
    hash.salt.length >= 8 &&
    hash.key.length === KEY_LENGTH
  )
}

export async function verificarSenha(senha: string, hash: PasswordHash): Promise<boolean> {
  if (!passwordHashValido(hash)) return false
  try {
    const derivada = await derivarChave(senha, hash.salt, KEY_LENGTH, {
      N: hash.N,
      r: hash.r,
      p: hash.p,
    })
    return timingSafeEqual(derivada, hash.key)
  } catch {
    return false
  }
}

export function parsePasswordHash(value: string): PasswordHash {
  const parts = value.split(':')
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    throw new Error('hash de senha em formato inválido')
  }
  const [, n, r, p, saltHex, keyHex] = parts
  const params = [n, r, p].map(Number)
  const salt = Buffer.from(saltHex, 'hex')
  const key = Buffer.from(keyHex, 'hex')
  const hash: PasswordHash = {
    algorithm: 'scrypt',
    N: params[0]!,
    r: params[1]!,
    p: params[2]!,
    salt,
    key,
  }
  if (!passwordHashValido(hash)) {
    throw new Error('hash de senha com parâmetros, salt ou hash inválidos')
  }
  return hash
}

export function serializePasswordHash(hash: PasswordHash): string {
  return `scrypt:${hash.N}:${hash.r}:${hash.p}:${hash.salt.toString('hex')}:${hash.key.toString('hex')}`
}
