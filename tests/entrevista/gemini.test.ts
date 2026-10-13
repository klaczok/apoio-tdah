import { EntrevistadorGemini } from '@/server/ia/gemini'

// O 404 real que a API devolveu em produção — a mensagem já nomeia o
// modelo substituto.
const CORPO_404_REAL = JSON.stringify({
  error: {
    code: 404,
    message:
      'This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash for the latest features and improvements.',
    status: 'NOT_FOUND',
  },
})

function respostaOk(texto: string) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: texto }] } }],
    }),
  } as unknown as Response
}

beforeEach(() => {
  process.env.GEMINI_MODEL = 'gemini-2.5-flash'
  delete (globalThis as { __modeloGeminiVivo?: string }).__modeloGeminiVivo
})

afterEach(() => {
  delete process.env.GEMINI_MODEL
})

describe('EntrevistadorGemini', () => {
  it('404 com modelo sugerido retenta com a substituta — modelo aposentado se autocorrige', async () => {
    const chamadas: string[] = []
    global.fetch = jest.fn(async (url) => {
      chamadas.push(String(url))
      if (chamadas.length === 1) {
        return { ok: false, status: 404, text: async () => CORPO_404_REAL } as unknown as Response
      }
      return respostaOk('Olá! O que mais importa para você?')
    }) as unknown as typeof fetch

    const resultado = await new EntrevistadorGemini('chave-teste').conversar([])
    expect(resultado).toEqual({
      ok: true,
      mensagem: 'Olá! O que mais importa para você?',
      concluiu: false,
    })
    expect(chamadas[0]).toContain('gemini-2.5-flash')
    expect(chamadas[1]).toContain('gemini-3.8-flash')
  })

  it('503 de demanda alta retenta com backoff e aproveita a recuperação', async () => {
    const corpo503 = JSON.stringify({
      error: { code: 503, message: 'high demand', status: 'UNAVAILABLE' },
    })
    let tentativas = 0
    global.fetch = jest.fn(async () => {
      tentativas++
      if (tentativas < 3) {
        return { ok: false, status: 503, text: async () => corpo503 } as unknown as Response
      }
      return respostaOk('Olá! Como tem sido sua semana?')
    }) as unknown as typeof fetch

    const resultado = await new EntrevistadorGemini('chave-teste').conversar([])
    expect(resultado).toEqual({
      ok: true,
      mensagem: 'Olá! Como tem sido sua semana?',
      concluiu: false,
    })
    expect(tentativas).toBe(3)
  })

  it('503 persistente desiste após o backoff — sem loop infinito', async () => {
    let tentativas = 0
    global.fetch = jest.fn(async (url) => {
      // A sondagem /models também falha — só as generateContent contam.
      if (String(url).includes('generateContent')) tentativas++
      return {
        ok: false,
        status: 503,
        text: async () => '{"error":{"status":"UNAVAILABLE"}}',
      } as unknown as Response
    }) as unknown as typeof fetch

    const resultado = await new EntrevistadorGemini('chave-teste').conversar([])
    expect(resultado).toEqual({ ok: false, motivo: 'indisponivel' })
    expect(tentativas).toBe(3)
  }, 15_000)

  it('503 persistente descobre outro modelo disponível na chave', async () => {
    const urls: string[] = []
    global.fetch = jest.fn(async (url) => {
      const u = String(url)
      urls.push(u)
      if (u.endsWith('/models')) {
        return {
          ok: true,
          json: async () => ({
            models: [
              { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
              { name: 'models/gemini-3-pro', supportedGenerationMethods: ['generateContent'] },
            ],
          }),
        } as unknown as Response
      }
      if (u.includes('gemini-3.8-flash')) return respostaOk('Olá! Vamos conversar?')
      return {
        ok: false,
        status: 503,
        text: async () => '{"error":{"status":"UNAVAILABLE"}}',
      } as unknown as Response
    }) as unknown as typeof fetch

    const resultado = await new EntrevistadorGemini('chave-teste').conversar([])
    expect(resultado.ok).toBe(true)
    expect(urls.some((u) => u.includes('gemini-3.8-flash:generateContent'))).toBe(true)
  }, 15_000)

  it('404 sem substituto nomeado devolve indisponível', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 404,
      text: async () => '{"error":{"message":"not found"}}',
    })) as unknown as typeof fetch

    const resultado = await new EntrevistadorGemini('chave-teste').conversar([])
    expect(resultado).toEqual({ ok: false, motivo: 'indisponivel' })
  })

  it('o sinal de prontidão da IA sai da mensagem exibida', async () => {
    global.fetch = jest.fn(async () =>
      respostaOk('Obrigada — já consigo montar sua semana. [[PRONTO]]')
    ) as unknown as typeof fetch

    const resultado = await new EntrevistadorGemini('chave-teste').conversar([])
    expect(resultado).toEqual({
      ok: true,
      mensagem: 'Obrigada — já consigo montar sua semana.',
      concluiu: true,
    })
  })

  it('sem chave, falha sem nem chamar a API', async () => {
    const fetchEspiao = jest.fn()
    global.fetch = fetchEspiao as unknown as typeof fetch
    const resultado = await new EntrevistadorGemini(undefined).conversar([])
    expect(resultado).toEqual({ ok: false, motivo: 'indisponivel' })
    expect(fetchEspiao).not.toHaveBeenCalled()
  })
})
