import type { RespostasEntrevista } from '@/entrevista/etapas'

// Contrato do interpretador de IA: recebe apenas material consentido da
// sessão efêmera e devolve uma interpretação estruturada (JSON) que a
// normalização do domínio ainda vai validar — a IA nunca escreve
// diretamente na RotinaRecorrente nem no EstadoPrivado.
export type EntradaInterpretacao = {
  respostas: RespostasEntrevista
  documentoTexto: string | null
}

export type ResultadoInterpretacao =
  | { ok: true; interpretacao: Record<string, unknown> }
  | { ok: false; motivo: 'indisponivel' | 'invalida' | 'vazia' }

export interface InterpretadorIA {
  interpretar(entrada: EntradaInterpretacao): Promise<ResultadoInterpretacao>
}
