/** @jest-environment node */

import { POST } from '@/app/api/notas/dia/route'
import { getStateStore } from '@/server/persistence'

process.env.PERSISTENCE_DRIVER = 'memory'

function requisicao(campos: Record<string, string>) {
  return new Request('http://localhost/api/notas/dia', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(campos),
  })
}

describe('POST /api/notas/dia', () => {
  it('persiste a anotação e confirma só após a gravação', async () => {
    const resposta = await POST(requisicao({ data: '2026-10-09', nota: 'levar documento' }))

    expect(resposta.status).toBe(303)
    expect(resposta.headers.get('location')).toBe('/hoje?salvo=1')

    const lido = await (await getStateStore()).load()
    expect(lido.ok && lido.value.dados.notasPorDia['2026-10-09']).toBe('levar documento')
  })

  it('mantém a anotação em nova leitura, como em recarregar', async () => {
    await POST(requisicao({ data: '2026-10-10', nota: 'texto persistido' }))

    const lido = await (await getStateStore()).load()
    expect(lido.ok && lido.value.dados.notasPorDia['2026-10-10']).toBe('texto persistido')
  })

  it('anotação vazia remove o registro do dia', async () => {
    await POST(requisicao({ data: '2026-10-09', nota: 'algo' }))
    await POST(requisicao({ data: '2026-10-09', nota: '   ' }))

    const lido = await (await getStateStore()).load()
    expect(lido.ok && '2026-10-09' in lido.value.dados.notasPorDia).toBe(false)
  })

  it('data inválida retorna erro de entrada sem gravar', async () => {
    const resposta = await POST(requisicao({ data: 'amanhã', nota: 'x' }))

    expect(resposta.status).toBe(303)
    expect(resposta.headers.get('location')).toBe('/hoje?erro=entrada')
  })
})

describe('seleção do adapter', () => {
  it('sem POSTGRES_URL o adapter responde indisponível, sem exceção', async () => {
    const { createStateStore } = await import('@/server/persistence')
    const store = await createStateStore({ NODE_ENV: 'test' })

    const resultado = await store.load()

    expect(resultado).toEqual({ ok: false, error: { kind: 'armazenamento-indisponivel' } })
  })
})
