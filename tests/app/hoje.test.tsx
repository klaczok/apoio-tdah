import { render, screen } from '@testing-library/react'
import HojePage from '@/app/hoje/page'
import { getStateStore } from '@/server/persistence'
import { estadoVazio } from '@/server/persistence/estado'
import { gerarInstanciaDiaria } from '@/server/dia/gerar'
import { concluirRevisao, registrarEstado } from '@/server/dia/modelo'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import { confirmarProposta } from '@/server/proposta/modelo'
import { acrescentarCompromisso, definirSono, rotinaVazia } from '@/server/rotina/modelo'
import { dataCivilHoje, diaSemanaDe } from '@/server/tempo'

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

describe('revisão do dia', () => {
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
