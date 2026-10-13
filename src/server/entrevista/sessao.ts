import { cookies } from 'next/headers'
import { ENTREVISTA_COOKIE } from './cookie'
import type { RespostasEntrevista } from './etapas'

export { ENTREVISTA_COOKIE }

// Sessão efêmera da entrevista: consentimento e respostas vivem apenas
// em cookie httpOnly de sessão do navegador — sem Max-Age, some ao
// fechar a aba. Nada da entrevista entra no EstadoPrivado nem no
// StateStore (spec v3: material transitório). O valor é assinado com o
// segredo de sessão para que o cliente não possa forjar o portão.
export type SessaoEntrevista = {
  consentimento: 'geral'
  respostas?: RespostasEntrevista
}

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

function base64UrlJson(valor: unknown): string {
  return btoa(JSON.stringify(valor)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

export async function valorSessao(segredo: string, sessao: SessaoEntrevista): Promise<string> {
  const payload = base64UrlJson(sessao)
  return `v1.${payload}.${await assinar(segredo, payload)}`
}

export async function lerSessao(segredo: string, valor: string): Promise<SessaoEntrevista | null> {
  const partes = valor.split('.')
  // O payload base64url não contém '.', então são sempre 3 partes.
  if (partes.length !== 3 || partes[0] !== 'v1') return null
  if (partes[2] !== (await assinar(segredo, partes[1]!))) return null
  try {
    const json = atob(partes[1]!.replaceAll('-', '+').replaceAll('_', '/'))
    const sessao = JSON.parse(json) as SessaoEntrevista
    return sessao?.consentimento === 'geral' ? sessao : null
  } catch {
    return null
  }
}

export async function valorConsentimento(segredo: string): Promise<string> {
  return valorSessao(segredo, { consentimento: 'geral' })
}

export async function consentimentoValido(segredo: string, valor: string): Promise<boolean> {
  return (await lerSessao(segredo, valor)) !== null
}

export function serializeConsentCookie(valor: string, options: { secure: boolean }): string {
  const parts = [`${ENTREVISTA_COOKIE}=${valor}`, 'Path=/', 'HttpOnly', 'SameSite=lax']
  if (options.secure) parts.push('Secure')
  return parts.join('; ')
}

// Lê a sessão de entrevista no contexto de rota/página do servidor.
// Sem segredo ou sem assinatura válida, volta ao passo de consentimento.
export async function sessaoDaEntrevista(): Promise<SessaoEntrevista | null> {
  const segredo = process.env.SESSION_SECRET
  const valor = (await cookies()).get(ENTREVISTA_COOKIE)?.value
  if (!segredo || !valor) return null
  return lerSessao(segredo, valor)
}

export async function consentimentoConcedido(): Promise<boolean> {
  return (await sessaoDaEntrevista()) !== null
}
