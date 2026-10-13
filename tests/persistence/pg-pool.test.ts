/** @jest-environment node */

import { normalizarSslMode } from '@/server/persistence/pg-pool'

describe('normalizarSslMode', () => {
  it('reescreve os modos legados para verify-full, preservando o comportamento atual', () => {
    for (const modo of ['require', 'prefer', 'verify-ca']) {
      const url = `postgresql://u:p@h:5432/db?sslmode=${modo}&channel_binding=require`
      expect(normalizarSslMode(url)).toBe(
        'postgresql://u:p@h:5432/db?sslmode=verify-full&channel_binding=require'
      )
    }
  })

  it('não toca em verify-full, disable nem em outros parâmetros', () => {
    for (const url of [
      'postgresql://u:p@h/db?sslmode=verify-full',
      'postgresql://u:p@h/db?sslmode=disable',
      'postgresql://u:p@h/db?connect_timeout=15',
      'postgresql://u:p@h/db',
    ]) {
      expect(normalizarSslMode(url)).toBe(url)
    }
  })

  it('funciona com sslmode no fim da query e com uselibpqcompat ao lado', () => {
    expect(normalizarSslMode('postgresql://u:p@h/db?channel_binding=require&sslmode=require')).toBe(
      'postgresql://u:p@h/db?channel_binding=require&sslmode=verify-full'
    )
  })
})
