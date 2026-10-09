export const SESSION_COOKIE_NAME = 'apoio_sessao'

export function isSecureRequest(request: Request): boolean {
  return (
    new URL(request.url).protocol === 'https:' ||
    request.headers.get('x-forwarded-proto') === 'https'
  )
}

type CookieOptions = {
  secure: boolean
  maxAgeSeconds: number
}

export function serializeSessionCookie(token: string, options: CookieOptions): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=lax',
    `Max-Age=${options.maxAgeSeconds}`,
  ]
  if (options.secure) parts.push('Secure')
  return parts.join('; ')
}

export function serializeClearedSessionCookie(options: { secure: boolean }): string {
  return serializeSessionCookie('', { ...options, maxAgeSeconds: 0 })
}
