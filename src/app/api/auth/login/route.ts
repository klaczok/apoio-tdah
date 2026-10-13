import { NextResponse } from 'next/server'
import { carregarConfigSessao } from '@/server/auth/config'
import { autenticar } from '@/server/auth/autenticar'
import { requisicaoSegura, serializarCookieSessao } from '@/server/auth/cookies'
import { criarTokenSessao } from '@/server/auth/session'
import type { ConfigSessao } from '@/server/auth/session'

export async function POST(request: Request) {
  let session: ConfigSessao
  try {
    session = carregarConfigSessao(process.env)
  } catch {
    return NextResponse.json({ erro: 'indisponivel' }, { status: 503 })
  }

  const form = await request.formData().catch(() => null)
  const email = String(form?.get('email') ?? '')
  const password = String(form?.get('password') ?? '')

  const usuarioId = await autenticar(email, password)
  const seguro = requisicaoSegura(request)

  if (!usuarioId) {
    return new Response(null, {
      status: 303,
      headers: { location: '/login?erro=credencial' },
    })
  }

  const token = await criarTokenSessao(session, new Date(), usuarioId)
  const response = new Response(null, { status: 303, headers: { location: '/hoje' } })
  response.headers.append(
    'Set-Cookie',
    serializarCookieSessao(token, { seguro, maxAgeSegundos: session.ttlSessaoSegundos })
  )
  return response
}
