import {
  estadoVazio,
  validarEstadoPrivado,
  SchemaInvalidoError,
  SCHEMA_VERSION,
  type EstadoPrivado,
} from './estado'
import type { PersistenceResult, EstadoCarregado, StateStore } from './store'

export type Queryable = {
  query(
    text: string,
    params?: unknown[]
  ): Promise<{ rowCount: number | null; rows: Record<string, unknown>[] }>
}

const TABELA_PADRAO = 'estado_usuario'

// Identificador de tabela vem de configuração de ambiente — validação
// estrita porque o nome entra interpolado no SQL (não parametrizável).
const IDENTIFICADOR = /^[a-z_][a-z0-9_]{0,62}$/

// A criação da tabela é compartilhada entre instâncias do mesmo pool/tabela:
// cada usuário tem sua própria instância do store, mas o schema é um só.
const schemasProntos = new WeakMap<Queryable, Map<string, Promise<PersistenceResult<true>>>>()

export class PostgresStateStore implements StateStore {
  private tabela: string
  private proprietario: string

  constructor(
    private db: Queryable,
    tabela = TABELA_PADRAO,
    proprietario: string
  ) {
    if (!IDENTIFICADOR.test(tabela)) {
      throw new SchemaInvalidoError('nome de tabela inválido')
    }
    if (!proprietario) {
      throw new SchemaInvalidoError('proprietário ausente')
    }
    this.tabela = tabela
    this.proprietario = proprietario
  }

  private async ensureSchema(): Promise<PersistenceResult<true>> {
    const porTabela = schemasProntos.get(this.db) ?? new Map()
    schemasProntos.set(this.db, porTabela)
    let pronto = porTabela.get(this.tabela)
    if (!pronto) {
      pronto = (async () => {
        try {
          await this.db.query(`
            CREATE TABLE IF NOT EXISTS ${this.tabela} (
              id TEXT PRIMARY KEY,
              schema_version INTEGER NOT NULL,
              version INTEGER NOT NULL,
              dados JSONB,
              criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
              atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
            )
          `)
          return { ok: true, value: true }
        } catch (error) {
          porTabela.delete(this.tabela)
          console.error('falha ao preparar schema de persistência', error)
          return { ok: false, error: { kind: 'armazenamento-indisponivel' } }
        }
      })()
      porTabela.set(this.tabela, pronto)
    }
    return pronto
  }

  async load(): Promise<PersistenceResult<EstadoCarregado>> {
    const schema = await this.ensureSchema()
    if (!schema.ok) return schema

    let rows
    try {
      ;({ rows } = await this.db.query(
        `SELECT schema_version, version, dados FROM ${this.tabela} WHERE id = $1`,
        [this.proprietario]
      ))
    } catch (error) {
      console.error('falha ao ler estado persistido', error)
      return { ok: false, error: { kind: 'armazenamento-indisponivel' } }
    }

    const row = rows[0]
    if (!row || row.dados === null) {
      return {
        ok: true,
        value: { version: row ? Number(row.version) : 0, dados: estadoVazio() },
      }
    }

    try {
      const dados = validarEstadoPrivado(row.dados, Number(row.schema_version))
      return { ok: true, value: { version: Number(row.version), dados } }
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

  async save(dados: EstadoPrivado, expectedVersion: number): Promise<PersistenceResult<number>> {
    const schema = await this.ensureSchema()
    if (!schema.ok) return schema

    try {
      validarEstadoPrivado(dados, SCHEMA_VERSION)
    } catch (error) {
      return {
        ok: false,
        error: {
          kind: 'schema-invalido',
          detalhe: error instanceof SchemaInvalidoError ? error.message : String(error),
        },
      }
    }

    try {
      const { rowCount } = await this.db.query(
        `UPDATE ${this.tabela}
         SET dados = $1::jsonb,
             schema_version = $2,
             version = version + 1,
             atualizado_em = now()
         WHERE id = $3 AND version = $4`,
        [JSON.stringify(dados), SCHEMA_VERSION, this.proprietario, expectedVersion]
      )
      if (rowCount) {
        return { ok: true, value: expectedVersion + 1 }
      }
      if (expectedVersion > 0) {
        return { ok: false, error: { kind: 'conflito-versao' } }
      }
    } catch (error) {
      console.error('falha ao gravar estado', error)
      return { ok: false, error: { kind: 'armazenamento-indisponivel' } }
    }

    // Primeira gravação: a linha ainda não existe. A PK do Postgres garante
    // que só uma inserção concorrente vence; a derrotada vira conflito.
    try {
      await this.db.query(
        `INSERT INTO ${this.tabela} (id, schema_version, version, dados)
         VALUES ($1, $2, 1, $3::jsonb)`,
        [this.proprietario, SCHEMA_VERSION, JSON.stringify(dados)]
      )
      return { ok: true, value: 1 }
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        return { ok: false, error: { kind: 'conflito-versao' } }
      }
      console.error('falha ao gravar estado', error)
      return { ok: false, error: { kind: 'armazenamento-indisponivel' } }
    }
  }
}
