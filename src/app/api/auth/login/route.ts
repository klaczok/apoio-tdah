import { NextResponse } from 'next/server'
import { loadAuthConfig, type AuthConfig } from '@/server/auth/config'
import { verifyCredentials } from '@/server/auth/credentials'
import { isSecureRequest, serializeSessionCookie } from '@/server/auth/cookies'
import { createSessionToken } from '@/server/auth/session'

export async function POST(request: Request) {
  let config: AuthConfig
  try {
    config = loadAuthConfig(process.env)
  } catch {
    return NextResponse.json({ erro: 'indisponivel' }, { status: 503 })
  }

  const form = await request.formData().catch(() => null)
  const email = String(form?.get('email') ?? '')
  const password = String(form?.get('password') ?? '')

  const valid = await verifyCredentials(config, email, password)
  const secure = isSecureRequest(request)

  if (!valid) {
    return new Response(null, {
      status: 303,
      headers: { location: '/login?erro=credencial' },
    })
  }

  const token = await createSessionToken(config, new Date())
  const response = new Response(null, { status: 303, headers: { location: '/hoje' } })
  response.headers.append(
    'Set-Cookie',
    serializeSessionCookie(token, { secure, maxAgeSeconds: config.sessionTtlSeconds })
  )
  return response
}
