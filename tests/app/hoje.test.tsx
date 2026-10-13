import { render, screen } from '@testing-library/react'
import HojePage from '@/app/(area)/hoje/page'
import { getStateStore } from '@/server/persistence'
import { estadoVazio } from '@/server/persistence/estado'
import { gerarInstanciaDiaria } from '@/server/dia/gerar'
import {
  adicionarTarefa,
  concluirRevisao,
  decidirPendencia,
  registrarEstado,
} from '@/server/dia/modelo'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import { confirmarProposta } from '@/server/proposta/modelo'
import { acrescentarCompromisso, definirSono, rotinaVazia } from '@/server/rotina/modelo'
import { dataCivilHoje, diaSemanaDe } from '@/server/tempo'
import type { InstanciaDiaria } from '@/server/dia/modelo'

import { autenticarComo, USUARIO_TESTE } from '../helpers/sessao'

process.env.PERSISTENCE_DRIVER = 'memory'

beforeEach(() => autenticarComo())

function renderizar(params: Record<string, string> = {}) {
  return HojePage({ searchParams: Promise.resolve(params) }).then(render)
}

describe('Área privada', () => {
  // A ação de sair da conta mora no shell da área autenticada — coberta
  // em tests/app/shell.test.tsx.
  it('exibe a anotação persistida do dia', async () => {
    const store = await getStateStore(USUARIO_TESTE)
    const carregado = await store.load()
    if (!carregado.ok) throw new Error('store indisponível no teste')
    await store.save(
      { ...estadoVazio(), notasPorDia: { [dataCivilHoje()]: 'levar documento' } },
      carregado.value.version
    )

    await renderizar()

    expect(screen.getByLabelText(/anotação do dia/i)).toHaveValue('levar documento')
  })

  it('confirma a gravação apenas após a persistência concluir', async () => {
    await renderizar({ salvo: '1' })

    expect(screen.getByRole('status')).toHaveTextContent(/salva/i)
  })

  it('apresenta erro factual quando o armazenamento falha', async () => {
    await renderizar({ erro: 'persistencia' })

    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível salvar/i)
  })
})

async function comDiaHoje() {
  const hoje = dataCivilHoje()
  const store = await getStateStore(USUARIO_TESTE)
  const lido = await store.load()
  if (!lido.ok) throw new Error('store indisponível no teste')
  let rotina = definirSono(rotinaVazia(), { dormir: '23:00', acordar: '07:00' })
  rotina = acrescentarCompromisso(rotina, {
    titulo: 'Consulta',
    diaSemana: diaSemanaDe(hoje),
    inicio: '10:00',
    duracaoMin: 30,
    categoria: 'saude',
    tipo: 'fixo',
  })
  const semana = confirmarProposta(gerarPropostaSemanal(rotina), new Date('2026-10-12T12:00:00Z'))
  const instancia = gerarInstanciaDiaria(semana, rotina, hoje, lido.value.version)
  await store.save(
    { ...estadoVazio(), rotina, semanaAtiva: semana, dias: { [hoje]: instancia } },
    lido.value.version
  )
  return instancia
}

// Persiste a instância do dia — útil após marcar estados ou decisões.
async function salvarDia(dia: InstanciaDiaria) {
  const store = await getStateStore(USUARIO_TESTE)
  const lido = await store.load()
  if (!lido.ok) throw new Error('store indisponível no teste')
  await store.save(
    { ...lido.value.dados, dias: { ...lido.value.dados.dias, [dia.data]: dia } },
    lido.value.version
  )
}

async function comDiaHojePendente() {
  let instancia = await comDiaHoje()
  for (const item of instancia.itens) {
    instancia = registrarEstado(instancia, item.id, 'parcial')
  }
  await salvarDia(instancia)
  return instancia
}

