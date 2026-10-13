import { requisicaoSegura } from '@/server/auth/cookies'
import { identidadeAutenticada } from '@/server/auth/contexto'
import {
  serializarCookieEntrevista,
  sessaoDaEntrevista,
  valorSessao,
} from '@/server/entrevista/sessao'
import { guardarHistorico, obterHistorico } from '@/server/entrevista/material'
import { getEntrevistador } from '@/server/ia'
import { getStateStore } from '@/server/persistence'
import { descreverPerfil } from '@/server/perfil/modelo'
import {
  LIMITE_MENSAGENS_PESSOA,
  MARCA_ENTREVISTA_CONCLUIDA,
  normalizarMensagem,
  type MensagemConversa,
} from '@/entrevista/conversa'

// A entrevista é uma conversa conduzida pela IA (perfil de organizadora de rotina
// em primeira consulta de rotina): conhece a pessoa primeiro e faz
// quantas perguntas precisar — sem número fixo — até ter material para
// montar o calendário. A transcrição fica em material transitório por
// usuário; quando a IA sinaliza o fim, a sessão efêmera ganha só a
// marca de conclusão que libera as próximas páginas.

export async function GET() {
  const identidade = await identidadeAutenticada()
  if (!identidade) return Response.json({ erro: 'sessao' }, { status: 401 })
  const sessao = await sessaoDaEntrevista()
  if (!sessao) return Response.json({ erro: 'consentimento' }, { status: 403 })

  const historico = obterHistorico(identidade.usuarioId)
  return Response.json({
    mensagens: historico?.mensagens ?? [],
    concluiu: historico?.pronta ?? false,
  })
}

export async function POST(request: Request) {
  const identidade = await identidadeAutenticada()
  if (!identidade) return Response.json({ erro: 'sessao' }, { status: 401 })
  const sessao = await sessaoDaEntrevista()
  if (!sessao) return Response.json({ erro: 'consentimento' }, { status: 403 })

  let corpo: unknown = null
  try {
    corpo = await request.json()
  } catch {
    return Response.json({ erro: 'entrada' }, { status: 400 })
  }

  const historico = obterHistorico(identidade.usuarioId) ?? { mensagens: [], pronta: false }
  if (historico.pronta) {
    // Conversa já encerrada: não consome nova rodada de IA.
    return Response.json({ mensagem: null, concluiu: true })
  }

  const mensagemPessoa = normalizarMensagem((corpo as { mensagem?: unknown })?.mensagem)
  if (historico.mensagens.length > 0 && !mensagemPessoa) {
    // Depois da abertura, cada rodada precisa da fala da pessoa.
    return Response.json({ erro: 'mensagem' }, { status: 400 })
  }

  const mensagens: MensagemConversa[] = mensagemPessoa
    ? [...historico.mensagens, { papel: 'pessoa', texto: mensagemPessoa }]
    : historico.mensagens

  // O perfil de onboarding vira contexto da conversa: a IA recebe o
  // que a pessoa já respondeu no cadastro e não repete essas perguntas.
  // Falha de leitura não bloqueia a rodada — segue sem contexto.
  let contextoPerfil: string | null = null
  try {
    const lido = await (await getStateStore(identidade.usuarioId)).load()
    if (lido.ok) contextoPerfil = descreverPerfil(lido.value.dados.perfil)
  } catch {
    contextoPerfil = null
  }

  const resultado = await getEntrevistador().conversar(mensagens, contextoPerfil)
  if (!resultado.ok) {
    console.warn('[entrevista] rodada da conversa falhou:', resultado.motivo)
    return Response.json({ erro: 'indisponivel' }, { status: 503 })
  }

  // Teto de segurança: a conversa encerra mesmo sem o sinal da IA.
  const falasPessoa = mensagens.filter((m) => m.papel === 'pessoa').length
  const concluiu = resultado.concluiu || falasPessoa >= LIMITE_MENSAGENS_PESSOA

  const novoHistorico = {
    mensagens: [...mensagens, { papel: 'ia' as const, texto: resultado.mensagem }],
    pronta: concluiu,
  }
  guardarHistorico(identidade.usuarioId, novoHistorico)

  const resposta = Response.json({ mensagem: resultado.mensagem, concluiu })
  if (concluiu) {
    // A sessão efêmera ganha só a marca de conclusão — a transcrição
    // completa fica no material transitório do servidor.
    const segredo = process.env.SESSION_SECRET
    if (segredo) {
      const valor = await valorSessao(segredo, { ...sessao, respostas: MARCA_ENTREVISTA_CONCLUIDA })
      resposta.headers.append(
        'Set-Cookie',
        serializarCookieEntrevista(valor, { seguro: requisicaoSegura(request) })
      )
    }
  }
  return resposta
}
