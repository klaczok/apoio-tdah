import { gerarInstanciaDiaria } from '@/server/dia/gerar'
import { ajustarItem, confirmarDia, type InstanciaDiaria } from '@/server/dia/modelo'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import type { PropostaSemanal } from '@/server/proposta/modelo'
import { SchemaInvalidoError } from '@/server/persistence/schema-error'
import { horaParaMinutos as emMinutos } from '@/server/tempo'
import {
  acrescentarCompromisso,
  acrescentarPeriodo,
  ConfirmacaoFixoError,
  definirPresencial,
  definirSono,
  definirTrabalho,
  ItemNaoEncontradoError,
  rotinaVazia,
  type RotinaRecorrente,
} from '@/server/rotina/modelo'

const AGORA = new Date('2026-10-12T12:00:00Z')

function rotinaBase(): RotinaRecorrente {
  let r = rotinaVazia()
  r = definirSono(r, { dormir: '23:00', acordar: '07:00' })
  r = definirTrabalho(r, {
    diasSemana: ['seg', 'ter', 'qua', 'qui', 'sex'],
    horasPadrao: 8,
    limiteExcepcional: 10,
  })
  return r
}

function semanaBase(): { rotina: RotinaRecorrente; semana: PropostaSemanal } {
  const rotina = rotinaBase()
  return { rotina, semana: gerarPropostaSemanal(rotina, AGORA) }
}

describe('gerarInstanciaDiaria', () => {
  it('materializa o dia seguinte a partir da semana confirmada', () => {
    const { rotina, semana } = semanaBase()

    // 2026-10-13 é terça-feira
    const instancia = gerarInstanciaDiaria(semana, rotina, '2026-10-13', 7, AGORA)

    expect(instancia.data).toBe('2026-10-13')
    expect(instancia.diaSemana).toBe('ter')
    expect(instancia.versaoBase).toBe(7)
    expect(instancia.geradaEm).toBe(AGORA.toISOString())
    expect(instancia.confirmadaEm).toBeNull()
    expect(instancia.acordar).toBe('07:00')
    expect(instancia.dormir).toBe('23:00')
    expect(instancia.itens.length).toBeGreaterThan(0)
    expect(instancia.itens.some((s) => s.origem === 'trabalho')).toBe(true)
  })

  it('a instância é independente: copia os itens da semana ativa', () => {
    const { rotina, semana } = semanaBase()

    const instancia = gerarInstanciaDiaria(semana, rotina, '2026-10-13', 3, AGORA)
    instancia.itens[0].titulo = 'Alterado'

    const diaSemana = semana.dias.find((d) => d.diaSemana === 'ter')!
    expect(diaSemana.sugestoes.every((s) => s.titulo !== 'Alterado')).toBe(true)
  })

  it('calcula a saída recomendada em dia presencial', () => {
    let rotina = rotinaBase()
    rotina = definirPresencial(rotina, {
      diasSemana: ['qua'],
      chegadaLimite: '10:00',
      preparacaoMin: 30,
      deslocamentoMin: 40,
    })
    const semana = gerarPropostaSemanal(rotina, AGORA)

    // 2026-10-14 é quarta-feira
    const instancia = gerarInstanciaDiaria(semana, rotina, '2026-10-14', 1, AGORA)

    // saída = 10:00 - 30min - 40min = 08:50
    expect(instancia.saidaRecomendada).toBe('08:50')
  })

  it('saída fica a confirmar quando o dia não é presencial ou faltam dados', () => {
    const { rotina, semana } = semanaBase()

    const instancia = gerarInstanciaDiaria(semana, rotina, '2026-10-13', 1, AGORA)

    expect(instancia.saidaRecomendada).toBeNull()
  })

  it('mantém itens sem horário fora da sequência cronológica', () => {
    let rotina = rotinaBase()
    rotina = definirPresencial(rotina, {
      diasSemana: ['ter'],
      chegadaLimite: null,
      preparacaoMin: 30,
      deslocamentoMin: 40,
    })
    const semana = gerarPropostaSemanal(rotina, AGORA)

    const instancia = gerarInstanciaDiaria(semana, rotina, '2026-10-13', 1, AGORA)

    const semHorario = instancia.itens.filter((s) => s.inicio === null)
    expect(semHorario.length).toBeGreaterThan(0)
    expect(semHorario.every((s) => s.fim === null)).toBe(true)
  })

  it('preserva proteção, origem e explicação dos itens da semana', () => {
    let rotina = rotinaBase()
    rotina = acrescentarCompromisso(rotina, {
      titulo: 'Terapia',
      diaSemana: 'qui',
      inicio: '18:00',
      duracaoMin: 50,
      categoria: 'saude',
      tipo: 'fixo',
    })
    const semana = gerarPropostaSemanal(rotina, AGORA)

    // 2026-10-15 é quinta-feira
    const instancia = gerarInstanciaDiaria(semana, rotina, '2026-10-15', 1, AGORA)
    const terapia = instancia.itens.find((s) => s.titulo === 'Terapia')!

    expect(terapia.protecao).toBe('fixo')
    expect(terapia.origem).toBe('compromisso')
    expect(terapia.explicacao.length).toBeGreaterThan(0)
  })

  it('não inventa itens para dias sem configuração', () => {
    const { rotina, semana } = semanaBase()

    // 2026-10-17 é sábado — sem trabalho configurado
    const instancia = gerarInstanciaDiaria(semana, rotina, '2026-10-17', 1, AGORA)

    expect(instancia.itens.every((s) => s.origem !== 'trabalho')).toBe(true)
  })
})

