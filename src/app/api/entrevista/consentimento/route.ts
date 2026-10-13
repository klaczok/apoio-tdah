import { requisicaoSegura } from '@/server/auth/cookies'
import { identidadeAutenticada } from '@/server/auth/contexto'
import { serializarCookieEntrevista, valorConsentimento } from '@/server/entrevista/sessao'

// Registra o consentimento geral na sessão efêmera da entrevista. Nada
// é gravado no EstadoPrivado: apenas um cookie httpOnly assinado, sem
// Max-Age, que expira com a sessão do navegador.
export async function POST(request: Request) {
  const identidade = await identidadeAutenticada()
  if (!identidade) {
    return new Response(null, { status: 303, headers: { location: '/login' } })
  }
  const segredo = process.env.SESSION_SECRET
  if (!segredo) {
    return new Response(null, { status: 503 })
  }

  const valor = await valorConsentimento(segredo)
  const response = new Response(null, {
    status: 303,
    headers: { location: '/entrevista/etapas' },
  })
  response.headers.append(
    'Set-Cookie',
    serializarCookieEntrevista(valor, { seguro: requisicaoSegura(request) })
  )
  return response
}
