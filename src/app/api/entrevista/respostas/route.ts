import { isSecureRequest } from '@/server/auth/cookies'
import { identidadeAutenticada } from '@/server/auth/contexto'
import { serializeConsentCookie, sessaoDaEntrevista, valorSessao } from '@/server/entrevista/sessao'
import { normalizarRespostas } from '@/server/entrevista/etapas'

// Recebe as respostas das cinco etapas no fim da entrevista e as guarda
// na sessão efêmera (cookie assinado, sem Max-Age). Nada é gravado no
// EstadoPrivado — sair, recarregar ou fechar descarta tudo.
export async function POST(request: Request) {
  const identidade = await identidadeAutenticada()
  if (!identidade) {
    return Response.json({ erro: 'sessao' }, { status: 401 })
  }
  const sessao = await sessaoDaEntrevista()
  const segredo = process.env.SESSION_SECRET
  if (!sessao || !segredo) {
    // Sem consentimento prévio, nenhuma resposta pode ser registrada.
    return Response.json({ erro: 'consentimento' }, { status: 403 })
  }

  let corpo: unknown = null
  try {
    corpo = await request.json()
  } catch {
    return Response.json({ erro: 'entrada' }, { status: 400 })
  }

  const respostas = normalizarRespostas((corpo as { respostas?: unknown })?.respostas)
  const valor = await valorSessao(segredo, { ...sessao, respostas })
  const resposta = Response.json({ ok: true })
  resposta.headers.append(
    'Set-Cookie',
    serializeConsentCookie(valor, { secure: isSecureRequest(request) })
  )
  return resposta
}
