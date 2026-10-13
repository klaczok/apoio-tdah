import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import EntrevistaPage from '@/app/(area)/entrevista/page'
import ConsentimentoPage from '@/app/(area)/entrevista/consentimento/page'
import EtapasPage from '@/app/(area)/entrevista/etapas/page'
import DocumentoPage from '@/app/(area)/entrevista/documento/page'
import RevisaoPage from '@/app/(area)/entrevista/revisao/page'
import ConcluidaPage from '@/app/(area)/entrevista/concluida/page'
import { POST as postConsentimento } from '@/app/api/entrevista/consentimento/route'
import { POST as postConversa } from '@/app/api/entrevista/conversa/route'
import { POST as postDocumento } from '@/app/api/entrevista/documento/route'
import { POST as postGerar } from '@/app/api/entrevista/gerar/route'
import { POST as postConfirmar } from '@/app/api/entrevista/confirmar/route'
import { GET as getSair } from '@/app/api/entrevista/sair/route'
import { ENTREVISTA_COOKIE } from '@/server/entrevista/cookie'
import { obterDocumento, descartarDocumento } from '@/server/entrevista/documento'
import {
  obterRotinaInterpretada,
  obterHistorico,
  descartarRotinaInterpretada,
  descartarHistorico,
} from '@/server/entrevista/material'
import { getStateStore } from '@/server/persistence'
import { estadoVazio } from '@/server/persistence/estado'
import type { EstadoPrivado } from '@/server/persistence/estado'
import type { ResultadoInterpretacao } from '@/server/ia/interpretador'
import type { ResultadoConversa } from '@/server/ia/entrevistador'
import { autenticarComo, consentirEntrevista, limparSessao, USUARIO_TESTE } from '../helpers/sessao'

process.env.PERSISTENCE_DRIVER = 'memory'
process.env.SESSION_SECRET = 'segredo-de-teste-com-entropia-suficiente'
process.env.INTERPRETADOR_DRIVER = 'fake'

expect.extend(toHaveNoViolations)
const regras = { rules: { 'color-contrast': { enabled: false } } }

const globalState = globalThis as {
  __respostaIA?: ResultadoInterpretacao
  __entradaIA?: {
    documentoTexto: string | null
    historico?: { papel: string; texto: string }[]
    perfilTexto?: string | null
  }
  __respostaConversaIA?: ResultadoConversa | ResultadoConversa[]
  __contextoConversaIA?: string | null
}

// Aplica o Set-Cookie da rota na "sessão" do teste, como o navegador
// faria — exercita a serialização/parse do cookie efêmero de ponta a
// ponta, em vez de semear o valor direto.
function aplicarCookies(resposta: Response) {
  const cookie = resposta.headers.get('set-cookie') ?? ''
  const trecho = cookie.split(`${ENTREVISTA_COOKIE}=`)[1]?.split(';')[0]
  if (trecho !== undefined) {
    consentirEntrevista(decodeURIComponent(trecho))
  }
}

function requisicaoJson(corpo: unknown) {
  return {
    url: 'http://localhost/api/entrevista/conversa',
    headers: { get: () => null },
    json: async () => corpo,
  } as unknown as Request
}

function requisicaoForm(form: Record<string, unknown>) {
  const dados = new Map(Object.entries(form))
  return {
    url: 'http://localhost/api/entrevista/documento',
    headers: { get: () => null },
    formData: async () => ({
      get: (k: string) => dados.get(k) ?? null,
      getAll: (k: string) => {
        const v = dados.get(k)
        return v === undefined ? [] : Array.isArray(v) ? v : [v]
      },
    }),
  } as unknown as Request
}

function requisicaoVazia(url = 'http://localhost/api/entrevista/consentimento') {
  return { url, headers: { get: () => null } } as unknown as Request
}

function arquivoTxt(nome = 'rotina.txt', conteudo = 'trabalho seg a sex 9h as 15h') {
  const bytes = new TextEncoder().encode(conteudo)
  return {
    name: nome,
    size: bytes.length,
    type: 'text/plain',
    arrayBuffer: async () => bytes.buffer,
  } as unknown as File
}

