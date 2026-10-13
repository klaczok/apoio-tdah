import type { EntradaInterpretacao, InterpretadorIA, ResultadoInterpretacao } from './interpretador'

const MODELO = 'gemini-2.0-flash'
const TIMEOUT_MS = 15_000

// Adaptador do Gemini Developer API (Free Tier), usado exclusivamente
// no servidor. A chave sai de GEMINI_API_KEY e nunca é exposta ao
// navegador, ao EstadoPrivado ou a logs — a resposta bruta também não é
// persistida: só a interpretação normalizada segue adiante.
export class InterpretadorGemini implements InterpretadorIA {
  constructor(private readonly apiKey = process.env.GEMINI_API_KEY) {}

  async interpretar(entrada: EntradaInterpretacao): Promise<ResultadoInterpretacao> {
    if (!this.apiKey) return { ok: false, motivo: 'indisponivel' }

    const prompt = [
      'Você ajuda a organizar uma rotina semanal a partir de respostas de uma entrevista.',
      'Responda APENAS com JSON válido neste formato (omita o que não souber):',
      '{"sono":{"dormir":"HH:MM","acordar":"HH:MM"},',
      '"trabalho":{"diasSemana":["seg"],"horasPadrao":8,"limiteExcepcional":10},',
      '"compromissos":[{"titulo":"...","diaSemana":"seg","inicio":"HH:MM","fim":"HH:MM","categoria":"trabalho|familia|saude|alimentacao|estudo|musica|descanso|pessoal","tipo":"fixo|flexivel"}],',
      '"periodos":[{"tipo":"cuidado-familiar|indisponibilidade","diaSemana":"seg","inicio":"HH:MM","fim":"HH:MM"}],',
      '"preferenciaCarga":"leve|equilibrada|intensa"}',
      'Não invente horários, durações ou compromissos que a pessoa não mencionou.',
      'Respostas da entrevista:',
      JSON.stringify(entrada.respostas),
      entrada.documentoTexto ? `Documento de apoio (transcrito):\n${entrada.documentoTexto}` : '',
    ].join('\n')

    let resposta: Response
    try {
      resposta = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        }
      )
    } catch {
      return { ok: false, motivo: 'indisponivel' }
    }
    if (!resposta.ok) return { ok: false, motivo: 'indisponivel' }

    let texto = ''
    try {
      const corpo = (await resposta.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
      texto = corpo.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    } catch {
      return { ok: false, motivo: 'invalida' }
    }
    if (!texto) return { ok: false, motivo: 'vazia' }

    try {
      const interpretacao = JSON.parse(texto)
      if (!interpretacao || typeof interpretacao !== 'object' || Array.isArray(interpretacao)) {
        return { ok: false, motivo: 'invalida' }
      }
      return { ok: true, interpretacao }
    } catch {
      return { ok: false, motivo: 'invalida' }
    }
  }
}
