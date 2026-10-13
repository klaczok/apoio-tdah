import { render, screen, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { WizardEntrevista } from '@/app/_components/wizard-entrevista'
import { GET as getConversa, POST as postConversa } from '@/app/api/entrevista/conversa/route'
import { lerSessao, valorConsentimento } from '@/server/entrevista/sessao'
import { guardarHistorico, obterHistorico, descartarHistorico } from '@/server/entrevista/material'
import type { ResultadoConversa } from '@/server/ia/entrevistador'
import { autenticarComo, consentirEntrevista, USUARIO_TESTE } from '../helpers/sessao'

process.env.PERSISTENCE_DRIVER = 'memory'
process.env.SESSION_SECRET = 'segredo-de-teste-com-entropia-suficiente'
process.env.INTERPRETADOR_DRIVER = 'fake'

expect.extend(toHaveNoViolations)
const regras = { rules: { 'color-contrast': { enabled: false } } }

const globalState = globalThis as {
  __respostaConversaIA?: ResultadoConversa | ResultadoConversa[]
  __historicoConversaIA?: unknown
}

beforeEach(async () => {
  delete globalState.__respostaConversaIA
  delete globalState.__historicoConversaIA
  descartarHistorico(USUARIO_TESTE)
  await autenticarComo()
  consentirEntrevista(await valorConsentimento(process.env.SESSION_SECRET!))
})

function postJson(corpo: unknown) {
  return {
    url: 'http://localhost/api/entrevista/conversa',
    headers: { get: () => null },
    json: async () => corpo,
  } as unknown as Request
}

describe('conversa guiada pela IA', () => {
  it('a IA abre a conversa e a pessoa responde — uma mensagem por vez', async () => {
    // GET volta vazio → o componente pede a abertura (POST) à IA.
    global.fetch = jest.fn(async (url, init) => {
      const metodo = (init as RequestInit | undefined)?.method ?? 'GET'
      if (metodo === 'GET') return { ok: true, json: async () => ({ mensagens: [] }) }
      return {
        ok: true,
        json: async () => ({ mensagem: 'Olá! Como tem sido sua semana?', concluiu: false }),
      }
    }) as unknown as typeof fetch

    render(<WizardEntrevista />)
    expect(await screen.findByText('Olá! Como tem sido sua semana?')).toBeInTheDocument()

    // Segunda rodada: resposta da pessoa + nova pergunta da IA.
    global.fetch = jest.fn(async (url, init) => {
      const metodo = (init as RequestInit | undefined)?.method ?? 'GET'
      if (metodo === 'POST') {
        return {
          ok: true,
          json: async () => ({
            mensagem: 'E quais compromissos têm hora marcada?',
            concluiu: false,
          }),
        }
      }
      return { ok: true, json: async () => ({ mensagens: [] }) }
    }) as unknown as typeof fetch

    fireEvent.change(screen.getByLabelText(/sua resposta/i), {
      target: { value: 'trabalho de manhã, faculdade à noite' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^responder$/i }))
    expect(await screen.findByText('trabalho de manhã, faculdade à noite')).toBeInTheDocument()
    expect(await screen.findByText('E quais compromissos têm hora marcada?')).toBeInTheDocument()
    expect(screen.getByText('Você')).toBeInTheDocument()
  })

  it('quando a IA sinaliza o fim, aparece o caminho para a proposta', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        mensagens: [
          { papel: 'ia', texto: 'Oi' },
          { papel: 'pessoa', texto: 'Oi' },
        ],
        concluiu: true,
      }),
    })) as unknown as typeof fetch

    render(<WizardEntrevista />)
    expect(
      await screen.findByRole('button', { name: /seguir para a proposta/i })
    ).toBeInTheDocument()
    // Conversa encerrada: o campo de resposta some.
    expect(screen.queryByLabelText(/sua resposta/i)).not.toBeInTheDocument()
  })

  it('IA indisponível na abertura mostra retentativa e saída manual', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      json: async () => ({ erro: 'x' }),
    })) as unknown as typeof fetch

    render(<WizardEntrevista />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/tentar de novo/i)
    expect(screen.getByRole('link', { name: /montar manualmente/i })).toHaveAttribute(
      'href',
      '/configurar'
    )
  })

  it('conversa sem violações de acessibilidade', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        mensagens: [{ papel: 'ia', texto: 'Como tem sido sua semana?' }],
      }),
    })) as unknown as typeof fetch

    const { container } = render(<WizardEntrevista />)
    await screen.findByText('Como tem sido sua semana?')
    expect(await axe(container, regras)).toHaveNoViolations()
  })
})

