import { createSessionToken, ID_USUARIO_LEGADO } from '@/server/auth/session'

export const USUARIO_TESTE = 'usuario-teste'
const SEGREDO_PADRAO = 'segredo-de-teste-com-entropia-suficiente'

const globalState = globalThis as { __sessaoTeste?: string }

// Emite uma sessão assinada para o usuário e a registra no mock de
// next/headers, como se o navegador enviasse o cookie após o login.
export async function autenticarComo(usuarioId: string = USUARIO_TESTE): Promise<void> {
  const secret = process.env.SESSION_SECRET ?? SEGREDO_PADRAO
  globalState.__sessaoTeste = await createSessionToken(
    { sessionSecret: secret, sessionTtlSeconds: 7 * 24 * 60 * 60 },
    new Date(),
    usuarioId
  )
}

// Simula o usuário de ambiente da transição (sub 'usuario-unico').
export async function autenticarComoLegado(): Promise<void> {
  return autenticarComo(ID_USUARIO_LEGADO)
}

export function limparSessao(): void {
  delete globalState.__sessaoTeste
}
