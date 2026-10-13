import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import RevisaoPage from '@/app/(area)/entrevista/revisao/page'
import ConcluidaPage from '@/app/(area)/entrevista/concluida/page'
import { POST as postConfirmar } from '@/app/api/entrevista/confirmar/route'
import { getStateStore } from '@/server/persistence'
import { estadoVazio } from '@/server/persistence/estado'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import { acrescentarCompromisso, definirSono, rotinaVazia } from '@/server/rotina/modelo'
import { valorSessao } from '@/server/entrevista/sessao'
import { descartarDocumento, guardarDocumento, obterDocumento } from '@/server/entrevista/documento'
import { ENTREVISTA_COOKIE } from '@/server/entrevista/cookie'
import { autenticarComo, consentirEntrevista, USUARIO_TESTE } from '../helpers/sessao'

process.env.PERSISTENCE_DRIVER = 'memory'
process.env.SESSION_SECRET = 'segredo-de-teste-com-entropia-suficiente'

expect.extend(toHaveNoViolations)
const regras = { rules: { 'color-contrast': { enabled: false } } }

function rotinaBase() {
  const r = definirSono(rotinaVazia(), { dormir: '23:00', acordar: '07:00' })
  return acrescentarCompromisso(r, {
    titulo: 'Consulta',
    diaSemana: 'ter',
    inicio: '10:00',
    duracaoMin: 30,
    categoria: 'saude',
    tipo: 'fixo',
  })
}

async function estado() {
  const lido = await (await getStateStore(USUARIO_TESTE)).load()
  if (!lido.ok) throw new Error('store indisponível')
  return lido.value.dados
}

async function sessaoRespostas(comProposta = false) {
  await autenticarComo()
  consentirEntrevista(
    await valorSessao(process.env.SESSION_SECRET!, {
      consentimento: 'geral',
      respostas: { objetivo: { selecionadas: ['estudos'], texto: '' } },
    })
  )
  const rotina = rotinaBase()
  const store = await getStateStore(USUARIO_TESTE)
  const lido = await store.load()
  if (!lido.ok) throw new Error('store indisponível')
  await store.save(
    {
      ...estadoVazio(),
      rotina,
      propostaSemanal: comProposta ? gerarPropostaSemanal(rotina) : null,
    },
    lido.value.version
  )
}

beforeEach(() => descartarDocumento(USUARIO_TESTE))

describe('revisão da proposta da entrevista', () => {
  it('sem proposta gerada, oferece gerar e caminho manual', async () => {
    await sessaoRespostas()
    render(await RevisaoPage({ searchParams: Promise.resolve({}) }))
    expect(screen.getByRole('button', { name: /gerar proposta com ia/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /montar manualmente/i })).toHaveAttribute(
      'href',
      '/configurar'
    )
  })

  it('com proposta, mostra resumo, blocos, sugestões e a confirmação', async () => {
    await sessaoRespostas(true)
    render(await RevisaoPage({ searchParams: Promise.resolve({ gerada: '1' }) }))

    expect(screen.getByRole('region', { name: /resumo da rotina/i })).toHaveTextContent(
      /acordar 07:00/i
    )
    expect(screen.getByRole('region', { name: /proposta em blocos/i })).toHaveTextContent(
      /consulta/i
    )
    expect(screen.getByText(/nada entra no calendário sem a sua confirmação/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirmar proposta/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /editar na proposta/i })).toHaveAttribute(
      'href',
      '/proposta'
    )
    expect(screen.getByRole('link', { name: /refazer a entrevista/i })).toHaveAttribute(
      'href',
      '/entrevista/etapas'
    )
  })
})

describe('POST /api/entrevista/confirmar', () => {
  it('promove o rascunho a SemanaAtiva e descarta o material transitório', async () => {
    await sessaoRespostas(true)
    guardarDocumento(USUARIO_TESTE, {
      nome: 'apoio.txt',
      formato: 'txt',
      tamanho: 10,
      consentidoEm: new Date().toISOString(),
      texto: 'x',
    })

    const resposta = await postConfirmar({
      url: 'http://localhost/api/entrevista/confirmar',
      headers: { get: () => null },
    } as unknown as Request)

    expect(resposta.headers.get('location')).toBe('/entrevista/concluida')
    // Cookie da entrevista expirado e documento descartado.
    const cookie = resposta.headers.get('set-cookie') ?? ''
    expect(cookie).toContain(`${ENTREVISTA_COOKIE}=`)
    expect(cookie).toContain('Max-Age=0')
    expect(obterDocumento(USUARIO_TESTE)).toBeNull()

    const dados = await estado()
    expect(dados.semanaAtiva).not.toBeNull()
    expect(dados.propostaSemanal).toBeNull()
    // Rotina preservada como estava — sem alteração inesperada.
    expect(dados.rotina.compromissos?.[0]?.titulo).toBe('Consulta')
    expect(JSON.stringify(dados)).not.toContain('apoio.txt')
  })

  it('sem proposta em rascunho, volta à revisão com erro factual', async () => {
    await sessaoRespostas(false)
    const resposta = await postConfirmar({
      url: 'http://localhost/api/entrevista/confirmar',
      headers: { get: () => null },
    } as unknown as Request)
    expect(resposta.headers.get('location')).toMatch(/\/entrevista\/revisao\?erro=/)
    expect((await estado()).semanaAtiva).toBeNull()
  })
})

describe('conclusão', () => {
  it('com semana ativa, comunica que a entrevista não reabre nesta versão', async () => {
    await sessaoRespostas(true)
    await postConfirmar({
      url: 'http://localhost/api/entrevista/confirmar',
      headers: { get: () => null },
    } as unknown as Request)
    render(await ConcluidaPage())
    expect(screen.getByText(/não pode ser reaberta/i)).toBeInTheDocument()
    expect(screen.getByText(/descartados/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver minha semana/i })).toHaveAttribute(
      'href',
      '/semana'
    )
  })
})

describe('acessibilidade da revisão', () => {
  it('estado gerado não tem violações', async () => {
    await sessaoRespostas(true)
    const { container } = render(await RevisaoPage({ searchParams: Promise.resolve({}) }))
    expect(await axe(container, regras)).toHaveNoViolations()
  })
})