describe('GET /api/entrevista/conversa', () => {
  it('devolve a transcrição guardada — refazer retoma de onde parou', async () => {
    guardarHistorico(USUARIO_TESTE, {
      mensagens: [
        { papel: 'ia', texto: 'Olá!' },
        { papel: 'pessoa', texto: 'Oi!' },
      ],
      pronta: false,
    })
    const corpo = (await (await getConversa()).json()) as {
      mensagens: unknown[]
      concluiu: boolean
    }
    expect(corpo.mensagens).toHaveLength(2)
    expect(corpo.concluiu).toBe(false)
  })

  it('sem consentimento, não devolve a conversa', async () => {
    ;(globalThis as { __entrevistaTeste?: string }).__entrevistaTeste = undefined
    expect((await getConversa()).status).toBe(403)
  })
})

describe('POST /api/entrevista/conversa', () => {
  it('abertura pede a primeira mensagem à IA e guarda a transcrição', async () => {
    globalState.__respostaConversaIA = {
      ok: true,
      mensagem: 'Olá! O que mais importa para você neste momento?',
      concluiu: false,
    }
    const resposta = await postConversa(postJson({}))
    expect(resposta.status).toBe(200)
    const corpo = (await resposta.json()) as { mensagem: string; concluiu: boolean }
    expect(corpo.mensagem).toContain('Olá')
    expect(obterHistorico(USUARIO_TESTE)?.mensagens).toHaveLength(1)
  })

  it('cada rodada acrescenta a fala da pessoa e a resposta da IA', async () => {
    globalState.__respostaConversaIA = [
      { ok: true, mensagem: 'Primeira pergunta?', concluiu: false },
      { ok: true, mensagem: 'Me conta mais sobre isso?', concluiu: false },
    ]
    await postConversa(postJson({}))
    await postConversa(postJson({ mensagem: 'trabalho seg a sex 9h-17h' }))

    const historico = obterHistorico(USUARIO_TESTE)!
    expect(historico.mensagens.map((m) => m.papel)).toEqual(['ia', 'pessoa', 'ia'])
    expect(historico.mensagens[1]?.texto).toBe('trabalho seg a sex 9h-17h')
  })

  it('o sinal de prontidão da IA encerra e marca a sessão efêmera', async () => {
    globalState.__respostaConversaIA = [
      { ok: true, mensagem: 'Oi!', concluiu: false },
      { ok: true, mensagem: 'Obrigada, já entendi sua rotina.', concluiu: true },
    ]
    await postConversa(postJson({}))
    const resposta = await postConversa(postJson({ mensagem: 'minha rotina é…' }))
    expect((await resposta.json()).concluiu).toBe(true)
    expect(obterHistorico(USUARIO_TESTE)?.pronta).toBe(true)

    // A marca de conclusão vai só no cookie efêmero — a transcrição não.
    const cookie = resposta.headers.get('set-cookie') ?? ''
    const valor = cookie.split('apoio_entrevista=')[1]?.split(';')[0] ?? ''
    const sessao = await lerSessao(process.env.SESSION_SECRET!, decodeURIComponent(valor))
    expect(sessao?.respostas?.conversa?.texto).toBe('concluída')
  })

  it('falha da IA não grava nada — a transcrição continua de onde estava', async () => {
    globalState.__respostaConversaIA = { ok: false, motivo: 'indisponivel' }
    const resposta = await postConversa(postJson({}))
    expect(resposta.status).toBe(503)
    expect(obterHistorico(USUARIO_TESTE)).toBeNull()
  })

  it('conversa já encerrada não consome nova rodada de IA', async () => {
    guardarHistorico(USUARIO_TESTE, { mensagens: [{ papel: 'ia', texto: 'x' }], pronta: true })
    const resposta = await postConversa(postJson({ mensagem: 'mais um texto' }))
    expect(resposta.status).toBe(200)
    expect(obterHistorico(USUARIO_TESTE)?.mensagens).toHaveLength(1)
  })
})
