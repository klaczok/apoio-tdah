import { parsePasswordHash, serializePasswordHash } from '@/server/auth/senha'
import type { Queryable } from '@/server/persistence/postgres'
import { SchemaInvalidoError } from '@/server/persistence/schema-error'
import {
  normalizarEmail,
  novoUsuarioId,
  validarNovoUsuario,
  type IdentidadeResult,
  type NovoUsuario,
  type UserStore,
  type Usuario,
} from './usuarios'

const TABELA_PADRAO = 'usuarios'

// Identificador de tabela vem de configuração de ambiente — validação
// estrita porque o nome entra interpolado no SQL (não parametrizável).
const IDENTIFICADOR = /^[a-z_][a-z0-9_]{0,62}$/

function paraUsuario(row: Record<string, unknown>): Usuario {
  try {
    return {
      id: String(row.id),
      email: String(row.email),
      senhaHash: parsePasswordHash(String(row.senha_hash)),
      criadoEm: new Date(String(row.criado_em)),
      atualizadoEm: new Date(String(row.atualizado_em)),
    }
  } catch (error) {
    throw new SchemaInvalidoError(error instanceof Error ? error.message : String(error))
  }
}

export class PostgresUserStore implements UserStore {
  private schemaPronto: Promise<IdentidadeResult<true>> | null = null
  private tabela: string

  constructor(
    private db: Queryable,
    tabela = TABELA_PADRAO
  ) {
    if (!IDENTIFICADOR.test(tabela)) {
      throw new SchemaInvalidoError('nome de tabela inválido')
    }
    this.tabela = tabela
  }

  private async ensureSchema(): Promise<IdentidadeResult<true>> {
    this.schemaPronto ??= (async () => {
      try {
        await this.db.query(`
          CREATE TABLE IF NOT EXISTS ${this.tabela} (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            senha_hash TEXT NOT NULL,
            criado_em TIMESTAMPTZ NOT NULL,
            atualizado_em TIMESTAMPTZ NOT NULL
          )
        `)
        return { ok: true, value: true }
      } catch (error) {
        this.schemaPronto = null
        console.error('falha ao preparar schema de identidade', error)
        return { ok: false, error: { kind: 'armazenamento-indisponivel' } }
      }
    })()
    return this.schemaPronto
  }

  async criarUsuario(entrada: NovoUsuario): Promise<IdentidadeResult<Usuario>> {
    const invalido = validarNovoUsuario(entrada)
    if (invalido) return { ok: false, error: invalido }

    const schema = await this.ensureSchema()
    if (!schema.ok) return schema

    const agora = new Date().toISOString()
    const id = entrada.id ?? novoUsuarioId()
    const email = normalizarEmail(entrada.email)

    try {
      await this.db.query(
        `INSERT INTO ${this.tabela} (id, email, senha_hash, criado_em, atualizado_em)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, email, serializePasswordHash(entrada.senhaHash), agora, agora]
      )
      return {
        ok: true,
        value: {
          id,
          email,
          senhaHash: entrada.senhaHash,
          criadoEm: new Date(agora),
          atualizadoEm: new Date(agora),
        },
      }
    } catch (error) {
      // 23505: a constraint UNIQUE do Postgres garante a unicidade do e-mail
      // mesmo sob inserts concorrentes.
      if ((error as { code?: string }).code === '23505') {
        return { ok: false, error: { kind: 'email-em-uso' } }
      }
      console.error('falha ao criar usuário', error)
      return { ok: false, error: { kind: 'armazenamento-indisponivel' } }
    }
  }

  private async buscar(
    coluna: 'id' | 'email',
    valor: string
  ): Promise<IdentidadeResult<Usuario | null>> {
    const schema = await this.ensureSchema()
    if (!schema.ok) return schema

    let rows
    try {
      ;({ rows } = await this.db.query(
        `SELECT id, email, senha_hash, criado_em, atualizado_em
         FROM ${this.tabela} WHERE ${coluna} = $1`,
        [valor]
      ))
    } catch (error) {
      console.error('falha ao consultar usuário', error)
      return { ok: false, error: { kind: 'armazenamento-indisponivel' } }
    }

    const row = rows[0]
    if (!row) return { ok: true, value: null }

    try {
      return { ok: true, value: paraUsuario(row) }
    } catch (error) {
      return {
        ok: false,
        error: {
          kind: 'schema-invalido',
          detalhe: error instanceof SchemaInvalidoError ? error.message : String(error),
        },
      }
    }
  }

  async buscarPorEmail(email: string): Promise<IdentidadeResult<Usuario | null>> {
    return this.buscar('email', normalizarEmail(email))
  }

  async buscarPorId(id: string): Promise<IdentidadeResult<Usuario | null>> {
    return this.buscar('id', id)
  }
}
