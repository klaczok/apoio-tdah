import { REFEICAO_REFS, definirAlimentacao, rotinaVazia } from '@/server/rotina/modelo'
import {
  referenciaAlimentar,
  referenciaParaDia,
  REFERENCIAS_ALIMENTARES,
  VERSAO_REFERENCIA_ATUAL,
} from '@/server/rotina/referencia-alimentar'
import { ehDataCivil } from '@/server/tempo'

describe('referência alimentar versionada', () => {
  it('a versão atual está registrada com fonte e data', () => {
    const referencia = referenciaAlimentar(VERSAO_REFERENCIA_ATUAL)
    expect(referencia).not.toBeNull()
    expect(referencia!.fonte).toMatch(/plano alimentar/i)
    expect(ehDataCivil(referencia!.dataReferencia)).toBe(true)
  })

  it('a fonte não replica dados de contato da profissional', () => {
    for (const referencia of Object.values(REFERENCIAS_ALIMENTARES)) {
      expect(referencia.fonte).not.toMatch(/@|www\.|telefone|\(\d{2}\)\s?9?\d/i)
    }
  })

  it('oferece as quatro refeições prescritas para dia com e sem treino', () => {
    const referencia = referenciaAlimentar(VERSAO_REFERENCIA_ATUAL)!
    for (const tipo of ['com-treino', 'sem-treino'] as const) {
      const plano = referencia.porTipoDia[tipo]
      expect(plano.refeicoes.map((r) => r.ref)).toEqual([...REFEICAO_REFS])
      for (const refeicao of plano.refeicoes) {
        expect(refeicao.itens.length).toBeGreaterThan(0)
      }
    }
    expect(referencia.porTipoDia['com-treino']).not.toEqual(referencia.porTipoDia['sem-treino'])
  })

  it('transcreve a prescrição sem calcular nutrientes nem calorias', () => {
    const serializado = JSON.stringify(REFERENCIAS_ALIMENTARES)
    expect(serializado).not.toMatch(/calorias?|kcal/i)
  })

  it('o tipo de dia seleciona a referência correspondente', () => {
    const rotina = definirAlimentacao(rotinaVazia(), {
      refeicoes: [],
      diasTreino: ['seg', 'qua', 'qui', 'sex'],
      referenciaVersao: VERSAO_REFERENCIA_ATUAL,
    })
    const referencia = referenciaAlimentar(VERSAO_REFERENCIA_ATUAL)!
    expect(referenciaParaDia(rotina.alimentacao, 'seg')).toEqual(
      referencia.porTipoDia['com-treino']
    )
    expect(referenciaParaDia(rotina.alimentacao, 'dom')).toEqual(
      referencia.porTipoDia['sem-treino']
    )
  })

  it('usa a versão atual quando nenhuma referência foi fixada', () => {
    const rotina = definirAlimentacao(rotinaVazia(), {
      refeicoes: [],
      diasTreino: ['seg'],
      referenciaVersao: null,
    })
    expect(referenciaParaDia(rotina.alimentacao, 'seg')).toEqual(
      referenciaAlimentar(VERSAO_REFERENCIA_ATUAL)!.porTipoDia['com-treino']
    )
  })

  it('não seleciona referência quando o tipo de dia está a confirmar', () => {
    const rotina = definirAlimentacao(rotinaVazia(), {
      refeicoes: [],
      diasTreino: null,
      referenciaVersao: null,
    })
    expect(referenciaParaDia(rotina.alimentacao, 'seg')).toBeNull()
  })

  it('versão desconhecida não resolve conteúdo', () => {
    expect(referenciaAlimentar(999)).toBeNull()
  })
})
