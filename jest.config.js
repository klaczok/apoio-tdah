const nextJest = require('next/jest.js')

const createJestConfig = nextJest({
  dir: './',
})

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
}

// next/jest junta os seus transformIgnorePatterns aos nossos — um arquivo
// ignorado por QUALQUER padrão fica sem transform. pdf-parse/pdfjs-dist
// só publicam ESM, então reescrevemos a lista resolvida mantendo as
// exceções que o Next precisa (geist, next/{dist,src}/..., css modules).
const resolved = createJestConfig(config)
module.exports = async () => {
  const cfg = await resolved()
  cfg.transformIgnorePatterns = [
    '/node_modules/(?!(pdf-parse|pdfjs-dist|geist|next/dist/client|next/dist/shared/lib|next/src/client|next/src/shared/lib)/)',
    '^.+\\.module\\.(css|sass|scss)$',
  ]
  return cfg
}
