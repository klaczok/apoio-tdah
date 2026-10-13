import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import EntrevistaPage from '@/app/(area)/entrevista/page'
import ConsentimentoPage from '@/app/(area)/entrevista/consentimento/page'
import EtapasPage from '@/app/(area)/entrevista/etapas/page'
import { POST as postConsentimento } from '@/app/api/entrevista/consentimento/route'
import { getStateStore } from '@/server/persistence'
import { estadoVazio } from '@/server/persistence/estado'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import { confirmarProposta } from '@/server/proposta/modelo'
import { definirSono, rotinaVazia } from '@/server/rotina/modelo'
import { ENTREVISTA_COOKIE, valorConsentimento } from '@/server/entrevista/sessao'
import { autenticarComo, consentirEntrevista, USUARIO_TESTE } from '../helpers/sessao'

// jsdom não expõe Request: stub mínimo do que o handler usa (url,
// headers e formData). Os campos não importam — o consentimento só
// depende da sessão autenticada.
function postConsent(url: string) {
  return {
    url: `http://localhost${url}`,
    headers: { get: () => null },
    formData: async () => new URLSearchParams({ decisao: 'aceito' }),
  } as unknown as Request
}

process.env.PERSISTENCE_DRIVER = 'memory'
process.env.SESSION_SECRET = 'segredo-de-teste-com-entropia-suficiente'

expect.extend(toHaveNoViolations)
const regras = { rules: { 'color-contrast': { enabled: false } } }

const globalState = globalThis as { __sessaoTeste?: string }

beforeEach(async () => {
  await autenticarComo()
  const store = await getStateStore(USUARIO_TESTE)
  const lido = await store.load()
  if (lido.ok) await store.save(estadoVazio(), lido.value.version)
})

async function comSemanaAtiva() {
  const rotina = definirSono(rotinaVazia(), { dormir: '23:00', acordar: '07:00' })
  const semana = confirmarProposta(gerarPropostaSemanal(rotina), new Date())
  const store = await getStateStore(USUARIO_TESTE)
  const lido = await store.load()
  if (!lido.ok) throw new Error('store indisponível')
  await store.save({ ...estadoVazio(), rotina, semanaAtiva: semana }, lido.value.version)
}

describe('convite da entrevista', () => {
  it('oferece começar ou fazer depois, sem bloquear o fluxo manual', async () => {
    render(await EntrevistaPage())

    expect(screen.getByRole('heading', { name: 'Entrevista inicial' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /começar entrevista/i })).toHaveAttribute(
      'href',
      '/entrevista/consentimento'
    )
    expect(screen.getByRole('link', { name: /fazer depois/i })).toHaveAttribute('href', '/hoje')
    expect(
      screen.getByRole('link', { name: /configurar sua rotina manualmente/i })
    ).toHaveAttribute('href', '/configurar')
    // Aviso de perda de progresso antes de iniciar.
    expect(screen.getByText(/progresso é perdido/i)).toBeInTheDocument()
  })

  it('quem já tem semana ativa não recebe o convite — volta para a agenda', async () => {
    await comSemanaAtiva()
    await expect(EntrevistaPage()).rejects.toThrow('NEXT_REDIRECT')
  })

  it('o convite aparece no painel de Hoje sem planejamento', async () => {
    const { default: HojePage } = await import('@/app/(area)/hoje/page')
    render(await HojePage({ searchParams: Promise.resolve({}) }))
    expect(screen.getByRole('link', { name: /começar entrevista/i })).toBeInTheDocument()
  })

  it('o convite some no Hoje quando já há semana ativa — sem beco sem saída', async () => {
    await comSemanaAtiva()
    const { default: HojePage } = await import('@/app/(area)/hoje/page')
    render(await HojePage({ searchParams: Promise.resolve({}) }))
    expect(screen.queryByRole('link', { name: /começar entrevista/i })).not.toBeInTheDocument()
  })
})

describe('consentimento informado', () => {
  it('informa finalidade, limite não clínico e uso de dados no Free Tier', async () => {
    render(await ConsentimentoPage())

    expect(
      screen.getByText(/apoia?r? a organização|organização da sua rotina/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/diagnóstico, tratamento nem orientação profissional de saúde/i)
    ).toBeInTheDocument()
    expect(screen.getAllByText(/nível gratuito|Free Tier|modalidade/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/melhorar o serviço/i)).toBeInTheDocument()
    // Recusa mantém o fluxo manual acessível.
    expect(screen.getByRole('link', { name: /seguir sem a entrevista/i })).toHaveAttribute(
      'href',
      '/configurar'
    )
  })

  it('sem consentimento, as etapas não abrem — retornam ao consentimento', async () => {
    await expect(EtapasPage()).rejects.toThrow('NEXT_REDIRECT')
  })

  it('aceite registra cookie efêmero assinado e libera as etapas', async () => {
    const resposta = await postConsentimento(postConsent('/api/entrevista/consentimento'))
    expect(resposta.status).toBe(303)
    expect(resposta.headers.get('location')).toBe('/entrevista/etapas')

    const cookie = resposta.headers.get('set-cookie') ?? ''
    expect(cookie).toContain(`${ENTREVISTA_COOKIE}=`)
    expect(cookie).toContain('HttpOnly')
    // Cookie de sessão: sem Max-Age, some ao fechar o navegador.
    expect(cookie).not.toContain('Max-Age')

    const valor = cookie.split(`${ENTREVISTA_COOKIE}=`)[1]?.split(';')[0] ?? ''
    expect(valor).toBe(await valorConsentimento(process.env.SESSION_SECRET!))

    // Simula o cookie presente e confirma que as etapas abrem — o
    // wizard busca as perguntas que a IA formulou (ou o banco de
    // reserva) antes de renderizar a primeira.
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        perguntas: [{ id: 'p1', titulo: 'T', pergunta: 'Pergunta da IA?' }],
      }),
    })) as unknown as typeof fetch
    consentirEntrevista(valor)
    render(await EtapasPage())
    expect(
      await screen.findByRole('progressbar', { name: /progresso da entrevista/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sair e perder o progresso/i })).toBeInTheDocument()
  })

  it('sem sessão, o consentimento redireciona para login', async () => {
    delete globalState.__sessaoTeste
    const resposta = await postConsentimento(postConsent('/api/entrevista/consentimento'))
    expect(resposta.status).toBe(303)
    expect(resposta.headers.get('location')).toBe('/login')
  })
})

describe('acessibilidade da entrevista', () => {
  it('convite não tem violações', async () => {
    const { container } = render(await EntrevistaPage())
    expect(await axe(container, regras)).toHaveNoViolations()
  })

  it('consentimento não tem violações', async () => {
    const { container } = render(await ConsentimentoPage())
    expect(await axe(container, regras)).toHaveNoViolations()
  })
})
