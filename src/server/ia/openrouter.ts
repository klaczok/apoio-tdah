import type { EntradaInterpretacao, InterpretadorIA, ResultadoInterpretacao } from './interpretador'
import type { EntrevistadorIA, MensagemConversa, ResultadoConversa } from './entrevistador'

// Adaptador do OpenRouter — API compatível com OpenAI
// (chat/completions), usado exclusivamente no servidor. A chave sai de
// OPENROUTER_API_KEY e nunca é exposta ao navegador, ao EstadoPrivado
// ou a logs; a resposta bruta também não é persistida. O modelo é
// configurável via OPENROUTER_MODEL — `openrouter/free` roteia para
// qualquer modelo gratuito disponível, o que evita a saturação de um
// único nome de modelo.
const MODELO_PADRAO = 'openrouter/free'
const TIMEOUT_MS = 20_000
const SINAL_PRONTO = '[[PRONTO]]'

const PROMPT_ENTREVISTA = [
  'Você é uma organizadora de rotina conduzindo a primeira conversa com uma pessoa para entender a vida dela e montar um calendário semanal realista.',
  'Conduza a conversa em português brasileiro, com acolhimento e uma pergunta por vez — você não é médica nem dá diagnóstico, só organiza rotinas.',
  'Comece se apresentando em uma frase e fazendo a primeira pergunta, buscando conhecer a pessoa antes de detalhar horários.',
  'Se a pessoa já respondeu perguntas no cadastro, esse contexto chega em mensagem própria: trate-o como fato conhecido, confirme-o de passagem se fizer sentido e NUNCA refaça perguntas já respondidas — vá direto ao que falta para o calendário.',
  'Ao longo da conversa, cubra o que ainda faltar de: compromissos fixos com dias e horários; sono, refeições e autocuidado; responsabilidades que pesam e o que dificulta organizar o dia; em que período a energia está mais alta.',
  'Faça perguntas de aprofundamento quando a resposta estiver vaga — não há número fixo de perguntas, mas também não prolongue além do necessário.',
  'Quando tiver informação suficiente para montar um calendário semanal coerente com a vida da pessoa, escreva uma breve mensagem de encerramento agradecendo e finalize a última linha apenas com o marcador [[PRONTO]].',
  'Responda apenas com a próxima mensagem sua, em texto corrido — sem prefixos, sem JSON.',
].join('\n')

const PROMPT_INTERPRETACAO = [
  'Você transforma a transcrição de uma entrevista de rotina em um calendário semanal estruturado.',
  'Responda APENAS com JSON válido — sem texto antes ou depois, sem cercas de código — neste formato (omita o que não souber):',
  '{"sono":{"dormir":"HH:MM","acordar":"HH:MM"},',
  '"trabalho":{"diasSemana":["seg"],"horasPadrao":8,"limiteExcepcional":10},',
  '"compromissos":[{"titulo":"nome da tarefa","diaSemana":"seg|ter|qua|qui|sex|sab|dom","inicio":"HH:MM","fim":"HH:MM","categoria":"trabalho|familia|saude|alimentacao|estudo|musica|descanso|pessoal","tipo":"fixo|flexivel"}],',
  '"periodos":[{"tipo":"cuidado-familiar|indisponibilidade","diaSemana":"seg","inicio":"HH:MM","fim":"HH:MM"}],',
  '"preferenciaCarga":"leve|equilibrada|intensa"}',
  'Cada compromisso precisa de dia da semana, horário de início e fim e o nome da tarefa — é com eles que o calendário do cliente será montado.',
  'Não invente horários, durações ou compromissos que a pessoa não mencionou.',
].join('\n')

type MensagemChat = { role: 'system' | 'user' | 'assistant'; content: string }

type Chamada =
  { ok: true; texto: string } | { ok: false; motivo: 'indisponivel' | 'invalida' | 'vazia' }

function modelo(): string {
  return process.env.OPENROUTER_MODEL ?? MODELO_PADRAO
}

