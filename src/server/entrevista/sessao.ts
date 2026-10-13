import { cookies } from 'next/headers'
import { ENTREVISTA_COOKIE } from './cookie'

export { ENTREVISTA_COOKIE }

// Sessão efêmera da entrevista: o consentimento vive apenas em cookie
// httpOnly de sessão do navegador — sem Max-Age, some ao fechar a aba.
// Nada da entrevista entra no EstadoPrivado nem no StateStore (spec v3:
// material transitório). O valor é assinado com o segredo de sessão
// para que o cliente não possa forjar o portão.

const encoder = new TextEncoder()

async function assinar(segredo: string, valor: string): Promise<string> {
  const chave = await crypto.subtle.importKey(
    'raw',
    encoder.encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const assinatura = await crypto.subtle.sign('HMAC', chave, encoder.encode(valor))
  let binario = ''
  for (const byte of new Uint8Array(assinatura)) binario += String.fromCharCode(byte)
  return btoa(binario).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

export async function valorConsentimento(segredo: string): Promise<string> {
  return `geral.${await assinar(segredo, 'entrevista:consentimento-geral')}`
}

export async function consentimentoValido(segredo: string, valor: string): Promise<boolean> {
  return valor === (await valorConsentimento(segredo))
}

export function serializeConsentCookie(valor: string, options: { secure: boolean }): string {
  const parts = [`${ENTREVISTA_COOKIE}=${valor}`, 'Path=/entrevista', 'HttpOnly', 'SameSite=lax']
  if (options.secure) parts.push('Secure')
  return parts.join('; ')
}

// Lê o cookie no contexto de rota/página do servidor. Sem segredo ou
// sem assinatura válida, a entrevista volta ao passo de consentimento.
export async function consentimentoConcedido(): Promise<boolean> {
  const segredo = process.env.SESSION_SECRET
  const valor = (await cookies()).get(ENTREVISTA_COOKIE)?.value
  if (!segredo || !valor) return false
  return consentimentoValido(segredo, valor)
}
