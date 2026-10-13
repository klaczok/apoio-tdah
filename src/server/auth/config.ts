import { parsePasswordHash, type PasswordHash } from './senha'
import type { ConfigSessao } from './session'

export type CredencialLegada = {
  userEmail: string
  passwordHash: PasswordHash
}

export const TTL_SESSAO_SEGUNDOS = 7 * 24 * 60 * 60

export function carregarConfigSessao(env: NodeJS.ProcessEnv): ConfigSessao {
  if (!env.SESSION_SECRET) {
    throw new Error('Configuração de sessão ausente')
  }
  return {
    segredoSessao: env.SESSION_SECRET,
    ttlSessaoSegundos: TTL_SESSAO_SEGUNDOS,
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
