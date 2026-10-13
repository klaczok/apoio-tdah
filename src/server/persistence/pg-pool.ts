import { Pool } from 'pg'

const estadoGlobal = globalThis as { __estadoPool?: Pool }

// pg >= 8.16 avisa que os modos prefer/require/verify-ca virarão
// semântica libpq (mais fraca) na v9. Hoje eles já são tratados como
// verify-full — reescrevemos explicitamente para manter o comportamento
// atual e silenciar o aviso, qualquer que seja a URL entregue pelo
// provedor (Neon/Vercel env).
export function normalizarSslMode(connectionString: string): string {
  return connectionString.replace(/([?&]sslmode=)(prefer|require|verify-ca)\b/, '$1verify-full')
}

export function getPool(connectionString: string): Pool {
  estadoGlobal.__estadoPool ??= new Pool({
    connectionString: normalizarSslMode(connectionString),
  })
  return estadoGlobal.__estadoPool
}
