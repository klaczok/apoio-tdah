// Destinos fixos da área autenticada, alinhados às rotas existentes.
// Amanhã permanece acessível a partir de Hoje — a navegação persistente
// segue os cinco destinos do protótipo. Módulo sem 'use client' para o
// shell de servidor poder consumir as constantes diretamente.
export type Destino = {
  href: string
  rotulo: string
  icone: string
}

export const DESTINOS_PRINCIPAIS: Destino[] = [
  { href: '/semana', rotulo: 'Semana', icone: '◫' },
  { href: '/hoje', rotulo: 'Hoje', icone: '◉' },
  { href: '/proposta', rotulo: 'Proposta', icone: '◇' },
  { href: '/historico', rotulo: 'Histórico', icone: '↺' },
]

export const DESTINO_CONFIGURACAO: Destino = {
  href: '/configurar',
  rotulo: 'Configuração',
  icone: '⚙',
}

// Capacidade de criação já existente reutilizada pela ação central do
// celular — nenhuma capacidade nova é criada nesta fundação.
export const ACAO_CENTRAL = {
  href: '/configurar/compromissos',
  rotulo: 'Novo compromisso',
  icone: '＋',
}
