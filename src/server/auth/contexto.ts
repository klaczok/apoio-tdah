import { cookies } from 'next/headers'
import { getStateStore } from '@/server/persistence'
import { getUserStore } from '@/server/identidade'
import type { StateStore } from '@/server/persistence/store'
import { SESSION_COOKIE_NAME } from './cookies'
import { ID_USUARIO_LEGADO, verifySessionToken, type IdentidadeAutenticada } from './session'

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

export type ContaAutenticada = {
  usuarioId: string
  email: string | null
}

// Identidade exibida no shell: o e-mail vem do usuário persistido e, na
// conta legada da transição, da variável de ambiente de credencial.
// e-mail pode ser null (legado sem AUTH_USER_EMAIL) — nesse caso o
// shell exibe um rótulo genérico em vez de redirecionar uma sessão
// válida para o login.
export async function contaAutenticada(): Promise<ContaAutenticada | null> {
  const identidade = await identidadeAutenticada()
  if (!identidade) return null
  if (identidade.usuarioId === ID_USUARIO_LEGADO) {
    return { usuarioId: identidade.usuarioId, email: process.env.AUTH_USER_EMAIL ?? null }
  }
  const usuarios = await getUserStore()
  const encontrado = await usuarios.buscarPorId(identidade.usuarioId)
  return encontrado.ok && encontrado.value
    ? { usuarioId: identidade.usuarioId, email: encontrado.value.email }
    : null
}
