import { avaliarAlertas } from '@/server/dia/alertas'
import { gerarInstanciaDiaria } from '@/server/dia/gerar'
import { ajustarItem, type InstanciaDiaria, type ItemDia } from '@/server/dia/modelo'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import {
  acrescentarCompromisso,
  acrescentarPeriodo,
  definirAlimentacao,
  definirPreferencias,
  definirSono,
  definirTrabalho,
  rotinaVazia,
  type RotinaRecorrente,
} from '@/server/rotina/modelo'

const AGORA = new Date('2026-10-12T12:00:00Z')
const DATA = '2026-10-13'

function rotinaComSono(): RotinaRecorrente {
  return definirSono(rotinaVazia(), { dormir: '23:00', acordar: '07:00' })
}

function instanciaDe(r: RotinaRecorrente): InstanciaDiaria {
  return gerarInstanciaDiaria(gerarPropostaSemanal(r, AGORA), r, DATA, 1, AGORA)
}

function itemFixo(
  id: string,
  titulo: string,
  inicio: string,
  fim: string,
  categoria: ItemDia['categoria'] = 'saude'
): ItemDia {
  return {
    id,
    titulo,
    categoria,
    inicio,
    fim,
    protecao: 'fixo',
    origem: 'compromisso',
    explicacao: 'fixture',
  }
}

function comItens(instancia: InstanciaDiaria, itens: ItemDia[]): InstanciaDiaria {
  return { ...instancia, itens }
}

