/** @jest-environment node */

import { migrarContaLegada, statusMigracao } from '@/server/migracao/legado'
import { MemoryUserStore } from '@/server/identidade/memory'
import { MemoryStateStore } from '@/server/persistence/memory'
import { estadoVazio } from '@/server/persistence/estado'
import { proprietarioDoEstado } from '@/server/persistence'
import { parsePasswordHash, serializePasswordHash } from '@/server/auth/senha'
import { ID_USUARIO_LEGADO } from '@/server/auth/session'
import { rotinaVazia, definirSono } from '@/server/rotina/modelo'
import type { CredencialLegada } from '@/server/auth/config'

process.env.PERSISTENCE_DRIVER = 'memory'

const credencial: CredencialLegada = {
  userEmail: '  PESSOA@Exemplo.COM ',
  passwordHash: parsePasswordHash(
    'scrypt:16384:8:1:00112233445566778899aabbccddeeff:' + 'a'.repeat(128)
  ),
}

function loja() {
  return new MemoryUserStore({ registros: new Map(), indisponivel: false })
}

describe('migração da conta legada', () => {
  it('cria conta persistida com o ID estável do legado e e-mail normalizado', async () => {
    const usuarios = loja()

    const resultado = await migrarContaLegada(usuarios, credencial)

    expect(resultado.status).toBe('migrada')
    if (resultado.status !== 'migrada') return
    expect(resultado.usuario.id).toBe(ID_USUARIO_LEGADO)
    expect(resultado.usuario.email).toBe('pessoa@exemplo.com')
    expect(serializePasswordHash(resultado.usuario.senhaHash)).toBe(
      serializePasswordHash(credencial.passwordHash)
    )
  })

  it('reexecução após sucesso é no-op idempotente', async () => {
    const usuarios = loja()
    await migrarContaLegada(usuarios, credencial)

    const novamente = await migrarContaLegada(usuarios, credencial)

    expect(novamente.status).toBe('ja-migrada')
    // Uma única conta continua existindo para o e-mail.
    const achada = await usuarios.buscarPorEmail('pessoa@exemplo.com')
    expect(achada.ok && achada.value?.id).toBe(ID_USUARIO_LEGADO)
  })

  it('o EstadoPrivado do legado permanece equivalente após a migração', async () => {
    // Linha 'usuario' preexistente com conteúdo real de domínio.
    const estado = new MemoryStateStore()
    const rotina = definirSono(rotinaVazia(), { dormir: '23:00', acordar: '07:00' })
    const antes = await estado.load()
    if (!antes.ok) throw new Error('store indisponível')
    await estado.save({ ...estadoVazio(), rotina }, antes.value.version)
    const gravado = await estado.load()
    if (!gravado.ok) throw new Error('store indisponível')

    const usuarios = loja()
    const resultado = await migrarContaLegada(usuarios, credencial)
    expect(resultado.status).toBe('migrada')

    // O ID migrado resolve para o mesmo proprietário de estado — leitura
    // idêntica, mesma versão, sem cópia nem toque no documento.
    const proprietario = proprietarioDoEstado(ID_USUARIO_LEGADO)
    expect(proprietario).toBe('usuario')
    const depois = await estado.load()
    if (!depois.ok) throw new Error('store indisponível')
    expect(depois.value.dados).toEqual(gravado.value.dados)
    expect(depois.value.version).toBe(gravado.value.version)
  })

  it('e-mail em uso por outra conta aborta antes de qualquer escrita', async () => {
    const usuarios = loja()
    await usuarios.criarUsuario({
      email: 'pessoa@exemplo.com',
      senhaHash: credencial.passwordHash,
    })

    const resultado = await migrarContaLegada(usuarios, credencial)

    expect(resultado.status).toBe('colisao-email')
  })

  it('sem credencial legada informa sem-credencial sem tocar o repositório', async () => {
    const usuarios = loja()
    expect(await migrarContaLegada(usuarios, null)).toEqual({ status: 'sem-credencial' })
    expect(await usuarios.buscarPorEmail('pessoa@exemplo.com')).toEqual({
      ok: true,
      value: null,
    })
  })

  it('repositório indisponível é detectável e retomável', async () => {
    const usuarios = new MemoryUserStore({ registros: new Map(), indisponivel: true })
    const falha = await migrarContaLegada(usuarios, credencial)
    expect(falha.status).toBe('indisponivel')

    // "Recuperado" o armazenamento, a mesma chamada conclui a migração.
    const saudavel = loja()
    expect((await migrarContaLegada(saudavel, credencial)).status).toBe('migrada')
  })

  it('status observável reflete pendente, migrada e colisão', async () => {
    const usuarios = loja()
    expect(await statusMigracao(usuarios, credencial)).toBe('pendente')
    expect(await statusMigracao(usuarios, null)).toBe('sem-credencial')

    await migrarContaLegada(usuarios, credencial)
    expect(await statusMigracao(usuarios, credencial)).toBe('migrada')

    const outra = loja()
    await outra.criarUsuario({
      email: 'pessoa@exemplo.com',
      senhaHash: credencial.passwordHash,
    })
    expect(await statusMigracao(outra, credencial)).toBe('colisao-email')
  })
})
