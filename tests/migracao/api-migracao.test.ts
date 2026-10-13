/** @jest-environment node */

import { GET, POST } from '@/app/api/admin/migracao-legada/route'
import { serializePasswordHash } from '@/server/auth/senha'
import { hashSenha } from '@/server/auth/senha'

process.env.PERSISTENCE_DRIVER = 'memory'
process.env.MIGRATION_SECRET = 'segredo-de-migracao-teste'

let hash: string
beforeAll(async () => {
  hash = serializePasswordHash(await hashSenha('senha-de-teste'))
})

function req(metodo: string, autorizado = true) {
  return new Request('http://localhost/api/admin/migracao-legada', {
    method: metodo,
    headers: autorizado ? { authorization: 'Bearer segredo-de-migracao-teste' } : {},
  })
}

describe('GET/POST /api/admin/migracao-legada', () => {
  it('exige o segredo de migração', async () => {
    const sem = await GET(req('GET', false))
    expect(sem.status).toBe(401)
    const semPost = await POST(req('POST', false))
    expect(semPost.status).toBe(401)
  })

  it('sem credencial legada informa sem-credencial e migração é no-op', async () => {
    delete process.env.AUTH_USER_EMAIL
    delete process.env.AUTH_PASSWORD_HASH

    const antes = await (await GET(req('GET'))).json()
    expect(antes.status).toBe('sem-credencial')
    const post = await (await POST(req('POST'))).json()
    expect(post.status).toBe('sem-credencial')
  })

  it('com credencial, migra uma vez e depois reporta já-migrada', async () => {
    process.env.AUTH_USER_EMAIL = 'Legado@Exemplo.com'
    process.env.AUTH_PASSWORD_HASH = hash

    const migrada = await (await POST(req('POST'))).json()
    expect(['migrada', 'ja-migrada']).toContain(migrada.status)
    if (migrada.status === 'migrada') expect(migrada.usuarioId).toBe('usuario-unico')

    const status = await (await GET(req('GET'))).json()
    expect(status.status).toBe('migrada')

    const novamente = await (await POST(req('POST'))).json()
    expect(novamente.status).toBe('ja-migrada')
    // Resposta não carrega e-mail nem hash.
    expect(JSON.stringify(novamente)).not.toMatch(/exemplo\.com|scrypt/)
  })
})
