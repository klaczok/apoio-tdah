import { render, screen } from '@testing-library/react'
import PropostaPage from '@/app/(area)/proposta/page'
import { getStateStore } from '@/server/persistence'
import { estadoVazio, type EstadoPrivado } from '@/server/persistence/estado'
import {
  acrescentarCompromisso,
  definirSono,
  definirTrabalho,
  rotinaVazia,
} from '@/server/rotina/modelo'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'

import { autenticarComo, USUARIO_TESTE } from '../helpers/sessao'

process.env.PERSISTENCE_DRIVER = 'memory'

beforeEach(() => autenticarComo())

async function gravar(dados: EstadoPrivado) {
  const store = await getStateStore(USUARIO_TESTE)
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

    expect(screen.getAllByText(/confirmada/i).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /aceitar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirmar proposta/i })).not.toBeInTheDocument()
  })

  it('distingue rascunho da semana ativa e sinaliza protegidos', async () => {
    const rotina = rotinaBase()
    await gravar({
      ...estadoVazio(),
      rotina,
      propostaSemanal: gerarPropostaSemanal(rotina, new Date('2026-10-12T12:00:00Z')),
    })

    await renderizar()

    expect(screen.getByText(/rascunho em edição/i)).toBeInTheDocument()
    expect(screen.getAllByText(/pendente/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/protegido/i).length).toBeGreaterThan(0)
  })

  it('compara rascunho com a semana vigente quando ela existe', async () => {
    const rotina = rotinaBase()
    const vigente = {
      ...gerarPropostaSemanal(rotina, new Date('2026-10-05T12:00:00Z')),
      confirmadaEm: '2026-10-05T20:00:00.000Z',
    }
    // Rascunho novo gerado sobre a mesma rotina — ids novos aparecem
    // como "novo nesta proposta" na comparação.
    const rascunho = gerarPropostaSemanal(rotina, new Date('2026-10-12T12:00:00Z'))
    await gravar({ ...estadoVazio(), rotina, semanaAtiva: vigente, propostaSemanal: rascunho })

    await renderizar()

    expect(screen.getAllByText(/novo nesta proposta|antes:/i).length).toBeGreaterThan(0)
    // Confirmar continua sendo a única via para alterar a semana ativa.
    expect(screen.getByRole('button', { name: /confirmar proposta/i })).toBeInTheDocument()
  })

  // O acesso à proposta agora é a navegação persistente do shell —
  // coberto em tests/app/shell.test.tsx.
})
