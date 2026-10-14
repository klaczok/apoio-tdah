const nextCoreWebVitals = require('eslint-config-next/core-web-vitals')
const globals = require('globals')

module.exports = [
  ...nextCoreWebVitals,
  {
    files: ['tests/**/*.{ts,tsx}', '*.config.js', 'jest.setup.js'],
    languageOptions: {
      globals: globals.jest,
    },
  },
  {
    ignores: ['.next/**', '.vercel/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts'],
  },
]
