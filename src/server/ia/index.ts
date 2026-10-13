import { InterpretadorGemini } from './gemini'
import type { EntradaInterpretacao, InterpretadorIA, ResultadoInterpretacao } from './interpretador'

export type { EntradaInterpretacao, InterpretadorIA, ResultadoInterpretacao }

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

export function getInterpretador(): InterpretadorIA {
  if (process.env.INTERPRETADOR_DRIVER === 'fake') return interpretadorFalso
  return new InterpretadorGemini()
}