async function estado(): Promise<EstadoPrivado> {
  const lido = await (await getStateStore(USUARIO_TESTE)).load()
  if (!lido.ok) throw new Error('store indisponível')
  return lido.value.dados
}

async function preparar() {
  limparSessao()
  delete globalState.__respostaIA
  delete globalState.__entradaIA
  delete globalState.__respostaConversaIA
  delete globalState.__contextoConversaIA
  descartarDocumento(USUARIO_TESTE)
  descartarRotinaInterpretada(USUARIO_TESTE)
  descartarHistorico(USUARIO_TESTE)
  // O wizard montado nas páginas faz fetch real; devolvemos uma
  // conversa vazia para o efeito resolver limpo.
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ mensagens: [], concluiu: false }),
  })) as unknown as typeof fetch
  await autenticarComo()
  const store = await getStateStore(USUARIO_TESTE)
  const lido = await store.load()
  if (lido.ok) await store.save(estadoVazio(), lido.value.version)
}

async function consentir() {
  const resposta = await postConsentimento(requisicaoVazia())
  expect(resposta.status).toBe(303)
  aplicarCookies(resposta)
}

// A conversa inteira é conduzida pela IA (fake): ela abre, ouve a
// pessoa e sinaliza prontidão quando conhece a rotina — sem número
// fixo de perguntas.
async function responder() {
  globalState.__respostaConversaIA = [
    { ok: true, mensagem: 'Olá! O que mais importa para você?', concluiu: false },
    { ok: true, mensagem: 'Entendi — já consigo montar sua semana.', concluiu: true },
  ]
  const abertura = await postConversa(requisicaoJson({}))
  expect(abertura.status).toBe(200)
  aplicarCookies(abertura)
  const fechamento = await postConversa(requisicaoJson({ mensagem: 'faculdade' }))
  expect(fechamento.status).toBe(200)
  aplicarCookies(fechamento)
}

