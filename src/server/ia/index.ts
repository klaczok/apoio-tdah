import {
  ConselheiroOpenRouter,
  EntrevistadorOpenRouter,
  InterpretadorOpenRouter,
} from './openrouter'
import type { EntradaInterpretacao, InterpretadorIA, ResultadoInterpretacao } from './interpretador'
import type { EntrevistadorIA, MensagemConversa, ResultadoConversa } from './entrevistador'
import type { ConselheiroIA, EntradaConselho, ResultadoConselho } from './conselheiro'

export type { EntradaInterpretacao, InterpretadorIA, ResultadoInterpretacao }
export type { EntrevistadorIA, MensagemConversa, ResultadoConversa }
export type { ConselheiroIA, EntradaConselho, ResultadoConselho }

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
  async conversar(historico, contextoPerfil) {
    const global = globalThis as {
      __respostaConversaIA?: ResultadoConversa | ResultadoConversa[]
      __historicoConversaIA?: MensagemConversa[]
      __contextoConversaIA?: string | null
    }
    global.__historicoConversaIA = historico
    global.__contextoConversaIA = contextoPerfil ?? null
    const programada = global.__respostaConversaIA
    if (Array.isArray(programada)) return programada.shift() ?? { ok: false, motivo: 'vazia' }
    return programada ?? { ok: false, motivo: 'indisponivel' }
  },
}

// Conselheiro falso: devolve globalThis.__respostaConselhoIA e registra a
// entrada em __entradaConselhoIA para as asserções dos testes.
const conselheiroFalso: ConselheiroIA = {
  async aconselhar(entrada) {
    ;(globalThis as { __entradaConselhoIA?: EntradaConselho }).__entradaConselhoIA = entrada
    const resposta = (globalThis as { __respostaConselhoIA?: ResultadoConselho })
      .__respostaConselhoIA
    return resposta ?? { ok: false, motivo: 'indisponivel' }
  },
}

export function getConselheiro(): ConselheiroIA {
  if (process.env.INTERPRETADOR_DRIVER === 'fake') return conselheiroFalso
  return new ConselheiroOpenRouter()
}

export function getInterpretador(): InterpretadorIA {
  if (process.env.INTERPRETADOR_DRIVER === 'fake') return interpretadorFalso
  return new InterpretadorOpenRouter()
}

export function getEntrevistador(): EntrevistadorIA {
  if (process.env.INTERPRETADOR_DRIVER === 'fake') return entrevistadorFalso
  return new EntrevistadorOpenRouter()
}
