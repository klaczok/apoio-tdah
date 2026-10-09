import { render, screen } from '@testing-library/react'
import ConfigurarPage from '@/app/configurar/page'
import EtapaPage from '@/app/configurar/[etapa]/page'
import { getStateStore } from '@/server/persistence'
import { estadoVazio } from '@/server/persistence/estado'
import {
  acrescentarCompromisso,
  definirSono,
  definirTrabalho,
  rotinaVazia,
} from '@/server/rotina/modelo'

process.env.PERSISTENCE_DRIVER = 'memory'

async function gravar(rotina = rotinaVazia()) {
  const store = await getStateStore()
  const carregado = await store.load()
  if (!carregado.ok) throw new Error('store indisponível no teste')
  await store.save({ ...estadoVazio(), rotina }, carregado.value.version)
}

async function renderizarIndex(params: Record<string, string> = {}) {
  return render(await ConfigurarPage({ searchParams: Promise.resolve(params) }))
}

async function renderizarEtapa(etapa: string, params: Record<string, string> = {}) {
  return render(
    await EtapaPage({
      params: Promise.resolve({ etapa }),
      searchParams: Promise.resolve(params),
    })
  )
}

describe('Configuração da rotina — resumo', () => {
  it('lista as etapas curtas do onboarding', async () => {
    await gravar()
    await renderizarIndex()

    for (const nome of [
      /trabalho/i,
      /presencial/i,
      /compromissos/i,
      /períodos/i,
      /sono/i,
      /margens e carga/i,
    ]) {
      expect(screen.getByRole('link', { name: nome })).toBeInTheDocument()
    }
  })

  it('mostra seções não informadas como a confirmar, sem inventar valores', async () => {
    await gravar()
    await renderizarIndex()

    expect(screen.getAllByText(/a confirmar/i).length).toBeGreaterThanOrEqual(6)
  })

  it('resume seções já configuradas', async () => {
    const rotina = definirSono(
      definirTrabalho(rotinaVazia(), {
        diasSemana: ['seg', 'qua'],
        horasPadrao: 8,
        limiteExcepcional: 10,
      }),
      { dormir: '23:00', acordar: '07:00' }
    )
    await gravar(rotina)
    await renderizarIndex()

    expect(screen.getByText(/8h por dia/i)).toBeInTheDocument()
    expect(screen.getByText(/dormir 23:00/i)).toBeInTheDocument()
  })

  it('apresenta erro de persistência quando o armazenamento falha', async () => {
    await renderizarIndex({ erro: 'persistencia' })
    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível/i)
  })
})

describe('Configuração da rotina — etapas', () => {
  it('etapa trabalho oferece jornada de 8h e limite excepcional editáveis', async () => {
    await gravar()
    await renderizarEtapa('trabalho')

    expect(screen.getByLabelText(/horas por dia/i)).toHaveValue(8)
    expect(screen.getByLabelText(/limite excepcional/i)).toHaveValue(10)
    expect(screen.getByRole('checkbox', { name: /segunda/i })).toBeInTheDocument()
  })

  it('etapa compromissos lista recorrências e exige confirmação para fixo', async () => {
    const rotina = acrescentarCompromisso(rotinaVazia(), {
      titulo: 'Terapia',
      diaSemana: 'qui',
      inicio: '18:30',
      duracaoMin: 50,
      categoria: 'saude',
      tipo: 'fixo',
    })
    await gravar(rotina)
    await renderizarEtapa('compromissos')

    expect(screen.getByText(/terapia/i)).toBeInTheDocument()
    expect(screen.getByText(/quinta 18:30/i)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /confirmo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /adicionar/i })).toBeInTheDocument()
  })

  it('etapas aceitam navegação por teclado com nomes acessíveis', async () => {
    await gravar()
    await renderizarEtapa('sono')

    expect(screen.getByLabelText(/dormir/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/acordar/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument()
  })

  it('etapa desconhecida redireciona ou informa', async () => {
    await expect(renderizarEtapa('inexistente')).rejects.toThrow()
  })
})