describe('jornada completa da entrevista', () => {
  beforeEach(preparar)

  it('convite → consentimento → etapas → documento → geração → revisão → confirmação', async () => {
    // 1. Convite — começar é opcional; adiar e o caminho manual existem.
    const convite = render(await EntrevistaPage())
    expect(await axe(convite.container, regras)).toHaveNoViolations()
    expect(screen.getByRole('link', { name: /começar entrevista/i })).toHaveAttribute(
      'href',
      '/entrevista/consentimento'
    )
    expect(screen.getByRole('link', { name: /fazer depois/i })).toHaveAttribute('href', '/hoje')
    convite.unmount()

    // 2. Consentimento informado — declara finalidade, limite não
    // clínico e o Free Tier; semântica de formulário nativa.
    const consent = render(await ConsentimentoPage())
    expect(await axe(consent.container, regras)).toHaveNoViolations()
    expect(screen.getByText(/não oferece diagnóstico/i)).toBeInTheDocument()
    consent.unmount()

    await consentir()

    // 3. Conversa — a transcrição fica em material transitório, nunca
    // no EstadoPrivado.
    const etapas = render(await EtapasPage())
    expect(await axe(etapas.container, regras)).toHaveNoViolations()
    etapas.unmount()
    await responder()
    let dados = await estado()
    expect(JSON.stringify(dados)).not.toContain('faculdade')
    expect(JSON.stringify(dados)).not.toContain('estudos')

    // 4. Documento opcional — consentimento específico; texto extraído
    // fica só na memória transitória.
    const doc = render(await DocumentoPage({ searchParams: Promise.resolve({}) }))
    expect(await axe(doc.container, regras)).toHaveNoViolations()
    doc.unmount()
    const anexo = await postDocumento(
      requisicaoForm({ consentimentoDocumento: 'aceito', arquivo: arquivoTxt() })
    )
    expect(anexo.headers.get('location')).toBe('/entrevista/documento?selecionado=1')
    dados = await estado()
    expect(JSON.stringify(dados)).not.toContain('trabalho seg a sex')

    // 5. Geração — o texto do documento vira contexto da IA; a proposta
    // fica em rascunho, nunca SemanaAtiva.
    globalState.__respostaIA = {
      ok: true,
      interpretacao: {
        sono: { dormir: '23:00', acordar: '07:00' },
        trabalho: { diasSemana: ['seg', 'ter', 'qua', 'qui', 'sex'], horasPadrao: 6 },
        preferenciaCarga: 'equilibrada',
      },
    }
    const gerada = await postGerar()
    expect(gerada.headers.get('location')).toBe('/entrevista/revisao?gerada=1')
    expect(globalState.__entradaIA?.documentoTexto).toBe('trabalho seg a sex 9h as 15h')
    // A transcrição inteira da conversa vai à interpretação — a IA já
    // conhece a pessoa antes de montar o calendário.
    expect(globalState.__entradaIA?.historico).toHaveLength(3)
    expect(globalState.__entradaIA?.historico?.[1]?.texto).toBe('faculdade')
    dados = await estado()
    expect(dados.propostaSemanal).not.toBeNull()
    expect(dados.semanaAtiva).toBeNull()
    expect(obterDocumento(USUARIO_TESTE)).toBeNull()

    // 6. Revisão — resumo, blocos por dia, editar/refazer/confirmar.
    const revisao = render(await RevisaoPage({ searchParams: Promise.resolve({ gerada: '1' }) }))
    expect(await axe(revisao.container, regras)).toHaveNoViolations()
    expect(screen.getByText(/o que a entrevista entendeu/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirmar proposta/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /editar na proposta/i })).toHaveAttribute(
      'href',
      '/proposta'
    )
    revisao.unmount()

    // 7. Confirmação — promove a SemanaAtiva e limpa o material
    // transitório; a jornada conclui na tela final.
    const confirma = await postConfirmar(
      requisicaoVazia('http://localhost/api/entrevista/confirmar')
    )
    expect(confirma.headers.get('location')).toBe('/entrevista/concluida')
    aplicarCookies(confirma)
    dados = await estado()
    expect(dados.semanaAtiva).not.toBeNull()
    expect(dados.propostaSemanal).toBeNull()
    // A confirmação promove junto a rotina interpretada — antes disso
    // ela era só material transitório.
    expect(dados.rotina.sono?.dormir).toBe('23:00')
    const serializado = JSON.stringify(dados)
    expect(serializado).not.toContain('faculdade')
    expect(serializado).not.toContain('apoio_entrevista')
    expect(serializado).not.toContain('trabalho seg a sex')

    const concluida = render(await ConcluidaPage())
    expect(await axe(concluida.container, regras)).toHaveNoViolations()
    concluida.unmount()
  })

  it('a mesma jornada funciona sem documento', async () => {
    await consentir()
    await responder()
    globalState.__respostaIA = {
      ok: true,
      interpretacao: { sono: { dormir: '22:30', acordar: '06:30' } },
    }
    expect((await postGerar()).headers.get('location')).toBe('/entrevista/revisao?gerada=1')
    expect(globalState.__entradaIA?.documentoTexto).toBeNull()
    const confirma = await postConfirmar(
      requisicaoVazia('http://localhost/api/entrevista/confirmar')
    )
    expect(confirma.headers.get('location')).toBe('/entrevista/concluida')
    expect((await estado()).semanaAtiva).not.toBeNull()
  })

  it('o perfil de onboarding chega como contexto da conversa e da interpretação', async () => {
    const store = await getStateStore(USUARIO_TESTE)
    const lido = await store.load()
    if (!lido.ok) throw new Error('store indisponível')
    await store.save(
      {
        ...estadoVazio(),
        perfil: {
          nome: 'Ana',
          idade: 29,
          motivoUso: 'foco-e-procrastinacao',
          motivoOutro: null,
          necessidadePrincipal: 'dividir-tarefas',
          rotinaDiaria: 'Acordo 7h, trabalho das 9h às 18h.',
          tarefasSemana: 'Entregar relatório sexta.',
        },
      },
      lido.value.version
    )

    await consentir()
    await responder()
    // A IA recebe o que já foi respondido no cadastro — não repete.
    expect(globalState.__contextoConversaIA).toContain('Ana')
    expect(globalState.__contextoConversaIA).toContain('Acordo 7h')

    globalState.__respostaIA = {
      ok: true,
      interpretacao: { sono: { dormir: '23:00', acordar: '07:00' } },
    }
    expect((await postGerar()).headers.get('location')).toBe('/entrevista/revisao?gerada=1')
    // O mesmo contexto alimenta a interpretação do calendário.
    expect(globalState.__entradaIA?.perfilTexto).toContain('Ana')
    expect(globalState.__entradaIA?.perfilTexto).toContain('Entregar relatório sexta')
  })

  it('recusar e adiar mantêm o caminho manual aberto', async () => {
    // O convite declara a configuração manual sempre disponível.
    render(await EntrevistaPage())
    expect(screen.getByText(/configuração manual continua sempre disponível/i)).toBeInTheDocument()

    // A página de consentimento oferece recusar e seguir manualmente.
    render(await ConsentimentoPage())
    expect(screen.getByRole('link', { name: /prefiro seguir sem a entrevista/i })).toHaveAttribute(
      'href',
      '/configurar'
    )

    // Sem consentimento, a conversa é rejeitada e nada é gravado.
    const negado = await postConversa(requisicaoJson({ mensagem: 'faculdade' }))
    expect(negado.status).toBe(403)
    expect(JSON.stringify(await estado())).not.toContain('faculdade')
  })

  it('sair descarta sessão, documento e rotina interpretada — nada vaza para a próxima tentativa', async () => {
    await consentir()
    await responder()
    await postDocumento(requisicaoForm({ consentimentoDocumento: 'aceito', arquivo: arquivoTxt() }))
    globalState.__respostaIA = {
      ok: true,
      interpretacao: { sono: { dormir: '23:00', acordar: '07:00' } },
    }
    await postGerar()
    expect(obterRotinaInterpretada(USUARIO_TESTE)).not.toBeNull()

    const saida = await getSair(requisicaoVazia('http://localhost/api/entrevista/sair'))
    expect(saida.headers.get('location')).toBe('/hoje')
    // Cookie efêmero expirado e material transitório descartado.
    const cookie = saida.headers.get('set-cookie') ?? ''
    expect(cookie).toContain(`${ENTREVISTA_COOKIE}=`)
    expect(cookie).toContain('Max-Age=0')
    expect(obterDocumento(USUARIO_TESTE)).toBeNull()
    expect(obterRotinaInterpretada(USUARIO_TESTE)).toBeNull()
    expect(obterHistorico(USUARIO_TESTE)).toBeNull()

    // Nada persistiu: EstadoPrivado continua vazio de respostas,
    // documento e qualquer material de IA.
    const dados = await estado()
    const serializado = JSON.stringify(dados)
    expect(serializado).not.toContain('faculdade')
    expect(serializado).not.toContain('trabalho seg a sex')
    expect(dados.propostaSemanal).not.toBeNull() // o rascunho gerado permanece — é dado de produto
    expect(dados.semanaAtiva).toBeNull()
  })

  it('falha do provedor expõe erro factual e a retentativa funciona — sem Gemini real', async () => {
    await consentir()
    await responder()

    globalState.__respostaIA = { ok: false, motivo: 'indisponivel' }
    expect((await postGerar()).headers.get('location')).toBe(
      '/entrevista/revisao?erro=indisponivel'
    )
    render(await RevisaoPage({ searchParams: Promise.resolve({ erro: 'indisponivel' }) }))
    expect(screen.getByRole('alert')).toHaveTextContent(/não está disponível/i)
    expect(screen.getByRole('button', { name: /tentar gerar de novo/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /montar manualmente/i })).toHaveAttribute(
      'href',
      '/configurar'
    )

    // Retentativa bem-sucedida no mesmo ponto.
    globalState.__respostaIA = {
      ok: true,
      interpretacao: { sono: { dormir: '23:00', acordar: '07:00' } },
    }
    expect((await postGerar()).headers.get('location')).toBe('/entrevista/revisao?gerada=1')
    expect((await estado()).propostaSemanal).not.toBeNull()
  })
})
