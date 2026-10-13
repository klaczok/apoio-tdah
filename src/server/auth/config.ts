import { parsePasswordHash, type PasswordHash } from './senha'
import type { SessionConfig } from './session'

export type CredencialLegada = {
  userEmail: string
  passwordHash: PasswordHash
}

export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60

export function loadSessionConfig(env: NodeJS.ProcessEnv): SessionConfig {
  if (!env.SESSION_SECRET) {
    throw new Error('Configuração de sessão ausente')
  }
  return {
    sessionSecret: env.SESSION_SECRET,
    sessionTtlSeconds: SESSION_TTL_SECONDS,
  }
}

export function loadCredencialLegada(env: NodeJS.ProcessEnv): CredencialLegada | null {
  const { AUTH_USER_EMAIL, AUTH_PASSWORD_HASH } = env
  if (!AUTH_USER_EMAIL || !AUTH_PASSWORD_HASH) return null
  return {
    userEmail: AUTH_USER_EMAIL,
    passwordHash: parsePasswordHash(AUTH_PASSWORD_HASH),
  }
}
