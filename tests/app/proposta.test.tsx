import { render, screen } from '@testing-library/react'
import PropostaPage from '@/app/proposta/page'
import HojePage from '@/app/hoje/page'
import { getStateStore } from '@/server/persistence'
import { estadoVazio, type EstadoPrivado } from '@/server/persistence/estado'
import {
  acrescentarCompromisso,
  definirSono,
  definirTrabalho,
  rotinaVazia,
} from '@/server/rotina/modelo'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'

process.env.PERSISTENCE_DRIVER = 'memory'

async function gravar(dados: EstadoPrivado) {
  const store = await getStateStore()
  const carregado = await store.load()
  if (!carregado.ok) throw new Error('store indisponível no teste')
  await store.save(dados, carregado.value.version)
}

function rotinaBase() {
  let r = definirSono(rotinaVazia(), { dormir: '23:00', acordar: '07:00' })
  r = definirTrabalho(r, {
    diasSemana: ['seg', 'ter', 'qua', 'qui', 'sex'],
    horasPadrao: 8,
    limiteExcepcional: 10,
  })
  r = acrescentarCompromisso(r, {
    titulo: 'Terapia',
    diaSemana: 'qui',
    inicio: '18:00',
    duracaoMin: 50,
    categoria: 'saude',
    tipo: 'fixo',
  })
  return r
}

async function renderizar(params: Record<string, string> = {}) {
  return render(await PropostaPage({ searchParams: Promise.resolve(params) }))
}

describe('Proposta semanal', () => {
  it('sem rascunho, oferece gerar a proposta a partir da configuração', async () => {
    await gravar({ ...estadoVazio(), rotina: rotinaBase() })

    await renderizar()

    const gerar = screen.getByRole('button', { name: /gerar proposta/i })
    expect(gerar.closest('form')).toHaveAttribute('action', '/api/proposta')
  })

  it('mostra o rascunho por dia com horários, explicações e ações por sugestão', async () => {
    const rotina = rotinaBase()
    await gravar({
      ...estadoVazio(),
      rotina,
      propostaSemanal: gerarPropostaSemanal(rotina, new Date('2026-10-12T12:00:00Z')),
    })

    await renderizar()

    expect(screen.getByText('Quinta')).toBeInTheDocument()
    expect(screen.getByText(/18:00/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /aceitar/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /remover/i }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /confirmar proposta/i })).toBeInTheDocument()
    expect(screen.getAllByText(/configurado|posicionada|protegido/i).length).toBeGreaterThan(0)
  })

  it('marcada como confirmada não oferece edição', async () => {
    const rotina = rotinaBase()
    const aprovada = {
      ...gerarPropostaSemanal(rotina, new Date('2026-10-12T12:00:00Z')),
      confirmadaEm: '2026-10-12T20:00:00.000Z',
    }
    await gravar({ ...estadoVazio(), rotina, semanaAtiva: aprovada })

    await renderizar()

    expect(screen.getByText(/confirmada/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /aceitar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirmar proposta/i })).not.toBeInTheDocument()
  })

  it('a tela de hoje linka para a proposta da semana', async () => {
    await gravar(estadoVazio())

    render(await HojePage({ searchParams: Promise.resolve({}) }))

    expect(screen.getByRole('link', { name: /proposta da semana/i })).toHaveAttribute(
      'href',
      '/proposta'
    )
  })
})
