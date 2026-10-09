import { render, screen } from '@testing-library/react'
import HistoricoPage from '@/app/historico/page'
import HistoricoDiaPage from '@/app/historico/[data]/page'
import { getStateStore } from '@/server/persistence'
import { estadoVazio } from '@/server/persistence/estado'
import { gerarInstanciaDiaria } from '@/server/dia/gerar'
import {
  concluirRevisao,
  corrigirEstadoRevisao,
  decidirPendencia,
  registrarEstado,
  type InstanciaDiaria,
} from '@/server/dia/modelo'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import { confirmarProposta } from '@/server/proposta/modelo'
import {
  acrescentarCompromisso,
  definirSono,
  definirTrabalho,
  rotinaVazia,
} from '@/server/rotina/modelo'
import { dataCivilHoje, dataCivilParaTexto, diaSemanaDe, somarDiasCivil } from '@/server/tempo'

process.env.PERSISTENCE_DRIVER = 'memory'

function renderizarLista(params: Record<string, string> = {}) {
  return HistoricoPage({ searchParams: Promise.resolve(params) }).then(render)
}

function renderizarDia(data: string, params: Record<string, string> = {}) {
  return HistoricoDiaPage({
    params: Promise.resolve({ data }),
    searchParams: Promise.resolve(params),
  }).then(render)
}

const AGORA = new Date('2026-10-12T12:00:00Z')

// Dia passado persistido com revisão concluída — como um histórico real.
async function comHistorico() {
  const ontem = somarDiasCivil(dataCivilHoje(), -1)
  const store = await getStateStore()
  const lido = await store.load()
  if (!lido.ok) throw new Error('store indisponível no teste')
  const diaSemana = diaSemanaDe(ontem)
  let rotina = definirSono(rotinaVazia(), { dormir: '23:00', acordar: '07:00' })
  rotina = definirTrabalho(rotina, {
    diasSemana: [diaSemana],
    horasPadrao: 8,
    limiteExcepcional: 10,
  })
  rotina = acrescentarCompromisso(rotina, {
    titulo: 'Consulta',
    diaSemana,
    inicio: '10:00',
    duracaoMin: 30,
    categoria: 'saude',
    tipo: 'fixo',
  })
  const semana = confirmarProposta(gerarPropostaSemanal(rotina), AGORA)
  let instancia = gerarInstanciaDiaria(semana, rotina, ontem, lido.value.version)
  const consulta = instancia.itens.find((i) => i.titulo === 'Consulta')!
  instancia = registrarEstado(instancia, consulta.id, 'realizado')
  const restantes = instancia.itens.filter((i) => i.id !== consulta.id)
  if (!restantes[0]) throw new Error('fixture precisa de item além da Consulta')
  instancia = registrarEstado(instancia, restantes[0].id, 'reprogramado')
  // Decisão registrada antes da conclusão — o fluxo real é esse.
  instancia = decidirPendencia(instancia, restantes[0].id, { tipo: 'manter' }, AGORA)
  instancia = concluirRevisao(instancia, { energia: 'ok' }, AGORA)
  await store.save(
    { ...estadoVazio(), rotina, semanaAtiva: semana, dias: { [ontem]: instancia } },
    lido.value.version
  )
  return { ontem, instancia }
}

describe('histórico', () => {
  it('lista apenas dias anteriores com instância persistida', async () => {
    const { ontem } = await comHistorico()

    await renderizarLista()

    expect(screen.getByRole('heading', { level: 1, name: 'Histórico' })).toBeInTheDocument()
    const link = screen.getByRole('link', { name: new RegExp(dataCivilParaTexto(ontem)) })
    expect(link).toHaveAttribute('href', `/historico/${ontem}`)
    // Hoje não entra no histórico.
    expect(
      screen.queryByRole('link', { name: new RegExp(dataCivilParaTexto(dataCivilHoje())) })
    ).not.toBeInTheDocument()
  })

  it('não materializa dias nem altera dados ao navegar', async () => {
    const { ontem } = await comHistorico()
    const antes = await getStateStore().then((s) => s.load())

    await renderizarLista()
    await renderizarDia(ontem)

    const depois = await getStateStore().then((s) => s.load())
    if (!antes.ok || !depois.ok) throw new Error('store indisponível no teste')
    expect(depois.value.dados).toEqual(antes.value.dados)
  })

  it('dia sem instância informa factualmente', async () => {
    await comHistorico()
    const vazio = somarDiasCivil(dataCivilHoje(), -30)

    await renderizarDia(vazio)

    expect(screen.getAllByText(/sem registro|não há/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /voltar/i })).toBeInTheDocument()
  })
})

describe('dia histórico', () => {
  it('mostra plano, estados, decisões e síntese persistidos', async () => {
    const { ontem, instancia } = await comHistorico()
    const reprogramado = instancia.itens.find(
      (i) => instancia.revisao.estados[i.id] === 'reprogramado'
    )

    await renderizarDia(ontem)

    expect(screen.getAllByText(/Consulta/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/realizado/i).length).toBeGreaterThan(0)
    expect(reprogramado).toBeDefined()
    expect(screen.getAllByText(/reprogramado/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/manter/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/síntese/i)).toBeInTheDocument()
  })

  it('revisão concluída oferece correção com confirmação explícita', async () => {
    const { ontem } = await comHistorico()

    await renderizarDia(ontem)

    const corrigir = screen.getAllByRole('button', { name: /corrigir estado/i })[0]
    const form = corrigir.closest('form')!
    expect(form.querySelector('input[name="acao"]')).toHaveValue('revisao-corrigir')
    expect(form.querySelector('input[name="confirmar"]')).not.toBeNull()
    expect(form.querySelector('input[name="volta"]')).toHaveValue('historico')
    expect(form.querySelector('input[name="data"]')).toHaveValue(ontem)
  })

  it('correções registradas aparecem com anterior e corrigido', async () => {
    const { ontem, instancia } = await comHistorico()
    const id = instancia.itens[0].id
    const anterior = instancia.revisao.estados[id] ?? null
    const corrigida = corrigirEstadoRevisao(instancia, id, 'descartado', true, AGORA)
    const store = await getStateStore()
    const lido = await store.load()
    if (!lido.ok) throw new Error('store indisponível no teste')
    await store.save({ ...lido.value.dados, dias: { [ontem]: corrigida } }, lido.value.version)

    await renderizarDia(ontem)

    expect(screen.getByText(/correções/i)).toBeInTheDocument()
    expect(
      screen.getByText(new RegExp(`de ${anterior ?? 'sem registro'}.*descartado`, 'i'))
    ).toBeInTheDocument()
  })

  it('sem julgamento moral ou pontuação', async () => {
    const { ontem } = await comHistorico()

    const lista = await renderizarLista()
    expect(lista.container.textContent).not.toMatch(/pontos|ranking|streak|parabéns|falhou/i)
    const detalhe = await renderizarDia(ontem)
    expect(detalhe.container.textContent).not.toMatch(/pontos|ranking|streak|parabéns|falhou/i)
  })
})
