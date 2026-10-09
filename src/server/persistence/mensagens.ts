import type { PersistenceError } from './store'

export function erroParaParam(error: PersistenceError): string {
  switch (error.kind) {
    case 'conflito-versao':
      return 'conflito'
    case 'schema-invalido':
      return 'dados'
    case 'entrada-invalida':
      return 'entrada'
    case 'armazenamento-indisponivel':
      return 'persistencia'
  }
}

export const MENSAGENS_ERRO: Record<string, string> = {
  conflito: 'As anotações mudaram em outra sessão. Recarregue para ver a versão mais recente.',
  dados: 'Os dados salvos estão em formato inesperado.',
  persistencia: 'Não foi possível salvar agora. Tente novamente.',
  entrada: 'Data inválida.',
}
