import { gerarInstanciaDiaria } from '@/server/dia/gerar'
import {
  adicionarTarefa,
  concluirRevisao,
  registrarEstado,
  type InstanciaDiaria,
} from '@/server/dia/modelo'
import { diasDaSemana, resumoSemana } from '@/server/dia/semana'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import {
  acrescentarCompromisso,
  definirSono,
  definirTrabalho,
  rotinaVazia,
} from '@/server/rotina/modelo'

const AGORA = new Date('2026-10-12T12:00:00Z')

function rotinaBase() {
  let r = definirSono(rotinaVazia(), { dormir: '23:00', acordar: '07:00' })
  r = definirTrabalho(r, { diasSemana: ['seg', 'ter'], horasPadrao: 8, limiteExcepcional: 10 })
  r = acrescentarCompromisso(r, {
    titulo: 'Consulta',
    diaSemana: 'ter',
    inicio: '10:00',
    duracaoMin: 30,
    categoria: 'saude',
    tipo: 'fixo',
  })
  return r
}

function instancia(data: string) {
  const r = rotinaBase()
  return gerarInstanciaDiaria(gerarPropostaSemanal(r, AGORA), r, data, 1, AGORA)
}

describe('diasDaSemana', () => {
  it('devolve os sete dias de segunda a domingo que contêm a data', () => {
    expect(diasDaSemana('2026-10-14')).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ])
    // Domingo fecha a semana que começou na segunda anterior.
    expect(diasDaSemana('2026-10-18')[0]).toBe('2026-10-12')
    expect(diasDaSemana('2026-10-12')[0]).toBe('2026-10-12')
    // Virada de ano: a quinta 31/12 pertence à semana que abre em 28/12.
    expect(diasDaSemana('2026-12-31')).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ])
  })
})

describe('resumoSemana', () => {
  it('agrega carga planejada por categoria só onde há minutos', () => {
    const resumo = resumoSemana(
      [
        { data: '2026-10-13', instancia: instancia('2026-10-13') },
        { data: '2026-10-14', instancia: null },
      ],
      rotinaBase()
    )

    const ter = resumo.dias[0]
    expect(ter.minutosPorCategoria.saude).toBe(30)
    expect(ter.minutosPorCategoria.trabalho).toBeGreaterThan(0)
    expect(ter.minutosPorCategoria.musica).toBeUndefined()
    expect(resumo.dias[1].instancia).toBeNull()
  })

  it('mantém trabalho planejado e registrado separados', () => {
    const base = instancia('2026-10-13')
    const trabalho = base.itens.find((i) => i.categoria === 'trabalho')!
    const saude = base.itens.find((i) => i.categoria === 'saude')!

    const dia = registrarEstado(
      registrarEstado(base, trabalho.id, 'realizado'),
      saude.id,
      'parcial'
    )
    const resumo = resumoSemana([{ data: '2026-10-13', instancia: dia }], rotinaBase())

    expect(resumo.dias[0].trabalhoPlanejadoMin).toBeGreaterThan(0)
    expect(resumo.dias[0].trabalhoRealizadoMin).toBe(resumo.dias[0].trabalhoPlanejadoMin)
    // Parcial não conta como registrado.
    expect(resumo.dias[0].minutosRealizadosPorCategoria.saude).toBeUndefined()
  })

  it('lista pendências sem decisão e reprogramados sem julgamento', () => {
    const base = instancia('2026-10-13')
    const saude = base.itens.find((i) => i.categoria === 'saude')!
    const trabalho = base.itens.find((i) => i.categoria === 'trabalho')!

    let dia = registrarEstado(base, saude.id, 'reprogramado')
    dia = registrarEstado(dia, trabalho.id, 'realizado')
    const resumo = resumoSemana([{ data: '2026-10-13', instancia: dia }], rotinaBase())

    const d = resumo.dias[0]
    const pendente = d.pendencias.find((p) => p.id === saude.id)
    expect(pendente?.estado).toBe('reprogramado')
    expect(pendente?.titulo).toBe('Consulta')
    expect(d.pendencias.some((p) => p.id === trabalho.id)).toBe(false)
  })

  it('pendência com decisão registrada sai da lista de a decidir', () => {
    const base = instancia('2026-10-13')
    const saude = base.itens.find((i) => i.categoria === 'saude')!
    let dia = registrarEstado(base, saude.id, 'reprogramado')
    dia = {
      ...dia,
      revisao: {
        ...dia.revisao,
        decisoes: {
          [saude.id]: {
            tipo: 'manter',
            destino: null,
            escopo: null,
            partes: [],
            registradaEm: AGORA.toISOString(),
          },
        },
      },
    }
    const resumo = resumoSemana([{ data: '2026-10-13', instancia: dia }], rotinaBase())
    expect(resumo.dias[0].pendencias).toHaveLength(0)
  })

  it('troca de dia não materializada no destino continua pendência', () => {
    const base = instancia('2026-10-13')
    const saude = base.itens.find((i) => i.categoria === 'saude')!
    let dia = registrarEstado(base, saude.id, 'reprogramado')
    dia = {
      ...dia,
      revisao: {
        ...dia.revisao,
        decisoes: {
          [saude.id]: {
            tipo: 'trocar-dia',
            destino: '2026-10-14',
            escopo: null,
            partes: [],
            registradaEm: AGORA.toISOString(),
          },
        },
      },
    }

    // O destino existe mas a tarefa nunca chegou — falha de gravação.
    const resumo = resumoSemana(
      [
        { data: '2026-10-13', instancia: dia },
        { data: '2026-10-14', instancia: instancia('2026-10-14') },
      ],
      rotinaBase()
    )
    const pendencia = resumo.dias[0].pendencias.find((p) => p.id === saude.id)
    expect(pendencia?.naoChegou).toBe(true)

    // Com a tarefa materializada no destino, a pendência está resolvida.
    const chegou = {
      ...instancia('2026-10-14'),
      tarefas: [
        ...instancia('2026-10-14').tarefas,
        {
          id: 't1',
          titulo: saude.titulo,
          categoria: saude.categoria,
          inicio: saude.inicio,
          fim: saude.fim,
          nota: null,
          origemId: saude.id,
          criadaEm: AGORA.toISOString(),
        },
      ],
    }
    const resolvido = resumoSemana(
      [
        { data: '2026-10-13', instancia: dia },
        { data: '2026-10-14', instancia: chegou },
      ],
      rotinaBase()
    )
    expect(resolvido.dias[0].pendencias).toHaveLength(0)
  })

  it('agrega alertas e totaliza a semana sem pontuação', () => {
    const dia = instancia('2026-10-13')
    const resumo = resumoSemana([{ data: '2026-10-13', instancia: dia }], rotinaBase())

    expect(resumo.dias[0].alertas.length).toBeGreaterThanOrEqual(0)
    expect(resumo.totaisPorCategoria.trabalho).toBe(resumo.dias[0].minutosPorCategoria.trabalho)
    // O resumo não carrega score nem avaliação — só números factuais.
    expect(resumo).not.toHaveProperty('pontos')
    expect(resumo).not.toHaveProperty('nota')
  })

  it('instância nula entra como dia sem planejamento', () => {
    const resumo = resumoSemana(
      [
        { data: '2026-10-13', instancia: null },
        { data: '2026-10-14', instancia: instancia('2026-10-13') },
      ],
      rotinaBase()
    )
    expect(resumo.dias[0].instancia).toBeNull()
    expect(resumo.dias[1].instancia).not.toBeNull()
  })
})
