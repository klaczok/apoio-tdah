import type { RespostasEntrevista } from '@/entrevista/etapas'
import type { PerguntaEntrevista } from './entrevistador'

// Contrato do interpretador de IA: recebe apenas material consentido da
// sessão efêmera e devolve uma interpretação estruturada (JSON) que a
// normalização do domínio ainda vai validar — a IA nunca escreve
// diretamente na RotinaRecorrente nem no EstadoPrivado.
export type EntradaInterpretacao = {
  respostas: RespostasEntrevista
  /** Perguntas que a IA formulou — dão contexto às respostas livres. */
  perguntas?: Pick<PerguntaEntrevista, 'id' | 'titulo' | 'pergunta'>[] | null
  documentoTexto: string | null
}

export type ResultadoInterpretacao =
  | { ok: true; interpretacao: Record<string, unknown> }
  | { ok: false; motivo: 'indisponivel' | 'invalida' | 'vazia' }

export interface InterpretadorIA {
  interpretar(entrada: EntradaInterpretacao): Promise<ResultadoInterpretacao>
}
