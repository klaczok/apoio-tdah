// Contrato do entrevistador de IA: formula as cinco perguntas da
// entrevista — como um psiquiatra conduzindo a primeira conversa para
// entender a rotina da pessoa e montar seu calendário semanal. As
// perguntas vivem em material transitório (memória do processo); as
// respostas ficam na sessão efêmera. Nada disso entra no
// EstadoPrivado.
import type { PerguntaEntrevista } from '@/entrevista/etapas'

export type { PerguntaEntrevista }

export type ResultadoPerguntas =
  | { ok: true; perguntas: PerguntaEntrevista[] }
  | { ok: false; motivo: 'indisponivel' | 'invalida' | 'vazia' }

export interface EntrevistadorIA {
  perguntar(): Promise<ResultadoPerguntas>
}
