import { NextResponse } from 'next/server'
import { loadSessionConfig } from '@/server/auth/config'
import { autenticar } from '@/server/auth/autenticar'
import { isSecureRequest, serializeSessionCookie } from '@/server/auth/cookies'
import { createSessionToken } from '@/server/auth/session'
import type { SessionConfig } from '@/server/auth/session'

export async function POST(request: Request) {
  let session: SessionConfig
  try {
    session = loadSessionConfig(process.env)
  } catch {
    return NextResponse.json({ erro: 'indisponivel' }, { status: 503 })
  }

  const form = await request.formData().catch(() => null)
  const email = String(form?.get('email') ?? '')
  const password = String(form?.get('password') ?? '')

  const usuarioId = await autenticar(email, password)
  const secure = isSecureRequest(request)

  if (!usuarioId) {
    return new Response(null, {
      status: 303,
      headers: { location: '/login?erro=credencial' },
    })
  }

  const token = await createSessionToken(session, new Date(), usuarioId)
  const response = new Response(null, { status: 303, headers: { location: '/hoje' } })
  response.headers.append(
    'Set-Cookie',
    serializeSessionCookie(token, { secure, maxAgeSeconds: session.sessionTtlSeconds })
  )
  return response
}