describe('ajustarItem', () => {
  let instancia: InstanciaDiaria
  let rotina: RotinaRecorrente

  beforeEach(() => {
    rotina = rotinaBase()
    rotina = acrescentarCompromisso(rotina, {
      titulo: 'Terapia',
      diaSemana: 'ter',
      inicio: '18:00',
      duracaoMin: 50,
      categoria: 'saude',
      tipo: 'fixo',
    })
    const semana = gerarPropostaSemanal(rotina, AGORA)
    instancia = gerarInstanciaDiaria(semana, rotina, '2026-10-13', 1, AGORA)
  })

  it('move um item flexível mantendo a duração', () => {
    const trabalho = instancia.itens.find((s) => s.origem === 'trabalho')!
    const duracao = emMinutos(trabalho.fim!) - emMinutos(trabalho.inicio!)

    const ajustada = ajustarItem(instancia, trabalho.id, { inicio: '10:00' })
    const movido = ajustada.itens.find((s) => s.id === trabalho.id)!

    expect(movido.inicio).toBe('10:00')
    expect(emMinutos(movido.fim!) - emMinutos(movido.inicio!)).toBe(duracao)
  })

  it('redimensiona um item flexível mantendo o início', () => {
    const trabalho = instancia.itens.find((s) => s.origem === 'trabalho')!

    const ajustada = ajustarItem(instancia, trabalho.id, { fim: '14:00' })
    const editado = ajustada.itens.find((s) => s.id === trabalho.id)!

    expect(editado.inicio).toBe(trabalho.inicio)
    expect(editado.fim).toBe('14:00')
  })

  it('posiciona um item sem horário quando início e fim são informados', () => {
    const r = definirTrabalho(rotinaVazia(), {
      diasSemana: ['ter'],
      horasPadrao: 8,
      limiteExcepcional: 10,
    })
    const instanciaVazia = gerarInstanciaDiaria(
      gerarPropostaSemanal(r, AGORA),
      r,
      '2026-10-13',
      1,
      AGORA
    )
    const solto = instanciaVazia.itens.find((s) => s.inicio === null)!

    const ajustada = ajustarItem(instanciaVazia, solto.id, { inicio: '09:00', fim: '09:30' })

    const posicionado = ajustada.itens.find((s) => s.id === solto.id)!
    expect(posicionado.inicio).toBe('09:00')
    expect(posicionado.fim).toBe('09:30')
  })

  it('recusa mover item fixo sem confirmação explícita', () => {
    const terapia = instancia.itens.find((s) => s.titulo === 'Terapia')!

    expect(() => ajustarItem(instancia, terapia.id, { inicio: '19:00' })).toThrow(
      ConfirmacaoFixoError
    )
    const movida = ajustarItem(instancia, terapia.id, { inicio: '19:00' }, true)
    expect(movida.itens.find((s) => s.id === terapia.id)!.inicio).toBe('19:00')
  })

  it('rejeita fim anterior ao início', () => {
    const trabalho = instancia.itens.find((s) => s.origem === 'trabalho')!

    expect(() => ajustarItem(instancia, trabalho.id, { fim: '06:00' })).toThrow(SchemaInvalidoError)
  })

  it('não permite ajuste depois da confirmação do dia', () => {
    const trabalho = instancia.itens.find((s) => s.origem === 'trabalho')!
    const confirmada = confirmarDia(instancia, AGORA)

    expect(confirmada.confirmadaEm).toBe(AGORA.toISOString())
    expect(() => ajustarItem(confirmada, trabalho.id, { inicio: '10:00' })).toThrow(
      ItemNaoEncontradoError
    )
  })
})
