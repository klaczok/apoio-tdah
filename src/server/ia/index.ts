import { EntrevistadorOpenRouter, InterpretadorOpenRouter } from './openrouter'
import type { EntradaInterpretacao, InterpretadorIA, ResultadoInterpretacao } from './interpretador'
import type { EntrevistadorIA, MensagemConversa, ResultadoConversa } from './entrevistador'

export type { EntradaInterpretacao, InterpretadorIA, ResultadoInterpretacao }
export type { EntrevistadorIA, MensagemConversa, ResultadoConversa }

// Interpretador falso para testes e desenvolvimento local sem chave:
// devolve o que estiver em globalThis.__respostaIA — mesma forma do
// driver de persistência (PERSISTENCE_DRIVER=memory).
const interpretadorFalso: InterpretadorIA = {
  async interpretar(entrada) {
    ;(globalThis as { __entradaIA?: EntradaInterpretacao }).__entradaIA = entrada
    const resposta = (globalThis as { __respostaIA?: ResultadoInterpretacao }).__respostaIA
    return resposta ?? { ok: false, motivo: 'indisponivel' }
  },
}

// Entrevistador falso: consome a fila em globalThis.__respostaConversaIA
// (ou repete o valor único) e registra o histórico recebido em
// __historicoConversaIA para as asserções dos testes.
const entrevistadorFalso: EntrevistadorIA = {
  async conversar(historico) {
    const global = globalThis as {
      __respostaConversaIA?: ResultadoConversa | ResultadoConversa[]
      __historicoConversaIA?: MensagemConversa[]
    }
    global.__historicoConversaIA = historico
    const programada = global.__respostaConversaIA
    if (Array.isArray(programada)) return programada.shift() ?? { ok: false, motivo: 'vazia' }
    return programada ?? { ok: false, motivo: 'indisponivel' }
  },
}

export function getInterpretador(): InterpretadorIA {
  if (process.env.INTERPRETADOR_DRIVER === 'fake') return interpretadorFalso
  return new InterpretadorOpenRouter()
}

export function getEntrevistador(): EntrevistadorIA {
  if (process.env.INTERPRETADOR_DRIVER === 'fake') return entrevistadorFalso
  return new EntrevistadorOpenRouter()
}
