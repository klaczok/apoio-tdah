export type SessionConfig = {
  sessionSecret: string
  sessionTtlSeconds: number
}

type SessionPayload = {
  sub: string
  iat: number
  exp: number
}

const SESSION_SUBJECT = 'usuario-unico'
const encoder = new TextEncoder()

function base64UrlEncode(data: Uint8Array): string {
  let binary = ''
  for (const byte of data) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function base64UrlDecode(value: string): Uint8Array | null {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  try {
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function createSessionToken(config: SessionConfig, now: Date): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000)
  const payload: SessionPayload = {
    sub: SESSION_SUBJECT,
    iat,
    exp: iat + config.sessionTtlSeconds,
  }
  const payloadEncoded = base64UrlEncode(encoder.encode(JSON.stringify(payload)))
  const key = await hmacKey(config.sessionSecret)
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadEncoded))
  return `${payloadEncoded}.${base64UrlEncode(new Uint8Array(signature))}`
}

export async function verifySessionToken(
  sessionSecret: string,
  token: string,
  now: Date
): Promise<boolean> {
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payloadEncoded, signatureEncoded] = parts

  const signature = base64UrlDecode(signatureEncoded)
  if (!signature) return false

  const key = await hmacKey(sessionSecret)
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    signature.buffer as ArrayBuffer,
    encoder.encode(payloadEncoded)
  )
  if (!valid) return false

  const payloadBytes = base64UrlDecode(payloadEncoded)
  if (!payloadBytes) return false

  let payload: SessionPayload
  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes))
  } catch {
    return false
  }

  if (payload.sub !== SESSION_SUBJECT) return false
  if (typeof payload.exp !== 'number') return false

  return payload.exp > Math.floor(now.getTime() / 1000)
}