describe('revisão do dia', () => {
  it('lista os itens planejados com os quatro estados factuais', async () => {
    await comDiaHoje()

    await renderizar()

    expect(screen.getAllByText('Consulta').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /registrar estado/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('option', { name: /realizado/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('option', { name: /parcial/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('option', { name: /reprogramado/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('option', { name: /descartado/i }).length).toBeGreaterThan(0)
  })

  it('oferece campos reflexivos opcionais e conclusão sem obrigá-los', async () => {
    await comDiaHoje()

    await renderizar()

    expect(screen.getByLabelText(/energia/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sobrecarga/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/motivo/i)).toBeInTheDocument()
    const concluir = screen.getByRole('button', { name: /concluir revisão/i })
    expect(concluir.closest('form')).toHaveAttribute('action', '/api/dia')
  })

  it('revisão concluída exibe síntese factual e acesso ao planejamento', async () => {
    const instancia = await comDiaHoje()
    const revisado = registrarEstado(instancia, instancia.itens[0].id, 'realizado')
    const concluida = concluirRevisao(revisado, { energia: 'ok' }, new Date('2026-10-13T20:00:00Z'))
    const store = await getStateStore(USUARIO_TESTE)
    const lido = await store.load()
    if (!lido.ok) throw new Error('store indisponível no teste')
    await store.save(
      { ...lido.value.dados, dias: { [dataCivilHoje()]: concluida } },
      lido.value.version
    )

    await renderizar()

    expect(screen.getByText(/síntese do dia/i)).toBeInTheDocument()
    expect(screen.getByText(/1 realizad/)).toBeInTheDocument()
    expect(screen.getAllByText(/sem registro/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /planejar amanhã/i })).toBeInTheDocument()
  })

  it('sem instância do dia, informa factualmente e aponta o planejamento', async () => {
    const store = await getStateStore(USUARIO_TESTE)
    const lido = await store.load()
    if (!lido.ok) throw new Error('store indisponível no teste')
    await store.save(estadoVazio(), lido.value.version)

    await renderizar()

    expect(screen.getByText(/nenhum planejamento para hoje/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /planejar amanhã/i })).toBeInTheDocument()
  })
})

describe('foco diário', () => {
  it('apresenta data no cabeçalho e a linha do dia com estados textuais', async () => {
    const instancia = await comDiaHoje()
    // Uma segunda entrada distante cria a lacuna visível entre blocos.
    const comNoite = adicionarTarefa(
      instancia,
      { titulo: 'Leitura', categoria: 'pessoal', inicio: '21:00', fim: '21:30' },
      new Date()
    )
    await salvarDia(comNoite)

    await renderizar()

    expect(screen.getByText(/seu dia ·/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /linha do dia/i })).toBeInTheDocument()
    expect(screen.getByText(/espaço livre/i)).toBeInTheDocument()
    // Estado textual redundante, sem depender de cor.
    expect(screen.getAllByText(/agora|em seguida|sem registro/i).length).toBeGreaterThan(0)
  })

  it('mostra o foco do momento com leitura factual', async () => {
    const instancia = await comDiaHoje()
    const comDepois = adicionarTarefa(
      instancia,
      { titulo: 'Leitura', categoria: 'pessoal', inicio: '23:30', fim: '23:55' },
      new Date()
    )
    await salvarDia(comDepois)

    await renderizar()

    const foco = screen.getByRole('region', { name: /foco do momento/i })
    expect(foco).toHaveTextContent(/em andamento|próximo passo/i)
  })

  it('destaca até três prioridades do dia', async () => {
    const instancia = await comDiaHoje()
    const comPrioridade = { ...instancia, prioridades: [instancia.itens[0].id] }
    await salvarDia(comPrioridade as InstanciaDiaria)

    await renderizar()

    const secao = screen.getByRole('region', { name: /prioridades do dia/i })
    expect(secao).toHaveTextContent(/consulta/i)
    expect(screen.getAllByText(/prioridade/i).length).toBeGreaterThan(0)
  })

  it('item em andamento exibe progresso temporal factual', async () => {
    const instancia = await comDiaHoje()
    // Força o item a cobrir o horário atual, seja ele qual for.
    const ajustada = {
      ...instancia,
      itens: instancia.itens.map((i, ix) =>
        ix === 0 ? { ...i, inicio: '00:05', fim: '23:59' } : i
      ),
    }
    await salvarDia(ajustada)

    await renderizar()

    const foco = screen.getByRole('region', { name: /foco do momento/i })
    expect(foco).toHaveTextContent(/em andamento/i)
    expect(foco).toHaveTextContent(/do bloco decorrido/i)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
})

describe('destino das pendências', () => {
  it('oferece os destinos para pendências sem pré-seleção', async () => {
    const instancia = await comDiaHojePendente()

    await renderizar()

    const seletor = screen.getAllByLabelText(/destino da pendência/i)[0]
    expect(seletor).toHaveValue('')
    const opcoes = Array.from((seletor as HTMLSelectElement).options).map((o) => o.textContent)
    expect(opcoes).toContain('Manter')
    expect(opcoes).toContain('Reduzir')
    expect(opcoes).toContain('Dividir')
    expect(opcoes).toContain('Descartar')
    // Cada pendência tem sua própria via de troca de dia.
    expect(screen.getAllByRole('button', { name: /trocar de dia/i })).toHaveLength(
      instancia.itens.length
    )
    expect(instancia.itens.length).toBeGreaterThan(0)
  })

  it('esconde destino para item realizado e mostra decisão registrada', async () => {
    const instancia = await comDiaHoje()
    let dia = registrarEstado(instancia, instancia.itens[0].id, 'realizado')
    dia = adicionarTarefa(dia, { titulo: 'Pendência', categoria: 'pessoal' }, new Date())
    dia = registrarEstado(dia, dia.tarefas[0].id, 'reprogramado')
    dia = decidirPendencia(
      dia,
      dia.tarefas[0].id,
      { tipo: 'trocar-dia', destino: '2026-10-14', confirmar: true },
      new Date('2026-10-13T20:00:00Z')
    )
    await salvarDia(dia)

    await renderizar()

    const seletores = screen.queryAllByLabelText(/destino da pendência/i)
    expect(seletores).toHaveLength(0)
    expect(screen.getByText(/trocar de dia para 14\/10\/2026/i)).toBeInTheDocument()
  })

  it('prévia da troca mostra o destino e exige confirmação explícita', async () => {
    const instancia = await comDiaHoje()
    const item = instancia.itens[0]

    await renderizar({ prever: item.id, destino: '2026-10-14' })

    expect(screen.getByText(/destino 14\/10\/2026/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirmo a troca/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirmar troca/i })).toBeInTheDocument()
  })

  it('prévia do destino lista alertas reais quando o item colide lá', async () => {
    const instancia = await comDiaHoje()
    // A Consulta (10:00–10:30) é o item que vai colidir no destino.
    const item = instancia.itens.find((i) => i.inicio === '10:00') ?? instancia.itens[0]
    const destino = '2026-10-14'
    // Um compromisso no mesmo horário do item movido gera sobreposição na
    // prévia — o usuário vê o conflito antes de confirmar a troca.
    const store = await getStateStore(USUARIO_TESTE)
    const lido = await store.load()
    if (!lido.ok) throw new Error('store indisponível no teste')
    let rotina = lido.value.dados.rotina
    rotina = acrescentarCompromisso(rotina, {
      titulo: 'Maratona',
      diaSemana: diaSemanaDe(destino),
      inicio: '10:00',
      duracaoMin: 30,
      categoria: 'trabalho',
      tipo: 'fixo',
    })
    // A instância de destino é gerada de uma proposta que já contém o
    // compromisso novo — a semana do fixture foi confirmada sem ele.
    const semanaDestino = confirmarProposta(
      gerarPropostaSemanal(rotina),
      new Date('2026-10-12T12:00:00Z')
    )
    const instanciaDestino = gerarInstanciaDiaria(
      semanaDestino,
      rotina,
      destino,
      lido.value.version
    )
    await store.save(
      {
        ...lido.value.dados,
        rotina,
        dias: { ...lido.value.dados.dias, [destino]: instanciaDestino },
      },
      lido.value.version
    )

    await renderizar({ prever: item.id, destino })

    expect(screen.getByText(/ocupam o mesmo horário/i)).toBeInTheDocument()
  })
})
