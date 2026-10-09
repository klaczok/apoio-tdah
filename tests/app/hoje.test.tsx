import { render, screen } from '@testing-library/react'
import HojePage from '@/app/hoje/page'
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

process.env.PERSISTENCE_DRIVER = 'memory'

function renderizar(params: Record<string, string> = {}) {
  return HojePage({ searchParams: Promise.resolve(params) }).then(render)
}

describe('Área privada', () => {
  it('oferece ação para encerrar a sessão', async () => {
    await renderizar()

    const sair = screen.getByRole('button', { name: /sair/i })
    expect(sair.closest('form')).toHaveAttribute('action', '/api/auth/logout')
    expect(sair.closest('form')).toHaveAttribute('method', 'post')
  })

  it('exibe a anotação persistida do dia', async () => {
    const store = await getStateStore()
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
  const store = await getStateStore()
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
  const store = await getStateStore()
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

    expect(screen.getByText('Consulta')).toBeInTheDocument()
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
    const store = await getStateStore()
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
    const store = await getStateStore()
    const lido = await store.load()
    if (!lido.ok) throw new Error('store indisponível no teste')
    await store.save(estadoVazio(), lido.value.version)

    await renderizar()

    expect(screen.getByText(/nenhum planejamento para hoje/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /planejar amanhã/i })).toBeInTheDocument()
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
    const store = await getStateStore()
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