// Chamada única ao chat/completions. Logs registram apenas status e
// motivo — nunca a chave, o prompt ou o conteúdo da conversa. Em 429/503
// (rate limit ou demanda) retenta com backoff curto. `jsonMode` pede
// response_format estruturado; se o modelo não suportar (400), refaz
// sem o parâmetro — a limpeza de JSON no parse cobre a diferença.
async function chamar(
  apiKey: string | undefined,
  mensagens: MensagemChat[],
  jsonMode = false
): Promise<Chamada> {
  if (!apiKey) {
    console.warn('[ia/openrouter] OPENROUTER_API_KEY ausente — entrevista por IA indisponível')
    return { ok: false, motivo: 'indisponivel' }
  }

  const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const tentar = async (comJson: boolean) => {
    try {
      return await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelo(),
          messages: mensagens,
          ...(comJson ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch (erro) {
      console.warn(
        '[ia/openrouter] requisição falhou:',
        erro instanceof Error ? erro.message : String(erro)
      )
      return null
    }
  }

  let resposta: Response | null = null
  for (const espera of [0, 1200, 3000]) {
    if (espera > 0) await esperar(espera)
    resposta = await tentar(jsonMode)
    if (resposta?.status === 400 && jsonMode) {
      console.warn('[ia/openrouter] modelo sem response_format — retentando sem json_mode')
      resposta = await tentar(false)
    }
    if (!resposta || (resposta.status !== 429 && resposta.status !== 503)) break
    console.warn('[ia/openrouter] HTTP', resposta.status, '— retentando')
  }

  if (!resposta) return { ok: false, motivo: 'indisponivel' }
  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => '')
    console.warn('[ia/openrouter] HTTP', resposta.status, corpo.slice(0, 300))
    return { ok: false, motivo: 'indisponivel' }
  }

  let texto = ''
  try {
    const corpoJson = (await resposta.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    texto = corpoJson.choices?.[0]?.message?.content ?? ''
  } catch {
    return { ok: false, motivo: 'invalida' }
  }
  if (!texto) return { ok: false, motivo: 'vazia' }
  return { ok: true, texto }
}

function paraChat(historico: MensagemConversa[]): MensagemChat[] {
  return historico.map((m) => ({
    role: m.papel === 'ia' ? 'assistant' : 'user',
    content: m.texto,
  }))
}

function jsonDoTexto(texto: string): Record<string, unknown> | null {
  // Modelos embrulham o JSON em cercas de código ou o precedem de
  // comentário — extrai o primeiro objeto {...} balanceável de qualquer
  // posição do texto antes de desistir.
  const limpo = texto
    .replace(/```(?:json)?\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()
  const candidato = limpo.startsWith('{') ? limpo : (limpo.match(/\{[\s\S]*\}/)?.[0] ?? limpo)
  try {
    const interpretacao = JSON.parse(candidato)
    if (!interpretacao || typeof interpretacao !== 'object' || Array.isArray(interpretacao)) {
      return null
    }
    return interpretacao as Record<string, unknown>
  } catch {
    return null
  }
}

export class EntrevistadorOpenRouter implements EntrevistadorIA {
  constructor(private readonly apiKey = process.env.OPENROUTER_API_KEY) {}

  async conversar(
    historico: MensagemConversa[],
    contextoPerfil?: string | null
  ): Promise<ResultadoConversa> {
    const chamada = await chamar(this.apiKey, [
      { role: 'system', content: PROMPT_ENTREVISTA },
      ...(contextoPerfil
        ? [
            {
              role: 'system' as const,
              content: `Informações que a pessoa já respondeu no cadastro — não pergunte de novo, use para personalizar e encurtar a conversa:\n${contextoPerfil}`,
            },
          ]
        : []),
      ...paraChat(historico),
    ])
    if (!chamada.ok) return chamada

    const concluiu = chamada.texto.includes(SINAL_PRONTO)
    const mensagem = chamada.texto.replace(SINAL_PRONTO, '').trim()
    if (!mensagem) return { ok: false, motivo: 'vazia' }
    return { ok: true, mensagem: mensagem.slice(0, 600), concluiu }
  }
}

export class InterpretadorOpenRouter implements InterpretadorIA {
  constructor(private readonly apiKey = process.env.OPENROUTER_API_KEY) {}

  async interpretar(entrada: EntradaInterpretacao): Promise<ResultadoInterpretacao> {
    const conteudo = [
      `Transcrição da entrevista:\n${entrada.historico
        .map((m) => `${m.papel === 'ia' ? 'IA' : 'Pessoa'}: ${m.texto}`)
        .join('\n')}`,
      entrada.documentoTexto ? `Documento de apoio (transcrito):\n${entrada.documentoTexto}` : '',
      entrada.perfilTexto ? `Perfil respondido no cadastro:\n${entrada.perfilTexto}` : '',
    ].join('\n')

    const chamada = await chamar(
      this.apiKey,
      [
        { role: 'system', content: PROMPT_INTERPRETACAO },
        { role: 'user', content: conteudo },
      ],
      true
    )
    if (!chamada.ok) return chamada

    let interpretacao = jsonDoTexto(chamada.texto)
    if (!interpretacao) {
      // Uma segunda chance: modelos fracos às vezes devolvem prosa —
      // pede só o JSON, usando a resposta anterior como contexto.
      console.warn('[ia/openrouter] interpretação não veio em JSON — retentativa de formato')
      const segunda = await chamar(
        this.apiKey,
        [
          { role: 'system', content: PROMPT_INTERPRETACAO },
          { role: 'user', content: conteudo },
          { role: 'assistant', content: chamada.texto.slice(0, 2000) },
          {
            role: 'user',
            content:
              'Sua resposta anterior não era um JSON utilizável. Responda agora APENAS o objeto JSON do calendário, sem nenhum texto antes ou depois.',
          },
        ],
        true
      )
      if (!segunda.ok) return segunda
      interpretacao = jsonDoTexto(segunda.texto)
    }
    if (!interpretacao) return { ok: false, motivo: 'invalida' }
    return { ok: true, interpretacao }
  }
}
