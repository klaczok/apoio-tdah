import { ID_USUARIO_LEGADO } from '@/server/auth/session'
import { MemoryStateStore } from './memory'
import { PostgresStateStore } from './postgres'
import { storeIndisponivel, type StateStore } from './store'

const globalState = globalThis as { __estadoStores?: Map<string, Promise<StateStore>> }

// Linha do registro único legado, usada pela conta de ambiente enquanto a
// migração para a tabela de usuários não acontece (ADR 0002, spec seção 8).
export const LINHA_ESTADO_LEGADO = 'usuario'

export function proprietarioDoEstado(usuarioId: string): string {
  return usuarioId === ID_USUARIO_LEGADO ? LINHA_ESTADO_LEGADO : usuarioId
}

export async function createStateStore(
  env: NodeJS.ProcessEnv,
  usuarioId: string
): Promise<StateStore> {
  const driver = env.PERSISTENCE_DRIVER ?? 'postgres'
  if (driver === 'memory') return new MemoryStateStore()
  if (driver !== 'postgres') return storeIndisponivel()

  const url = env.POSTGRES_URL ?? urlPostgresIntegracao(env)
  if (!url) return storeIndisponivel()

  try {
    const { getPool } = await import('./pg-pool')
    // Ambientes isolados no mesmo banco: preview usa outra tabela
    // (PERSISTENCE_TABLE), produção usa o padrão.
    return new PostgresStateStore(
      getPool(url),
      proprietarioDoEstado(usuarioId),
      env.PERSISTENCE_TABLE
    )
  } catch {
    return storeIndisponivel()
  }
}

// Integrações de Postgres na Vercel podem prefixar as variáveis (ex.: `<banco>_POSTGRES_URL`).
export function urlPostgresIntegracao(env: NodeJS.ProcessEnv): string | undefined {
  const chave = Object.keys(env).find((k) => k.endsWith('_POSTGRES_URL') && env[k])
  return chave ? env[chave] : undefined
}

export function getStateStore(usuarioId: string): Promise<StateStore> {
  // A chave do cache é o proprietário (linha), não o sub da sessão — assim
  // 'usuario-unico' e 'usuario' compartilham o mesmo store em qualquer
  // driver, espelhando a linha única do Postgres durante a transição.
  const proprietario = proprietarioDoEstado(usuarioId)
  const cache = (globalState.__estadoStores ??= new Map())
  let store = cache.get(proprietario)
  if (!store) {
    store = createStateStore(process.env, proprietario)
    cache.set(proprietario, store)
  }
  return store
}
