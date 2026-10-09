import type { SessionConfig } from './session'

export type PasswordHash = {
  algorithm: 'scrypt'
  N: number
  r: number
  p: number
  salt: Buffer
  key: Buffer
}

export type AuthConfig = SessionConfig & {
  userEmail: string
  passwordHash: PasswordHash
}

export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60

export function parsePasswordHash(value: string): PasswordHash {
  const parts = value.split(':')
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    throw new Error('AUTH_PASSWORD_HASH em formato inválido')
  }
  const [, n, r, p, saltHex, keyHex] = parts
  const params = [n, r, p].map(Number)
  if (params.some((param) => !Number.isInteger(param) || param <= 0)) {
    throw new Error('AUTH_PASSWORD_HASH com parâmetros inválidos')
  }
  const salt = Buffer.from(saltHex, 'hex')
  const key = Buffer.from(keyHex, 'hex')
  if (salt.length < 8 || key.length !== 64) {
    throw new Error('AUTH_PASSWORD_HASH com salt ou hash inválidos')
  }
  return { algorithm: 'scrypt', N: params[0]!, r: params[1]!, p: params[2]!, salt, key }
}

export function loadAuthConfig(env: NodeJS.ProcessEnv): AuthConfig {
  const { AUTH_USER_EMAIL, AUTH_PASSWORD_HASH, SESSION_SECRET } = env
  if (!AUTH_USER_EMAIL || !AUTH_PASSWORD_HASH || !SESSION_SECRET) {
    throw new Error('Configuração de acesso ausente')
  }
  return {
    userEmail: AUTH_USER_EMAIL,
    passwordHash: parsePasswordHash(AUTH_PASSWORD_HASH),
    sessionSecret: SESSION_SECRET,
    sessionTtlSeconds: SESSION_TTL_SECONDS,
  }
}
