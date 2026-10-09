import { Pool } from 'pg'

const globalState = globalThis as { __estadoPool?: Pool }

export function getPool(connectionString: string): Pool {
  globalState.__estadoPool ??= new Pool({ connectionString })
  return globalState.__estadoPool
}
