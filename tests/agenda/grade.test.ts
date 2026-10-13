import {
  JANELA_PADRAO,
  janelaDaSemana,
  posicaoAgora,
  projetarColuna,
  type EntradaBloco,
} from '@/server/agenda/grade'

const JANELA = { inicioMin: 480, fimMin: 1200 } // 08:00–20:00

function bloco(
  id: string,
  inicio: string | null,
  fim: string | null,
  tipo: EntradaBloco['tipo'] = 'flexivel'
): EntradaBloco {
  return { id, titulo: id, inicio, fim, tipo }
}

describe('janelaDaSemana', () => {
  it('usa a janela padrão quando não há horários', () => {
    expect(janelaDaSemana([])).toEqual(JANELA_PADRAO)
    expect(janelaDaSemana([null, null])).toEqual(JANELA_PADRAO)
  })

  it('cobre o primeiro e o último horário em horas cheias', () => {
    expect(janelaDaSemana(['10:30', '18:45'])).toEqual({ inicioMin: 600, fimMin: 1140 })
  })

  it('garante ao menos uma hora de amplitude', () => {
    const j = janelaDaSemana(['12:10', '12:20'])
    expect(j.fimMin - j.inicioMin).toBeGreaterThanOrEqual(60)
  })
})

describe('projetarColuna', () => {
  it('posiciona o bloco pelo início e dimensiona pela duração', () => {
    const coluna = projetarColuna([bloco('a', '12:00', '14:00')], JANELA)

    expect(coluna.blocos).toHaveLength(1)
    const b = coluna.blocos[0]!
    // 12:00 em 08:00–20:00 → 4h/12h do topo; 2h de 12h de altura.
    expect(b.topoPct).toBeCloseTo((240 / 720) * 100)
    expect(b.alturaPct).toBeCloseTo((120 / 720) * 100)
  })

  it('marca sobreposição sem rearranjar os blocos', () => {
    const coluna = projetarColuna(
      [bloco('a', '10:00', '12:00'), bloco('b', '11:00', '13:00')],
      JANELA
    )
    expect(coluna.blocos.map((b) => b.sobreposto)).toEqual([true, true])
    expect(coluna.blocos[0]!.inicioMin).toBe(600)
  })

  it('itens sem horário ficam fora da linha do tempo como a confirmar', () => {
    const coluna = projetarColuna(
      [bloco('a', null, null), bloco('b', '10:00', null), bloco('c', '10:00', '11:00')],
      JANELA
    )
    expect(coluna.semHorario.map((i) => i.id)).toEqual(['a', 'b'])
    expect(coluna.blocos.map((i) => i.id)).toEqual(['c'])
  })

  it('corta blocos que saem da janela visível', () => {
    const coluna = projetarColuna([bloco('a', '06:00', '09:00')], JANELA)
    expect(coluna.blocos[0]!.topoPct).toBe(0)
    expect(coluna.blocos[0]!.alturaPct).toBeCloseTo((60 / 720) * 100)
  })

  it('descarta bloco inteiramente fora da janela', () => {
    const coluna = projetarColuna([bloco('a', '05:00', '06:00')], JANELA)
    expect(coluna.blocos).toHaveLength(0)
  })

  it('expõe lacunas livres dentro do período acordado sem criar itens', () => {
    const coluna = projetarColuna(
      [bloco('a', '10:00', '12:00', 'fixo')],
      JANELA,
      { acordar: '08:00', dormir: '20:00' }
    )
    expect(coluna.lacunas).toHaveLength(2)
    expect(coluna.lacunas[0]).toMatchObject({ inicioMin: 480, fimMin: 600 })
    expect(coluna.lacunas[1]).toMatchObject({ inicioMin: 720, fimMin: 1200 })
  })

  it('ignora lacunas menores que o mínimo de respiro', () => {
    const coluna = projetarColuna(
      [bloco('a', '10:00', '10:05'), bloco('b', '10:10', '12:00')],
      JANELA,
      { acordar: '10:00', dormir: '12:00' }
    )
    expect(coluna.lacunas).toHaveLength(0)
  })

  it('resume carga factual: ocupado e livre somam o período', () => {
    const coluna = projetarColuna(
      [bloco('a', '10:00', '12:00'), bloco('b', '14:00', '15:00')],
      JANELA,
      { acordar: '08:00', dormir: '20:00' }
    )
    expect(coluna.ocupadoMin).toBe(180)
    expect(coluna.ocupadoMin + coluna.livreMin).toBe(720)
  })

  it('sobreposições não inflam o tempo ocupado', () => {
    const coluna = projetarColuna(
      [bloco('a', '10:00', '12:00'), bloco('b', '11:00', '13:00')],
      JANELA
    )
    expect(coluna.ocupadoMin).toBe(180)
  })
})

describe('posicaoAgora', () => {
  it('devolve a posição percentual dentro da janela', () => {
    expect(posicaoAgora(840, JANELA)).toBeCloseTo(50)
  })

  it('fora da janela não há linha', () => {
    expect(posicaoAgora(400, JANELA)).toBeNull()
    expect(posicaoAgora(1300, JANELA)).toBeNull()
  })
})
