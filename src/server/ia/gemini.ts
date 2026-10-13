import type { EntradaInterpretacao, InterpretadorIA, ResultadoInterpretacao } from './interpretador'
import type { EntrevistadorIA, MensagemConversa, ResultadoConversa } from './entrevistador'

// Modelo atual da API — quando o Google aposenta uma versão, a
// resposta 404 já indica a substituta e os logs `[ia/gemini]` a expõem.
const MODELO_PADRAO = 'gemini-3.8-flash'
const TIMEOUT_MS = 15_000
const SINAL_PRONTO = '[[PRONTO]]'

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
// motivo — nunca a chave, o prompt ou o conteúdo da conversa. Quando o
// Google aposenta um modelo, o 404 já nomeia a substituta: retentamos
// uma vez com ela — uma GEMINI_MODEL desatualizada se autocorrige.
async function chamar(apiKey: string | undefined, prompt: string): Promise<Chamada> {
  if (!apiKey) {
    console.warn('[ia/gemini] GEMINI_API_KEY ausente — entrevista por IA indisponível')
    return { ok: false, motivo: 'indisponivel' }
  }

  const tentar = async (nomeModelo: string) => {
    try {
      return await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${nomeModelo}:generateContent`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        }
      )
    } catch (erro) {
      console.warn(
        '[ia/gemini] requisição falhou:',
        erro instanceof Error ? erro.message : String(erro)
      )
      return null
    }
  }

  let resposta = await tentar(modelo())
  if (resposta?.status === 404) {
    const corpo = await resposta.text().catch(() => '')
    console.warn('[ia/gemini] HTTP 404', corpo.slice(0, 300))
    // A mensagem do Google cita o modelo substituto: "use models/X".
    const substituto = corpo.match(/use models\/([\w.-]+)/i)?.[1]
    if (substituto && substituto !== modelo()) {
      console.warn(`[ia/gemini] retentando com o modelo sugerido: ${substituto}`)
      resposta = await tentar(substituto)
    }
  }
  if (!resposta) return { ok: false, motivo: 'indisponivel' }
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

function transcrever(historico: MensagemConversa[]): string {
  return historico.map((m) => `${m.papel === 'ia' ? 'IA' : 'Pessoa'}: ${m.texto}`).join('\n')
}

// Conduz a entrevista como um psiquiatra em primeira consulta: conhece
// a pessoa primeiro e faz quantas perguntas precisar — sem número
// fixo — até ter material para montar um calendário semanal coerente
// com a vida dela. Quando estiver satisfeito, sinaliza [[PRONTO]].
export class EntrevistadorGemini implements EntrevistadorIA {
  constructor(private readonly apiKey = process.env.GEMINI_API_KEY) {}

  async conversar(historico: MensagemConversa[]): Promise<ResultadoConversa> {
    const prompt = [
      'Você é um psiquiatra conduzindo a primeira consulta com um paciente para entender a rotina dele e montar um calendário semanal realista.',
      'Conduza a conversa em português brasileiro, com acolhimento e sem jargão clínico — uma pergunta por vez.',
      'Comece se apresentando em uma frase e fazendo a primeira pergunta, buscando conhecer a pessoa antes de detalhar horários.',
      'Ao longo da conversa, cubra: prioridades e o que mais importa agora; compromissos fixos com dias e horários; sono, refeições e autocuidado; responsabilidades que pesam e o que dificulta organizar o dia; em que período a energia está mais alta.',
      'Faça perguntas de aprofundamento quando a resposta estiver vaga — não há número fixo de perguntas, mas também não prolongue além do necessário.',
      'Quando tiver informação suficiente para montar um calendário semanal coerente com a vida da pessoa, escreva uma breve mensagem de encerramento agradecendo e finalize a última linha apenas com o marcador [[PRONTO]].',
      'Responda apenas com a próxima mensagem sua, em texto corrido — sem prefixos, sem JSON.',
      '',
      historico.length > 0
        ? `Conversa até aqui:\n${transcrever(historico)}`
        : 'A conversa ainda não começou.',
    ].join('\n')

    const chamada = await chamar(this.apiKey, prompt)
    if (!chamada.ok) return chamada

    const concluiu = chamada.texto.includes(SINAL_PRONTO)
    const mensagem = chamada.texto.replace(SINAL_PRONTO, '').trim()
    if (!mensagem) return { ok: false, motivo: 'vazia' }
    return { ok: true, mensagem: mensagem.slice(0, 600), concluiu }
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
      `Transcrição da entrevista:\n${transcrever(entrada.historico)}`,
      entrada.documentoTexto ? `Documento de apoio (transcrito):\n${entrada.documentoTexto}` : '',
    ].join('\n')

    const chamada = await chamar(this.apiKey, prompt)
    if (!chamada.ok) return chamada

    const interpretacao = jsonDoTexto(chamada.texto)
    if (!interpretacao) return { ok: false, motivo: 'invalida' }
    return { ok: true, interpretacao }
  }
}
