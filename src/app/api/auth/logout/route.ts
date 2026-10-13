import { requisicaoSegura, serializarCookieSessaoLimpo } from '@/server/auth/cookies'

export async function POST(request: Request) {
  const seguro = requisicaoSegura(request)
  const response = new Response(null, { status: 303, headers: { location: '/' } })
  response.headers.append('Set-Cookie', serializarCookieSessaoLimpo({ seguro }))
  return response
}
