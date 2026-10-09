import type { PersistenceError } from './store'

export function erroParaParam(error: PersistenceError): string {
  switch (error.kind) {
    case 'conflito-versao':
      return 'conflito'
    case 'schema-invalido':
      return 'dados'
    case 'entrada-invalida':
      return 'entrada'
    case 'confirmacao-necessaria':
      return 'confirmacao'
    case 'confirmacao-destino':
      return 'confirmacao-destino'
    case 'item-ausente':
      return 'ausente'
    case 'prioridade-cheia':
      return 'prioridade-cheia'
    case 'alerta-pendente':
      return 'alerta'
    case 'armazenamento-indisponivel':
      return 'persistencia'
  }
}

export const MENSAGENS_ERRO: Record<string, string> = {
  conflito: 'Os dados mudaram em outra sessão. Recarregue para ver a versão mais recente.',
  dados: 'Os dados salvos estão em formato inesperado.',
  persistencia: 'Não foi possível salvar agora. Tente novamente.',
  entrada: 'Algum campo está em formato inválido. Revise e tente novamente.',
  confirmacao: 'Este item é protegido. Marque a confirmação para alterá-lo.',
  ausente: 'Este item já não existe. Recarregue para ver a versão atual.',
  'prioridade-cheia': 'Já são três prioridades. Escolha qual substituir.',
  alerta: 'O dia tem alertas. Marque o reconhecimento para confirmar.',
  'confirmacao-destino':
    'Veja os conflitos e a capacidade do dia de destino e marque a confirmação para trocar.',
}
