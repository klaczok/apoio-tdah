// Contrato do entrevistador de IA: conduz a conversa como um psiquiatra
// em primeira consulta de rotina — conhece a pessoa antes de detalhar
// horários e só sinaliza o fim quando tem material suficiente para o
// calendário semanal. A transcrição vive em material transitório
// (memória do processo); nada dela entra no EstadoPrivado.
import type { MensagemConversa } from '@/entrevista/conversa'

export type { MensagemConversa }

export type ResultadoConversa =
  | { ok: true; mensagem: string; concluiu: boolean }
  | { ok: false; motivo: 'indisponivel' | 'invalida' | 'vazia' }

export interface EntrevistadorIA {
  conversar(historico: MensagemConversa[]): Promise<ResultadoConversa>
}
