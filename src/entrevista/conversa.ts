// Tipos compartilhados da conversa da entrevista. A IA conduz como um
// psiquiatra em primeira consulta: conhece a pessoa primeiro e faz
// quantas perguntas precisar — sem número fixo — até ter material para
// montar um calendário semanal coerente com a vida dela.

export type PapelConversa = 'ia' | 'pessoa'

export type MensagemConversa = {
  papel: PapelConversa
  texto: string
}

export const TAMANHO_MAX_MENSAGEM = 600
/** Teto de segurança: passou disso, a conversa encerra mesmo sem sinal da IA. */
export const LIMITE_MENSAGENS_PESSOA = 12

// Sanitiza o texto que vem do cliente antes de entrar na transcrição
// transitória — nunca no EstadoPrivado.
export function normalizarMensagem(entrada: unknown): string | null {
  if (typeof entrada !== 'string') return null
  const texto = entrada.trim().slice(0, TAMANHO_MAX_MENSAGEM)
  return texto.length > 0 ? texto : null
}

// A sessão efêmera guarda só uma marca de conclusão da conversa — a
// transcrição em si vive em material transitório no servidor.
export type RespostaEtapa = {
  selecionadas: string[]
  texto: string
}

export type RespostasEntrevista = Record<string, RespostaEtapa>

export const MARCA_ENTREVISTA_CONCLUIDA: RespostasEntrevista = {
  conversa: { selecionadas: [], texto: 'concluída' },
}
