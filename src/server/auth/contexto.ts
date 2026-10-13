import { cookies } from 'next/headers'
import { getStateStore } from '@/server/persistence'
import type { StateStore } from '@/server/persistence/store'
import { SESSION_COOKIE_NAME } from './cookies'
import { verifySessionToken, type IdentidadeAutenticada } from './session'

// Única fonte de autoridade para o proprietário do estado: o cookie de
// sessão assinado. userId vindo do cliente (form, query, corpo) nunca é
// aceito — páginas e APIs resolvem a identidade antes de obter o store.
export async function identidadeAutenticada(): Promise<IdentidadeAutenticada | null> {
  const secret = process.env.SESSION_SECRET
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!secret || !token) return null
  return verifySessionToken(secret, token, new Date())
}

// Resolve a identidade e devolve o StateStore do proprietário. Sessão
// ausente ou inválida retorna null — nunca cai em usuário padrão.
export async function storeDoUsuario(): Promise<StateStore | null> {
  const identidade = await identidadeAutenticada()
  return identidade ? getStateStore(identidade.usuarioId) : null
}
