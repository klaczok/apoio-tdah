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

// Segredo de sessão de teste: mantém verifySessionToken funcional sem
// exigir variável real de ambiente em cada suíte.
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET ?? 'segredo-de-teste-com-entropia-suficiente'

// Sessão controlada por teste: o mock de next/headers devolve o cookie de
// sessão definido via globalThis.__sessaoTeste (ver tests/helpers/sessao.ts).
jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: (nome) =>
      globalThis.__sessaoTeste && nome === 'apoio_sessao'
        ? { name: nome, value: globalThis.__sessaoTeste }
        : undefined,
    getAll: () =>
      globalThis.__sessaoTeste ? [{ name: 'apoio_sessao', value: globalThis.__sessaoTeste }] : [],
    has: (nome) => Boolean(globalThis.__sessaoTeste) && nome === 'apoio_sessao',
  })),
}))
