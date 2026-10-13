import { EntrevistadorOpenRouter, InterpretadorOpenRouter } from '@/server/ia/openrouter'

function respostaOk(conteudo: string) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content: conteudo } }] }),
  } as unknown as Response
}

beforeEach(() => {
  process.env.OPENROUTER_MODEL = 'openrouter/free'
})

afterEach(() => {
  delete process.env.OPENROUTER_MODEL
})

describe('EntrevistadorOpenRouter', () => {
  it('conversa em formato chat — histórico vira mensagens user/assistant', async () => {
    let corpo: { model?: string; messages?: { role: string; content: string }[] } = {}
    global.fetch = jest.fn(async (url, init) => {
      expect(String(url)).toBe('https://openrouter.ai/api/v1/chat/completions')
      corpo = JSON.parse(String((init as RequestInit).body))
      return respostaOk('E quais compromissos têm hora marcada?')
    }) as unknown as typeof fetch

    const resultado = await new EntrevistadorOpenRouter('sk-or-teste').conversar([
      { papel: 'ia', texto: 'Olá! O que importa agora?' },
      { papel: 'pessoa', texto: 'faculdade' },
    ])
    expect(resultado).toEqual({
      ok: true,
      mensagem: 'E quais compromissos têm hora marcada?',
      concluiu: false,
    })
    expect(corpo.model).toBe('openrouter/free')
    expect(corpo.messages?.map((m) => m.role)).toEqual(['system', 'assistant', 'user'])
    expect(corpo.messages?.[2]?.content).toBe('faculdade')
  })

  it('o sinal de prontidão sai da mensagem exibida', async () => {
    global.fetch = jest.fn(async () =>
      respostaOk('Obrigada — já consigo montar sua semana. [[PRONTO]]')
    ) as unknown as typeof fetch
    const resultado = await new EntrevistadorOpenRouter('sk-or-teste').conversar([])
    expect(resultado).toEqual({
      ok: true,
      mensagem: 'Obrigada — já consigo montar sua semana.',
      concluiu: true,
    })
  })

  it('429 de rate limit retenta com backoff e recupera', async () => {
    let tentativas = 0
    global.fetch = jest.fn(async () => {
      tentativas++
      if (tentativas < 2) {
        return { ok: false, status: 429, text: async () => 'rate limited' } as unknown as Response
      }
      return respostaOk('Olá!')
    }) as unknown as typeof fetch

    const resultado = await new EntrevistadorOpenRouter('sk-or-teste').conversar([])
    expect(resultado.ok).toBe(true)
    expect(tentativas).toBe(2)
  })

  it('sem chave, falha sem chamar a API', async () => {
    const fetchEspiao = jest.fn()
    global.fetch = fetchEspiao as unknown as typeof fetch
    const resultado = await new EntrevistadorOpenRouter(undefined).conversar([])
    expect(resultado).toEqual({ ok: false, motivo: 'indisponivel' })
    expect(fetchEspiao).not.toHaveBeenCalled()
  })
})

describe('InterpretadorOpenRouter', () => {
  it('interpreta a transcrição e limpa cercas de código do JSON', async () => {
    let corpo: { messages?: { role: string; content: string }[] } = {}
    global.fetch = jest.fn(async (url, init) => {
      corpo = JSON.parse(String((init as RequestInit).body))
      return respostaOk('```json\n{"sono":{"dormir":"23:00","acordar":"07:00"}}\n```')
    }) as unknown as typeof fetch

    const resultado = await new InterpretadorOpenRouter('sk-or-teste').interpretar({
      historico: [
        { papel: 'ia', texto: 'Que horas você dorme?' },
        { papel: 'pessoa', texto: '23h às 7h' },
      ],
      documentoTexto: null,
    })
    expect(resultado).toEqual({
      ok: true,
      interpretacao: { sono: { dormir: '23:00', acordar: '07:00' } },
    })
    expect(corpo.messages?.[1]?.content).toContain('23h às 7h')
  })

  it('extrai o JSON mesmo embutido em prosa', async () => {
    global.fetch = jest.fn(async () =>
      respostaOk(
        'Aqui está o calendário: {"sono":{"dormir":"22:00","acordar":"06:00"}} espero ter ajudado!'
      )
    ) as unknown as typeof fetch
    const resultado = await new InterpretadorOpenRouter('sk-or-teste').interpretar({
      historico: [],
      documentoTexto: null,
    })
    expect(resultado).toEqual({
      ok: true,
      interpretacao: { sono: { dormir: '22:00', acordar: '06:00' } },
    })
  })

  it('prosa sem JSON dispara uma retentativa de formato antes de desistir', async () => {
    let chamadas = 0
    global.fetch = jest.fn(async () => {
      chamadas++
      return chamadas === 1 ? respostaOk('não sei') : respostaOk('{"sono":{"dormir":"23:00"}}')
    }) as unknown as typeof fetch

    const resultado = await new InterpretadorOpenRouter('sk-or-teste').interpretar({
      historico: [{ papel: 'pessoa', texto: 'durmo 23h' }],
      documentoTexto: null,
    })
    expect(chamadas).toBe(2)
    expect(resultado).toEqual({ ok: true, interpretacao: { sono: { dormir: '23:00' } } })
  })

  it('duas respostas sem JSON devolvem invalida', async () => {
    global.fetch = jest.fn(async () => respostaOk('não sei')) as unknown as typeof fetch
    const resultado = await new InterpretadorOpenRouter('sk-or-teste').interpretar({
      historico: [],
      documentoTexto: null,
    })
    expect(resultado).toEqual({ ok: false, motivo: 'invalida' })
  })
})
