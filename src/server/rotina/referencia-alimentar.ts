import {
  tipoDiaAlimentar,
  type AlimentacaoConfig,
  type DiaSemana,
  type RefeicaoRef,
  type TipoDiaAlimentar,
} from './modelo'

export type RefeicaoPrescrita = {
  ref: RefeicaoRef
  titulo: string
  itens: string[]
}

export type PlanoTipoDia = {
  refeicoes: RefeicaoPrescrita[]
  notas: string[]
}

export type ReferenciaAlimentar = {
  versao: number
  fonte: string
  dataReferencia: string
  porTipoDia: Record<TipoDiaAlimentar, PlanoTipoDia>
}

const VERSAO_1: ReferenciaAlimentar = {
  versao: 1,
  fonte: 'Plano alimentar — Letícia Silvestrini (CRN 51934)',
  dataReferencia: '2026-10-06',
  porTipoDia: {
    'com-treino': {
      refeicoes: [
        {
          ref: 'cafe-da-manha',
          titulo: 'Café da manhã',
          itens: [
            'Café (Caneca: 1)',
            'Ovo de galinha (Unidade: 2)',
            'Iogurte natural - Nestlé® (Pote (170g): 1)',
            'Maçã (Unidade: 1)',
          ],
        },
        {
          ref: 'almoco',
          titulo: 'Almoço',
          itens: [
            'Arroz branco (cozido) (Grama: 100)',
            'Feijão cozido (Grama: 90)',
            'Filé de frango grelhado (Filé médio (140g): 1) OU Bife de patinho grelhado (Grama: 130)',
            'Salada de alface (à vontade)',
            'Brócolis (cozido) (Grama: 150)',
          ],
        },
        {
          ref: 'lanche-da-tarde',
          titulo: 'Lanche da tarde',
          itens: [
            'Whey Protein (Grama: 30)',
            'Morango (Grama: 100)',
            'Banana (Unidade média: 1)',
            'Água (200 ml)',
          ],
        },
        {
          ref: 'jantar',
          titulo: 'Jantar',
          itens: [
            'Creatina (5 gramas)',
            'Batata doce cozida (Grama: 150) OU Macarrão cozido (Grama: 100)',
            'Filé de frango (cozido e desfiado) (Grama: 120)',
            'Abobrinha (cozida) (Grama: 150)',
            'Tomate cereja (Unidade: 6)',
            'Alface (Prato Raso: 1)',
          ],
        },
      ],
      notas: ['Refeição livre — se desejar, 1 vez na semana'],
    },
    'sem-treino': {
      refeicoes: [
        {
          ref: 'cafe-da-manha',
          titulo: 'Café da manhã',
          itens: [
            'Café (Caneca: 1)',
            'Clara de ovo de galinha (Unidade: 3)',
            'Gema de ovo de galinha (Unidade: 1)',
            'Banana OU maçã (Unidade média: 1)',
          ],
        },
        {
          ref: 'almoco',
          titulo: 'Almoço',
          itens: [
            'Salada de alface e tomate à vontade',
            'Arroz branco (cozido) (Grama: 100)',
            'Feijão (Grama: 80)',
            'Filé de frango grelhado (Filé médio (140g): 1) OU Bife de patinho (Grama: 130)',
            'Couve-flor (cozida) (Grama: 150)',
          ],
        },
        {
          ref: 'lanche-da-tarde',
          titulo: 'Lanche da tarde',
          itens: [
            'Whey Protein (Grama: 30)',
            'Iogurte natural - Nestlé® (Pote: 1)',
            'Uva (Unidade: 8)',
            'Granola (Grama: 15)',
          ],
        },
        {
          ref: 'jantar',
          titulo: 'Jantar',
          itens: [
            'Creatina (5 gramas)',
            'Antes da refeição: salada de rúcula e alface (à vontade)',
            'Macarrão cozido (Grama: 100)',
            'Atum em conserva (Lata: metade)',
            'Tomate cereja (Unidade (10g): 6)',
          ],
        },
      ],
      notas: [],
    },
  },
}

export const REFERENCIAS_ALIMENTARES: Readonly<Record<number, ReferenciaAlimentar>> = {
  1: VERSAO_1,
}

export const VERSAO_REFERENCIA_ATUAL = 1

export function referenciaAlimentar(versao: number | null | undefined): ReferenciaAlimentar | null {
  if (versao == null) return null
  return REFERENCIAS_ALIMENTARES[versao] ?? null
}

export function referenciaParaDia(
  alimentacao: AlimentacaoConfig | null,
  dia: DiaSemana
): PlanoTipoDia | null {
  const tipo = tipoDiaAlimentar(alimentacao, dia)
  if (!tipo) return null
  const referencia = referenciaAlimentar(alimentacao?.referenciaVersao ?? VERSAO_REFERENCIA_ATUAL)
  return referencia?.porTipoDia[tipo] ?? null
}
