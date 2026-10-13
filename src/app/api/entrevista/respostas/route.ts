import { requisicaoSegura } from '@/server/auth/cookies'
import { identidadeAutenticada } from '@/server/auth/contexto'
import {
  serializarCookieEntrevista,
  sessaoDaEntrevista,
  valorSessao,
} from '@/server/entrevista/sessao'
import { normalizarRespostas, PERGUNTAS_PADRAO } from '@/entrevista/etapas'
import { obterPerguntas } from '@/server/entrevista/material'

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

  // As respostas são validadas contra as perguntas que a IA formulou —
  // ou o banco de reserva, quando a entrevista seguiu sem a IA.
  const perguntas = obterPerguntas(identidade.usuarioId) ?? PERGUNTAS_PADRAO
  const respostas = normalizarRespostas((corpo as { respostas?: unknown })?.respostas, perguntas)
  const valor = await valorSessao(segredo, { ...sessao, respostas })
  const resposta = Response.json({ ok: true })
  resposta.headers.append(
    'Set-Cookie',
    serializarCookieEntrevista(valor, { seguro: requisicaoSegura(request) })
  )
  return resposta
}
