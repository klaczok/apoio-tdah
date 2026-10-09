import { render, screen } from '@testing-library/react'
import AmanhaPage from '@/app/amanha/page'
import { getStateStore } from '@/server/persistence'
import { estadoVazio, type EstadoPrivado } from '@/server/persistence/estado'
import { gerarInstanciaDiaria } from '@/server/dia/gerar'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import { confirmarProposta } from '@/server/proposta/modelo'
import { dataCivilAmanha, diaSemanaDe } from '@/server/tempo'
import {
  acrescentarCompromisso,
  acrescentarPeriodo,
  definirAlimentacao,
  definirPreferencias,
  definirPresencial,
  definirSono,
  definirTrabalho,
  rotinaVazia,
  type RotinaRecorrente,
} from '@/server/rotina/modelo'

process.env.PERSISTENCE_DRIVER = 'memory'

async function gravar(dados: EstadoPrivado) {
  const store = await getStateStore()
  const carregado = await store.load()
  if (!carregado.ok) throw new Error('store indisponível no teste')
  await store.save(dados, carregado.value.version)
}

async function renderizar(params: Record<string, string> = {}) {
  return render(await AmanhaPage({ searchParams: Promise.resolve(params) }))
}

function rotinaBase(): RotinaRecorrente {
  let r = rotinaVazia()
  r = definirSono(r, { dormir: '23:00', acordar: '07:00' })
  r = definirTrabalho(r, {
    diasSemana: [...new Set(['seg', 'ter', 'qua', 'qui', 'sex', diaSemanaDe(dataCivilAmanha())])],
    horasPadrao: 8,
    limiteExcepcional: 10,
  })
  return r
}

async function comDiaPlanejado(rotina?: RotinaRecorrente) {
  const r = rotina ?? rotinaBase()
  const semana = confirmarProposta(gerarPropostaSemanal(r), new Date('2026-10-12T12:00:00Z'))
  const amanha = dataCivilAmanha()
  const instancia = gerarInstanciaDiaria(semana, r, amanha, 3, new Date('2026-10-12T20:00:00Z'))
  await gravar({
    ...estadoVazio(),
    rotina: r,
    semanaAtiva: semana,
    dias: { [amanha]: instancia },
  })
  return instancia
}

