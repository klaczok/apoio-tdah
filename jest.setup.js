// @ts-nocheck — arquivo CommonJS de setup de teste; os stubs de fetch
// abaixo disparam uma falha interna do checador em arquivos .js.
require('@testing-library/jest-dom')

// jsdom não expõe TextEncoder/TextDecoder nem WebCrypto — necessários
// para assinar e verificar tokens de sessão quando páginas importam o
// contexto de auth.
const { TextEncoder, TextDecoder } = require('util')
const { webcrypto } = require('crypto')
globalThis.TextEncoder = globalThis.TextEncoder ?? TextEncoder
globalThis.TextDecoder = globalThis.TextDecoder ?? TextDecoder
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
}

// jsdom não expõe Request/Response — stubs mínimos para dirigir
// handlers de rota HTTP na mesma suíte que renderiza páginas.
if (!globalThis.Response) {
  class TestHeaders {
    constructor(init) {
      this._map = new Map()
      for (const [k, v] of Object.entries(init ?? {})) this._map.set(k.toLowerCase(), v)
    }
    get(k) {
      return this._map.get(k.toLowerCase()) ?? null
    }
    append(k, v) {
      const k2 = k.toLowerCase()
      const atual = this._map.get(k2)
      this._map.set(k2, atual ? `${atual}, ${v}` : v)
    }
  }
  globalThis.Headers = globalThis.Headers ?? TestHeaders
  globalThis.Response = class TestResponse {
    constructor(body, init = {}) {
      this.body = body
      this.status = init.status ?? 200
      this.headers = new TestHeaders(init.headers)
    }
    static json(body, init = {}) {
      const r = new TestResponse(JSON.stringify(body), init)
      r._json = body
      return r
    }
    async json() {
      return this._json ?? (this.body ? JSON.parse(this.body) : null)
    }
  }
}

// Segredo de sessão de teste: mantém verifySessionToken funcional sem
// exigir variável real de ambiente em cada suíte.
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET ?? 'segredo-de-teste-com-entropia-suficiente'

// usePathname precisa do App Router montado; em jsdom a rota vem de
// globalThis.__rotaTeste, definida pelos testes de navegação.
jest.mock('next/navigation', () => {
  const actual = jest.requireActual('next/navigation')
  return { ...actual, usePathname: () => globalThis.__rotaTeste ?? '/' }
})

// Sessão controlada por teste: o mock de next/headers devolve o cookie de
// sessão definido via globalThis.__sessaoTeste (ver tests/helpers/sessao.ts).
jest.mock('next/headers', () => {
  const { SESSION_COOKIE_NAME } = jest.requireActual('./src/server/auth/cookies')
  const { ENTREVISTA_COOKIE } = jest.requireActual('./src/server/entrevista/cookie')
  const valorDe = (nome) =>
    nome === SESSION_COOKIE_NAME
      ? globalThis.__sessaoTeste
      : nome === ENTREVISTA_COOKIE
        ? globalThis.__entrevistaTeste
        : undefined
  return {
    cookies: jest.fn(async () => ({
      get: (nome) => {
        const valor = valorDe(nome)
        return valor ? { name: nome, value: valor } : undefined
      },
      getAll: () =>
        [SESSION_COOKIE_NAME, ENTREVISTA_COOKIE]
          .map((nome) => ({ name: nome, value: valorDe(nome) }))
          .filter((c) => Boolean(c.value)),
      has: (nome) => Boolean(valorDe(nome)),
    })),
  }
})
