import type { EntradaInterpretacao, InterpretadorIA, ResultadoInterpretacao } from './interpretador'
import type { EntrevistadorIA, PerguntaEntrevista, ResultadoPerguntas } from './entrevistador'

const MODELO_PADRAO = 'gemini-2.0-flash'
const TIMEOUT_MS = 15_000
const MAX_PERGUNTAS = 5

// Adaptador do Gemini Developer API (Free Tier), usado exclusivamente
// no servidor. A chave sai de GEMINI_API_KEY e nunca é exposta ao
// navegador, ao EstadoPrivado ou a logs — a resposta bruta também não é
// persistida: só a interpretação normalizada segue adiante. O modelo é
// configurável via GEMINI_MODEL para trocar de versão sem redeploy.
function modelo(): string {
  return process.env.GEMINI_MODEL ?? MODELO_PADRAO
}

type Chamada =
  { ok: true; texto: string } | { ok: false; motivo: 'indisponivel' | 'invalida' | 'vazia' }

// Chamada única ao generateContent. Os logs registram apenas status e
// motivo — nunca a chave, o prompt ou o conteúdo das respostas.
async function chamar(apiKey: string | undefined, prompt: string): Promise<Chamada> {
  if (!apiKey) {
    console.warn('[ia/gemini] GEMINI_API_KEY ausente — entrevista por IA indisponível')
    return { ok: false, motivo: 'indisponivel' }
  }

  let resposta: Response
  try {
    resposta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo()}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    )
  } catch (erro) {
    console.warn(
      '[ia/gemini] requisição falhou:',
      erro instanceof Error ? erro.message : String(erro)
    )
    return { ok: false, motivo: 'indisponivel' }
  }
  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => '')
    console.warn('[ia/gemini] HTTP', resposta.status, corpo.slice(0, 300))
    return { ok: false, motivo: 'indisponivel' }
  }

  let texto = ''
  try {
    const corpoJson = (await resposta.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    }
    texto = corpoJson.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  } catch {
    return { ok: false, motivo: 'invalida' }
  }
  if (!texto) return { ok: false, motivo: 'vazia' }
  return { ok: true, texto }
}

function jsonDoTexto(texto: string): Record<string, unknown> | null {
  try {
    const interpretacao = JSON.parse(texto)
    if (!interpretacao || typeof interpretacao !== 'object' || Array.isArray(interpretacao)) {
      return null
    }
    return interpretacao as Record<string, unknown>
  } catch {
    return null
  }
}

// Formula as cinco perguntas da entrevista com perfil de psiquiatra em
// primeira consulta de rotina — cada pergunta abre espaço para a pessoa
// contar com as próprias palavras, e as respostas alimentam a montagem
// do calendário semanal.
export class EntrevistadorGemini implements EntrevistadorIA {
  constructor(private readonly apiKey = process.env.GEMINI_API_KEY) {}

  async perguntar(): Promise<ResultadoPerguntas> {
    const prompt = [
      'Você é um psiquiatra conduzindo a primeira consulta com um paciente para entender a rotina dele e montar um calendário semanal realista.',
      'Formule exatamente 5 perguntas em português brasileiro, acolhedoras e não clínicas, que a pessoa responde com texto livre.',
      'As perguntas devem cobrir, nesta ordem:',
      '1. o que mais importa para a pessoa neste momento (prioridades e objetivos);',
      '2. os compromissos fixos da semana, com dias e horários (trabalho, aulas, consultas, cuidado de pessoas);',
      '3. sono, refeições e autocuidado — horários habituais de dormir, acordar e comer;',
      '4. responsabilidades que pesam e o que costuma dificultar a organização do dia;',
      '5. em que período do dia a energia costuma estar mais alta.',
      'Responda APENAS com JSON válido neste formato:',
      '{"perguntas":[{"titulo":"rótulo curto da etapa","pergunta":"pergunta completa e acolhedora"}]}',
    ].join('\n')

    const chamada = await chamar(this.apiKey, prompt)
    if (!chamada.ok) return chamada

    const json = jsonDoTexto(chamada.texto)
    const brutas = Array.isArray(json?.perguntas) ? json.perguntas : null
    if (!brutas || brutas.length === 0) return { ok: false, motivo: 'invalida' }

    const perguntas: PerguntaEntrevista[] = []
    for (const bruta of brutas.slice(0, MAX_PERGUNTAS)) {
      if (!bruta || typeof bruta !== 'object') continue
      const { titulo, pergunta } = bruta as { titulo?: unknown; pergunta?: unknown }
      if (typeof pergunta !== 'string' || !pergunta.trim()) continue
      perguntas.push({
        id: `p${perguntas.length + 1}`,
        titulo:
          typeof titulo === 'string' && titulo.trim()
            ? titulo.trim().slice(0, 80)
            : `Pergunta ${perguntas.length + 1}`,
        pergunta: pergunta.trim().slice(0, 240),
      })
    }
    return perguntas.length > 0 ? { ok: true, perguntas } : { ok: false, motivo: 'invalida' }
  }
}

export class InterpretadorGemini implements InterpretadorIA {
  constructor(private readonly apiKey = process.env.GEMINI_API_KEY) {}

  async interpretar(entrada: EntradaInterpretacao): Promise<ResultadoInterpretacao> {
    const prompt = [
      'Você ajuda a organizar uma rotina semanal a partir de uma entrevista conduzida por um psiquiatra.',
      'Responda APENAS com JSON válido neste formato (omita o que não souber):',
      '{"sono":{"dormir":"HH:MM","acordar":"HH:MM"},',
      '"trabalho":{"diasSemana":["seg"],"horasPadrao":8,"limiteExcepcional":10},',
      '"compromissos":[{"titulo":"...","diaSemana":"seg","inicio":"HH:MM","fim":"HH:MM","categoria":"trabalho|familia|saude|alimentacao|estudo|musica|descanso|pessoal","tipo":"fixo|flexivel"}],',
      '"periodos":[{"tipo":"cuidado-familiar|indisponibilidade","diaSemana":"seg","inicio":"HH:MM","fim":"HH:MM"}],',
      '"preferenciaCarga":"leve|equilibrada|intensa"}',
      'Não invente horários, durações ou compromissos que a pessoa não mencionou.',
      entrada.perguntas
        ? `Perguntas feitas na entrevista:\n${JSON.stringify(entrada.perguntas)}`
        : '',
      `Respostas da entrevista:\n${JSON.stringify(entrada.respostas)}`,
      entrada.documentoTexto ? `Documento de apoio (transcrito):\n${entrada.documentoTexto}` : '',
    ].join('\n')

    const chamada = await chamar(this.apiKey, prompt)
    if (!chamada.ok) return chamada

    const interpretacao = jsonDoTexto(chamada.texto)
    if (!interpretacao) return { ok: false, motivo: 'invalida' }
    return { ok: true, interpretacao }
  }
}