describe('alertas de conflito e capacidade', () => {
  it('sem problemas, devolve lista vazia', () => {
    const r = definirTrabalho(rotinaComSono(), {
      diasSemana: ['ter'],
      horasPadrao: 8,
      limiteExcepcional: 10,
    })
    expect(avaliarAlertas(instanciaDe(r), r)).toEqual([])
  })

  it('descreve sobreposição de horário entre dois itens', () => {
    const instancia = comItens(instanciaDe(rotinaComSono()), [
      itemFixo('a', 'Terapia', '09:00', '10:00'),
      itemFixo('b', 'Consulta', '09:30', '10:30'),
    ])

    const alertas = avaliarAlertas(instancia, rotinaComSono())

    expect(alertas).toHaveLength(1)
    expect(alertas[0].tipo).toBe('sobreposicao')
    expect(alertas[0].mensagem).toContain('Terapia')
    expect(alertas[0].mensagem).toContain('Consulta')
    expect(alertas[0].mensagem).toContain('09:00')
    expect(alertas[0].mensagem).toContain('09:30')
  })

  it('alerta quando a margem de transição configurada não couber', () => {
    const r = definirPreferencias(rotinaComSono(), { transicaoMin: 15, preferenciaCarga: null })
    const instancia = comItens(instanciaDe(r), [
      itemFixo('a', 'Reunião', '09:00', '10:00'),
      itemFixo('b', 'Terapia', '10:05', '11:00'),
    ])

    const alertas = avaliarAlertas(instancia, r)

    const margem = alertas.find((a) => a.tipo === 'margem')
    expect(margem).toBeDefined()
    expect(margem!.mensagem).toContain('Reunião')
    expect(margem!.mensagem).toContain('Terapia')
    expect(margem!.mensagem).toContain('15')
  })

  it('não alerta margem quando a folga respeita o configurado', () => {
    const r = definirPreferencias(rotinaComSono(), { transicaoMin: 15, preferenciaCarga: null })
    const instancia = comItens(instanciaDe(r), [
      itemFixo('a', 'Reunião', '09:00', '10:00'),
      itemFixo('b', 'Terapia', '10:15', '11:00'),
    ])

    expect(avaliarAlertas(instancia, r).filter((a) => a.tipo === 'margem')).toEqual([])
  })

  it('sinaliza carga acima da janela do dia', () => {
    const r = rotinaComSono()
    const instancia = comItens(instanciaDe(r), [
      itemFixo('a', 'Plantão', '07:00', '20:00', 'trabalho'),
      itemFixo('b', 'Cuidado', '20:00', '23:30', 'familia'),
    ])

    const alertas = avaliarAlertas(instancia, r)

    const capacidade = alertas.find((a) => a.tipo === 'capacidade')
    expect(capacidade).toBeDefined()
    expect(capacidade!.mensagem).toMatch(/16h30/)
    expect(capacidade!.mensagem).toMatch(/16h/)
  })

  it('compara a carga com a preferência configurada', () => {
    const r = definirPreferencias(rotinaComSono(), { transicaoMin: null, preferenciaCarga: 'leve' })
    const instancia = comItens(instanciaDe(r), [
      itemFixo('a', 'Plantão', '07:00', '14:00', 'trabalho'),
      itemFixo('b', 'Curso', '15:00', '17:00', 'estudo'),
    ])

    const alertas = avaliarAlertas(instancia, r)

    const capacidade = alertas.find((a) => a.tipo === 'capacidade')
    expect(capacidade).toBeDefined()
    expect(capacidade!.mensagem).toContain('leve')
  })

  it('horas de trabalho excluem saúde, família, alimentação e descanso', () => {
    const r = definirTrabalho(rotinaComSono(), {
      diasSemana: ['ter'],
      horasPadrao: 8,
      limiteExcepcional: 10,
    })
    const instancia = comItens(instanciaDe(r), [
      itemFixo('a', 'Trabalho', '07:00', '14:00', 'trabalho'),
      itemFixo('b', 'Terapia', '15:00', '16:00', 'saude'),
      itemFixo('c', 'Almoço', '12:00', '13:00', 'alimentacao'),
      itemFixo('d', 'Cuidado', '17:00', '20:00', 'familia'),
      itemFixo('e', 'Descanso', '20:00', '22:00', 'descanso'),
      itemFixo('f', 'Deslocamento', '14:00', '15:00', 'pessoal'),
    ])

    const alertas = avaliarAlertas(instancia, r)

    // 7h de trabalho — sem alerta de jornada mesmo com 13h de itens somados.
    expect(alertas.filter((a) => a.tipo === 'jornada')).toEqual([])
  })

  it('sinaliza aproximação da referência de trabalho', () => {
    const r = definirTrabalho(rotinaComSono(), {
      diasSemana: ['ter'],
      horasPadrao: 8,
      limiteExcepcional: 10,
    })
    const instancia = comItens(instanciaDe(r), [
      itemFixo('a', 'Trabalho', '07:00', '14:30', 'trabalho'),
    ])

    const jornada = avaliarAlertas(instancia, r).find((a) => a.tipo === 'jornada')
    expect(jornada).toBeDefined()
    expect(jornada!.mensagem).toMatch(/7h30/)
    expect(jornada!.mensagem).toMatch(/8h/)
  })

  it('sinaliza ultrapassagem da referência e do limite excepcional', () => {
    const r = definirTrabalho(rotinaComSono(), {
      diasSemana: ['ter'],
      horasPadrao: 8,
      limiteExcepcional: 10,
    })
    const acimaPadrao = avaliarAlertas(
      comItens(instanciaDe(r), [itemFixo('a', 'Trabalho', '07:00', '15:30', 'trabalho')]),
      r
    )
    const acimaLimite = avaliarAlertas(
      comItens(instanciaDe(r), [itemFixo('a', 'Trabalho', '07:00', '18:00', 'trabalho')]),
      r
    )

    expect(acimaPadrao.find((a) => a.tipo === 'jornada')!.mensagem).toMatch(
      /ultrapassa a referência/i
    )
    expect(acimaLimite.find((a) => a.tipo === 'jornada')!.mensagem).toMatch(/limite excepcional/i)
  })

  it('alertas são dados — validação e persistência continuam separadas', () => {
    const r = rotinaComSono()
    const instancia = comItens(instanciaDe(r), [
      itemFixo('a', 'A', '09:00', '10:00'),
      itemFixo('b', 'B', '09:30', '10:30'),
    ])

    const alertas = avaliarAlertas(instancia, r)

    expect(Array.isArray(alertas)).toBe(true)
    expect(alertas[0]).toMatchObject({ tipo: expect.any(String), mensagem: expect.any(String) })
  })
})