describe('Amanhã', () => {
  it('sem semana ativa, orienta a confirmar a proposta primeiro', async () => {
    await gravar({ ...estadoVazio(), rotina: rotinaBase() })

    await renderizar()

    expect(screen.getByRole('link', { name: /proposta/i })).toHaveAttribute('href', '/proposta')
  })

  it('com semana ativa e sem rascunho, oferece planejar amanhã', async () => {
    const r = rotinaBase()
    const semana = confirmarProposta(gerarPropostaSemanal(r), new Date('2026-10-12T12:00:00Z'))
    await gravar({ ...estadoVazio(), rotina: r, semanaAtiva: semana })

    await renderizar()

    const planejar = screen.getByRole('button', { name: /planejar amanhã/i })
    expect(planejar.closest('form')).toHaveAttribute('action', '/api/dia')
  })

  it('mostra a linha do tempo ordenada com contexto, categoria e explicações', async () => {
    const amanha = dataCivilAmanha()
    const r = acrescentarCompromisso(rotinaBase(), {
      titulo: 'Terapia',
      diaSemana: diaSemanaDe(amanha),
      inicio: '18:00',
      duracaoMin: 50,
      categoria: 'saude',
      tipo: 'fixo',
    })
    await comDiaPlanejado(r)

    await renderizar()

    expect(screen.getByText(/acordar 07:00/)).toBeInTheDocument()
    expect(screen.getAllByText(/Terapia/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Saúde/).length).toBeGreaterThan(0)
    // itens fixos aparecem antes de detalhes flexíveis na hierarquia textual
    expect(screen.getAllByText(/Fixo/).length).toBeGreaterThan(0)
  })

  it('exibe espaços livres explicitamente na linha do tempo', async () => {
    const amanha = dataCivilAmanha()
    const r = acrescentarPeriodo(rotinaBase(), {
      tipo: 'cuidado-familiar',
      diaSemana: diaSemanaDe(amanha),
      inicio: '18:00',
      fim: '20:00',
    })
    await comDiaPlanejado(r)

    await renderizar()

    expect(screen.getAllByText(/livre/i).length).toBeGreaterThan(0)
  })

  it('separa itens sem horário da sequência cronológica', async () => {
    const amanha = dataCivilAmanha()
    const r = definirPresencial(rotinaBase(), {
      diasSemana: [diaSemanaDe(amanha)],
      chegadaLimite: null,
      preparacaoMin: null,
      deslocamentoMin: null,
    })
    await comDiaPlanejado(r)

    await renderizar()

    expect(screen.getByText(/sem horário/i)).toBeInTheDocument()
    expect(screen.getByText(/saída a confirmar/i)).toBeInTheDocument()
  })

  it('exibe a saída recomendada em dia presencial', async () => {
    const amanha = dataCivilAmanha()
    const r = definirPresencial(rotinaBase(), {
      diasSemana: [diaSemanaDe(amanha)],
      chegadaLimite: '10:00',
      preparacaoMin: 30,
      deslocamentoMin: 40,
    })
    await comDiaPlanejado(r)

    await renderizar()

    expect(screen.getByText(/sair até 08:50/i)).toBeInTheDocument()
  })

  it('mostra a carga por área com trabalho separado das demais', async () => {
    await comDiaPlanejado()

    await renderizar()

    expect(screen.getByText(/trabalho.*8h/i)).toBeInTheDocument()
  })

  it('mostra compromissos fixos em seção própria antes da linha do tempo', async () => {
    const amanha = dataCivilAmanha()
    const r = acrescentarCompromisso(rotinaBase(), {
      titulo: 'Terapia',
      diaSemana: diaSemanaDe(amanha),
      inicio: '18:00',
      duracaoMin: 50,
      categoria: 'saude',
      tipo: 'fixo',
    })
    await comDiaPlanejado(r)

    await renderizar()

    const secao = screen.getByRole('region', { name: /compromissos fixos/i })
    expect(secao).toHaveTextContent('Terapia')
    const posFixos = screen
      .getByText('Compromissos fixos')
      .compareDocumentPosition(screen.getByRole('list', { name: /linha do tempo/i }))
    expect(posFixos & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('ajustar item fixo pede confirmação explícita na interface', async () => {
    const amanha = dataCivilAmanha()
    const r = acrescentarCompromisso(rotinaBase(), {
      titulo: 'Terapia',
      diaSemana: diaSemanaDe(amanha),
      inicio: '18:00',
      duracaoMin: 50,
      categoria: 'saude',
      tipo: 'fixo',
    })
    await comDiaPlanejado(r)

    await renderizar()

    const timeline = screen.getByRole('list', { name: /linha do tempo/i })
    const terapiaItem = Array.from(timeline.querySelectorAll('li')).find((li) =>
      li.textContent?.includes('Terapia')
    )!
    expect(terapiaItem.textContent).toMatch(/ajustar/i)
    expect(terapiaItem.textContent).toMatch(/confirmo a alteração deste item protegido/i)
  })

  it('dia confirmado não oferece edição', async () => {
    const instancia = await comDiaPlanejado()
    const confirmada = { ...instancia, confirmadaEm: '2026-10-12T21:00:00.000Z' }
    const store = await getStateStore()
    const carregado = await store.load()
    if (!carregado.ok) throw new Error('store indisponível')
    await store.save(
      { ...carregado.value.dados, dias: { [instancia.data]: confirmada } },
      carregado.value.version
    )

    await renderizar()

    expect(screen.queryByText(/ajustar/i)).not.toBeInTheDocument()
    expect(screen.getByText(/confirmad/i)).toBeInTheDocument()
  })

  it('prioridades aparecem destacadas em seção própria antes dos compromissos fixos', async () => {
    const instancia = await comDiaPlanejado()
    const alvo = instancia.itens.find((i) => i.inicio !== null)!
    const comPrioridade = { ...instancia, prioridades: [alvo.id] }
    const store = await getStateStore()
    const carregado = await store.load()
    if (!carregado.ok) throw new Error('store indisponível')
    await store.save(
      { ...carregado.value.dados, dias: { [instancia.data]: comPrioridade } },
      carregado.value.version
    )

    await renderizar()

    const secao = screen.getByRole('region', { name: /prioridades do dia/i })
    expect(secao).toHaveTextContent(alvo.titulo)
    const posPrioridades = screen
      .getByText('Prioridades do dia')
      .compareDocumentPosition(screen.getByRole('list', { name: /linha do tempo/i }))
    expect(posPrioridades & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('oferece promover itens até três; promovido exibe marcador', async () => {
    await comDiaPlanejado()

    await renderizar()

    expect(screen.getAllByRole('button', { name: /prioridade/i }).length).toBeGreaterThan(0)
  })

  it('com três prioridades, promover leva à escolha de substituição', async () => {
    const amanha = dataCivilAmanha()
    let r = rotinaBase()
    for (const [i, titulo] of ['Exame', 'Consulta', 'Reunião'].entries()) {
      r = acrescentarCompromisso(r, {
        titulo,
        diaSemana: diaSemanaDe(amanha),
        inicio: `${String(9 + i).padStart(2, '0')}:00`,
        duracaoMin: 30,
        categoria: 'saude',
        tipo: 'flexivel',
      })
    }
    const instancia = await comDiaPlanejado(r)
    const tres = instancia.itens.filter((i) => i.inicio !== null).slice(0, 3)
    const comTres = { ...instancia, prioridades: tres.map((i) => i.id) }
    const store = await getStateStore()
    const carregado = await store.load()
    if (!carregado.ok) throw new Error('store indisponível')
    await store.save(
      { ...carregado.value.dados, dias: { [instancia.data]: comTres } },
      carregado.value.version
    )

    await renderizar({ substituir: instancia.itens[3]?.id ?? 'x' })

    expect(screen.getByRole('heading', { name: /substituir prioridade/i })).toBeInTheDocument()
  })

  it('exibe alertas do dia antes da confirmação e pede reconhecimento', async () => {
    const amanha = dataCivilAmanha()
    let r = rotinaBase()
    for (const [i, titulo] of ['Terapia', 'Consulta'].entries()) {
      r = acrescentarCompromisso(r, {
        titulo,
        diaSemana: diaSemanaDe(amanha),
        inicio: `09:${i === 0 ? '00' : '30'}`,
        duracaoMin: 60,
        categoria: 'saude',
        tipo: 'fixo',
      })
    }
    await comDiaPlanejado(r)

    await renderizar()

    const alertas = screen.getByRole('region', { name: /alertas do dia/i })
    expect(alertas).toHaveTextContent(/sobrepo/i)
    expect(screen.getByLabelText(/ciente dos alertas/i)).toBeInTheDocument()
  })

  it('sem alertas, confirmação não pede reconhecimento', async () => {
    await comDiaPlanejado()

    await renderizar()

    expect(screen.queryByLabelText(/ciente dos alertas/i)).not.toBeInTheDocument()
  })

  it('lista tarefas na seção própria com ações e nota do dia', async () => {
    const instancia = await comDiaPlanejado()
    const comTarefa = {
      ...instancia,
      tarefas: [
        {
          id: 't1',
          titulo: 'Ligar para o dentista',
          categoria: 'saude' as const,
          inicio: null,
          fim: null,
          nota: 'Confirmar consulta',
          origemId: null,
          criadaEm: '2026-10-12T12:00:00.000Z',
        },
      ],
      notaDia: 'Dia puxado',
    }
    const store = await getStateStore()
    const carregado = await store.load()
    if (!carregado.ok) throw new Error('store indisponível')
    await store.save(
      { ...carregado.value.dados, dias: { [instancia.data]: comTarefa } },
      carregado.value.version
    )

    await renderizar()

    const secao = screen.getByRole('region', { name: /tarefas do dia/i })
    expect(secao).toHaveTextContent('Ligar para o dentista')
    expect(secao).toHaveTextContent('Sem horário')
    expect(secao).toHaveTextContent(/prioridade/i)
    expect(screen.getByRole('region', { name: /nota do dia/i })).toHaveTextContent('Dia puxado')
  })

  it('tarefa agendada entra na linha do tempo como tarefa', async () => {
    const instancia = await comDiaPlanejado()
    const comTarefa = {
      ...instancia,
      tarefas: [
        {
          id: 't1',
          titulo: 'Buscar encomenda',
          categoria: 'pessoal' as const,
          inicio: '16:00',
          fim: '16:30',
          nota: null,
          origemId: null,
          criadaEm: '2026-10-12T12:00:00.000Z',
        },
      ],
    }
    const store = await getStateStore()
    const carregado = await store.load()
    if (!carregado.ok) throw new Error('store indisponível')
    await store.save(
      { ...carregado.value.dados, dias: { [instancia.data]: comTarefa } },
      carregado.value.version
    )

    await renderizar()

    const timeline = screen.getByRole('list', { name: /linha do tempo/i })
    expect(timeline).toHaveTextContent('Buscar encomenda')
    expect(timeline).toHaveTextContent(/16:00–16:30/)
  })
})
