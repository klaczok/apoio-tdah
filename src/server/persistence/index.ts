import { MemoryStateStore } from './memory'
import { PostgresStateStore } from './postgres'
import { storeIndisponivel, type StateStore } from './store'

const globalState = globalThis as { __estadoStore?: Promise<StateStore> }

export async function createStateStore(env: NodeJS.ProcessEnv): Promise<StateStore> {
  const driver = env.PERSISTENCE_DRIVER ?? 'postgres'
  if (driver === 'memory') return new MemoryStateStore()
  if (driver !== 'postgres') return storeIndisponivel()

  const url = env.POSTGRES_URL ?? urlPostgresIntegracao(env)
  if (!url) return storeIndisponivel()

  try {
    const { getPool } = await import('./pg-pool')
    // Ambientes isolados no mesmo banco: preview usa outra tabela
    // (PERSISTENCE_TABLE), produção usa o padrão.
    return new PostgresStateStore(getPool(url), env.PERSISTENCE_TABLE)
  } catch {
    return storeIndisponivel()
  }
}

// Integrações de Postgres na Vercel podem prefixar as variáveis (ex.: `<banco>_POSTGRES_URL`).
function urlPostgresIntegracao(env: NodeJS.ProcessEnv): string | undefined {
  const chave = Object.keys(env).find((k) => k.endsWith('_POSTGRES_URL') && env[k])
  return chave ? env[chave] : undefined
}

export function getStateStore(): Promise<StateStore> {
  globalState.__estadoStore ??= createStateStore(process.env)
  return globalState.__estadoStore
}
