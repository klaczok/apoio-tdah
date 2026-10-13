import { EntrevistadorGemini, InterpretadorGemini } from './gemini'
import type { EntradaInterpretacao, InterpretadorIA, ResultadoInterpretacao } from './interpretador'
import type { EntrevistadorIA, PerguntaEntrevista, ResultadoPerguntas } from './entrevistador'

export type { EntradaInterpretacao, InterpretadorIA, ResultadoInterpretacao }
export type { EntrevistadorIA, PerguntaEntrevista, ResultadoPerguntas }

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

// Entrevistador falso: devolve as perguntas em globalThis.__perguntasIA.
const entrevistadorFalso: EntrevistadorIA = {
  async perguntar() {
    const perguntas = (globalThis as { __perguntasIA?: ResultadoPerguntas }).__perguntasIA
    return perguntas ?? { ok: false, motivo: 'indisponivel' }
  },
}

export function getInterpretador(): InterpretadorIA {
  if (process.env.INTERPRETADOR_DRIVER === 'fake') return interpretadorFalso
  return new InterpretadorGemini()
}

export function getEntrevistador(): EntrevistadorIA {
  if (process.env.INTERPRETADOR_DRIVER === 'fake') return entrevistadorFalso
  return new EntrevistadorGemini()
}
