/** @jest-environment node */

import { newDb, type IMemoryDb } from 'pg-mem'
import { MemoryStateStore, type CelulaMemoria } from '@/server/persistence/memory'
import { PostgresStateStore, type Queryable } from '@/server/persistence/postgres'
import type { StateStore } from '@/server/persistence/store'
import { estadoVazio } from '@/server/persistence/estado'

type Cenario = {
  nome: string
  preparar: () => Promise<{
    store: StateStore
    corromper: (valor: unknown) => Promise<void>
    quebrar: () => Promise<void>
  }>
}

const cenarios: Cenario[] = [
  {
    nome: 'MemoryStateStore',
    preparar: async () => {
      const celula: CelulaMemoria = { dados: null, version: 0, indisponivel: false }
      const store = new MemoryStateStore(celula)
      return {
        store,
        corromper: async (valor) => {
          celula.dados = valor
        },
        quebrar: async () => {
          celula.indisponivel = true
        },
      }
    },
  },
  {
    nome: 'PostgresStateStore',
    preparar: async () => {
      const db: IMemoryDb = newDb()
      const pool = new (db.adapters.createPg().Pool)() as unknown as Queryable
      let quebrado = false
      const proxy: Queryable = {
        query: (text, params) =>
          quebrado ? Promise.reject(new Error('falha simulada')) : pool.query(text, params),
      }
      const store = new PostgresStateStore(proxy)
      return {
        store,
        corromper: async (valor) => {
          await pool.query('UPDATE estado_usuario SET dados = $1::jsonb', [JSON.stringify(valor)])
        },
        quebrar: async () => {
          quebrado = true
        },
      }
    },
  },
]

describe.each(cenarios)('contrato StateStore — $nome', ({ preparar }) => {
  it('primeira leitura retorna estado vazio versionado', async () => {
    const { store } = await preparar()

    const resultado = await store.load()

    expect(resultado).toEqual({ ok: true, value: { version: 0, dados: estadoVazio() } })
  })

  it('gravação seguida de leitura devolve os mesmos dados', async () => {
    const { store } = await preparar()
    const dados = { notasPorDia: { '2026-10-09': 'levar documento' } }

    expect(await store.save(dados, 0)).toEqual({ ok: true, value: 1 })

    const lido = await store.load()
    expect(lido.ok && lido.value.dados).toEqual(dados)
    expect(lido.ok && lido.value.version).toBe(1)
  })

  it('faz round-trip de caracteres especiais conforme serialização canônica', async () => {
    const { store } = await preparar()
    const texto = 'Aspas "duplas", vírgula; ponto-e-vírgula\nnova linha\r\nCRLF\tTab áéíóú çñ 😀'
    const dados = { notasPorDia: { '2026-10-09': texto } }

    await store.save(dados, 0)

    const lido = await store.load()
    expect(lido.ok && lido.value.dados.notasPorDia['2026-10-09']).toBe(texto)
  })

  it('rejeita gravação com versão defasada sem sobrescrever', async () => {
    const { store } = await preparar()

    await store.save({ notasPorDia: { '2026-10-09': 'primeira' } }, 0)
    const conflito = await store.save({ notasPorDia: { '2026-10-09': 'segunda' } }, 0)

    expect(conflito).toEqual({ ok: false, error: { kind: 'conflito-versao' } })

    const lido = await store.load()
    expect(lido.ok && lido.value.dados.notasPorDia['2026-10-09']).toBe('primeira')
  })

  it('gravação de dados fora do schema não é confirmada', async () => {
    const { store } = await preparar()

    const resultado = await store.save({ notasPorDia: 'invalido' } as never, 0)

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.error.kind).toBe('schema-invalido')
  })

  it('conteúdo armazenado que viola o schema gera erro explícito', async () => {
    const { store, corromper } = await preparar()
    await store.save(estadoVazio(), 0)
    await corromper({ notasPorDia: 'nao-e-um-mapa' })

    const resultado = await store.load()

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.error.kind).toBe('schema-invalido')
  })

  it('falha do armazenamento é erro explícito, não exceção', async () => {
    const { store, quebrar } = await preparar()
    await quebrar()

    const leitura = await store.load()
    const gravacao = await store.save(estadoVazio(), 0)

    for (const resultado of [leitura, gravacao]) {
      expect(resultado.ok).toBe(false)
      if (!resultado.ok) expect(resultado.error.kind).toBe('armazenamento-indisponivel')
    }
  })

  it('não retorna hash de credencial nas leituras comuns', async () => {
    const { store } = await preparar()
    await store.save({ notasPorDia: { '2026-10-09': 'nota' } }, 0)

    const lido = await store.load()
    const serializado = JSON.stringify(lido.ok ? lido.value : lido.error)

    expect(serializado).not.toContain('scrypt')
    expect(serializado).not.toContain('password')
    expect(serializado).not.toContain('senha')
  })
})
