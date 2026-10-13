export type ConfigSessao = {
  segredoSessao: string
  ttlSessaoSegundos: number
}

type PayloadSessao = {
  sub: string
  iat: number
  exp: number
}

export type IdentidadeAutenticada = {
  usuarioId: string
}

// Sujeito estável da conta de ambiente, mantido durante a transição
// para contas persistidas (ver docs/adr/0002).
export const ID_USUARIO_LEGADO = 'usuario-unico'

const codificador = new TextEncoder()

function base64UrlCodificar(data: Uint8Array): string {
  let binario = ''
  for (const byte of data) binario += String.fromCharCode(byte)
  return btoa(binario).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function base64UrlDecodificar(value: string): Uint8Array | null {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  try {
    const binario = atob(padded)
    const bytes = new Uint8Array(binario.length)
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

async function chaveHmac(segredo: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    codificador.encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function criarTokenSessao(
  config: ConfigSessao,
  now: Date,
  usuarioId: string
): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000)
  const payload: PayloadSessao = {
    sub: usuarioId,
    iat,
    exp: iat + config.ttlSessaoSegundos,
  }
  const payloadCodificado = base64UrlCodificar(codificador.encode(JSON.stringify(payload)))
  const key = await chaveHmac(config.segredoSessao)
  const assinatura = await crypto.subtle.sign('HMAC', key, codificador.encode(payloadCodificado))
  return `${payloadCodificado}.${base64UrlCodificar(new Uint8Array(assinatura))}`
}

export async function verificarTokenSessao(
  segredoSessao: string,
  token: string,
  now: Date
): Promise<IdentidadeAutenticada | null> {
  const partes = token.split('.')
  if (partes.length !== 2) return null
  const [payloadCodificado, assinaturaCodificada] = partes

  const assinatura = base64UrlDecodificar(assinaturaCodificada)
  if (!assinatura) return null

  const key = await chaveHmac(segredoSessao)
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    assinatura.buffer as ArrayBuffer,
    codificador.encode(payloadCodificado)
  )
  if (!valid) return null

  const bytesPayload = base64UrlDecodificar(payloadCodificado)
  if (!bytesPayload) return null

  let payload: PayloadSessao
  try {
    payload = JSON.parse(new TextDecoder().decode(bytesPayload))
  } catch {
    return null
  }

  if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null
  if (typeof payload.exp !== 'number') return null
  if (payload.exp <= Math.floor(now.getTime() / 1000)) return null

  return { usuarioId: payload.sub }
}
