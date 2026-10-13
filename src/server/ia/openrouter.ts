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
  'Você é um psiquiatra conduzindo a primeira consulta com um paciente para entender a rotina dele e montar um calendário semanal realista.',
  'Conduza a conversa em português brasileiro, com acolhimento e sem jargão clínico — uma pergunta por vez.',
  'Comece se apresentando em uma frase e fazendo a primeira pergunta, buscando conhecer a pessoa antes de detalhar horários.',
  'Ao longo da conversa, cubra: prioridades e o que mais importa agora; compromissos fixos com dias e horários; sono, refeições e autocuidado; responsabilidades que pesam e o que dificulta organizar o dia; em que período a energia está mais alta.',
  'Faça perguntas de aprofundamento quando a resposta estiver vaga — não há número fixo de perguntas, mas também não prolongue além do necessário.',
  'Quando tiver informação suficiente para montar um calendário semanal coerente com a vida da pessoa, escreva uma breve mensagem de encerramento agradecendo e finalize a última linha apenas com o marcador [[PRONTO]].',
  'Responda apenas com a próxima mensagem sua, em texto corrido — sem prefixos, sem JSON.',
].join('\n')

const PROMPT_INTERPRETACAO = [
  'Você ajuda a organizar uma rotina semanal a partir de uma entrevista conduzida por um psiquiatra.',
  'Responda APENAS com JSON válido neste formato (omita o que não souber):',
  '{"sono":{"dormir":"HH:MM","acordar":"HH:MM"},',
  '"trabalho":{"diasSemana":["seg"],"horasPadrao":8,"limiteExcepcional":10},',
  '"compromissos":[{"titulo":"...","diaSemana":"seg","inicio":"HH:MM","fim":"HH:MM","categoria":"trabalho|familia|saude|alimentacao|estudo|musica|descanso|pessoal","tipo":"fixo|flexivel"}],',
  '"periodos":[{"tipo":"cuidado-familiar|indisponibilidade","diaSemana":"seg","inicio":"HH:MM","fim":"HH:MM"}],',
  '"preferenciaCarga":"leve|equilibrada|intensa"}',
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
// (rate limit ou demanda) retenta com backoff curto.
async function chamar(apiKey: string | undefined, mensagens: MensagemChat[]): Promise<Chamada> {
  if (!apiKey) {
    console.warn('[ia/openrouter] OPENROUTER_API_KEY ausente — entrevista por IA indisponível')
    return { ok: false, motivo: 'indisponivel' }
  }

  const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))
  let resposta: Response | null = null
  for (const espera of [0, 1200, 3000]) {
    if (espera > 0) await esperar(espera)
    try {
      resposta = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: modelo(), messages: mensagens }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch (erro) {
      console.warn(
        '[ia/openrouter] requisição falhou:',
        erro instanceof Error ? erro.message : String(erro)
      )
      resposta = null
      continue
    }
    if (resposta.status !== 429 && resposta.status !== 503) break
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
  // Modelos costumam embrulhar o JSON em cercas de código — limpa antes.
  const limpo = texto
    .replace(/```(?:json)?\s*/gi, '')
    .replace(/```\s*$/g, '')
    .trim()
  try {
    const interpretacao = JSON.parse(limpo)
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

  async conversar(historico: MensagemConversa[]): Promise<ResultadoConversa> {
    const chamada = await chamar(this.apiKey, [
      { role: 'system', content: PROMPT_ENTREVISTA },
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
    ].join('\n')

    const chamada = await chamar(this.apiKey, [
      { role: 'system', content: PROMPT_INTERPRETACAO },
      { role: 'user', content: conteudo },
    ])
    if (!chamada.ok) return chamada

    const interpretacao = jsonDoTexto(chamada.texto)
    if (!interpretacao) return { ok: false, motivo: 'invalida' }
    return { ok: true, interpretacao }
  }
}
