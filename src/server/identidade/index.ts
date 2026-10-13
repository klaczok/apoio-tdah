import { urlPostgresIntegracao } from '@/server/persistence'
import { MemoryUserStore } from './memory'
import { PostgresUserStore } from './postgres'
import { userStoreIndisponivel, type UserStore } from './usuarios'

const globalState = globalThis as { __userStore?: Promise<UserStore> }

export async function createUserStore(env: NodeJS.ProcessEnv): Promise<UserStore> {
  const driver = env.PERSISTENCE_DRIVER ?? 'postgres'
  if (driver === 'memory') return new MemoryUserStore()
  if (driver !== 'postgres') return userStoreIndisponivel()

  const url = env.POSTGRES_URL ?? urlPostgresIntegracao(env)
  if (!url) return userStoreIndisponivel()

  try {
    const { getPool } = await import('@/server/persistence/pg-pool')
    // Ambientes isolados no mesmo banco: preview usa outra tabela
    // (IDENTIDADE_TABLE), produção usa o padrão.
    return new PostgresUserStore(getPool(url), env.IDENTIDADE_TABLE)
  } catch {
    return userStoreIndisponivel()
  }
}

export function getUserStore(): Promise<UserStore> {
  globalState.__userStore ??= createUserStore(process.env)
  return globalState.__userStore
}
