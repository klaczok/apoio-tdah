import { MemoryStateStore } from './memory'
import { PostgresStateStore } from './postgres'
import { storeIndisponivel, type StateStore } from './store'

const globalState = globalThis as { __estadoStore?: Promise<StateStore> }

export async function createStateStore(env: NodeJS.ProcessEnv): Promise<StateStore> {
  const driver = env.PERSISTENCE_DRIVER ?? 'postgres'
  if (driver === 'memory') return new MemoryStateStore()
  if (driver !== 'postgres') return storeIndisponivel()

  const url = env.POSTGRES_URL
  if (!url) return storeIndisponivel()

  try {
    const { getPool } = await import('./pg-pool')
    return new PostgresStateStore(getPool(url))
  } catch {
    return storeIndisponivel()
  }
}

export function getStateStore(): Promise<StateStore> {
  globalState.__estadoStore ??= createStateStore(process.env)
  return globalState.__estadoStore
}
