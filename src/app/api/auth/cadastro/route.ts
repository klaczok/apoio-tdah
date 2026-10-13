import { NextResponse } from 'next/server'
import { cadastrarUsuario } from '@/server/auth/cadastro'
import { loadSessionConfig } from '@/server/auth/config'
import { isSecureRequest, serializeSessionCookie } from '@/server/auth/cookies'
import { createSessionToken, type SessionConfig } from '@/server/auth/session'
import { normalizarEmail } from '@/server/identidade/usuarios'

// A falha redireciona ao cadastro com código estável e o e-mail
// preservado (dado não sensível); a senha nunca entra na URL.
export async function POST(request: Request) {
  let session: SessionConfig
  try {
    session = loadSessionConfig(process.env)
  } catch {
    return NextResponse.json({ erro: 'indisponivel' }, { status: 503 })
  }

  // Gate operacional: cadastros podem permanecer fechados até a
  // verificação da migração da conta legada (docs/operacao/migracao-legado).
  if (process.env.CADASTRO_FECHADO === '1') {
    return new Response(null, {
      status: 303,
      headers: { location: '/cadastro?erro=indisponivel' },
    })
  }

  const form = await request.formData().catch(() => null)
  const email = String(form?.get('email') ?? '')
  const senha = String(form?.get('senha') ?? '')
  const confirmacao = String(form?.get('confirmacao') ?? '')

  const resultado = await cadastrarUsuario(email, senha, confirmacao)
  if (!resultado.ok) {
    const params = new URLSearchParams({ erro: resultado.erro })
    const normalizado = normalizarEmail(email)
    if (normalizado) params.set('email', normalizado)
    return new Response(null, {
      status: 303,
      headers: { location: `/cadastro?${params.toString()}` },
    })
  }

  const token = await createSessionToken(session, new Date(), resultado.usuarioId)
  const response = new Response(null, { status: 303, headers: { location: '/hoje' } })
  response.headers.append(
    'Set-Cookie',
    serializeSessionCookie(token, {
      secure: isSecureRequest(request),
      maxAgeSeconds: session.sessionTtlSeconds,
    })
  )
  return response
}
