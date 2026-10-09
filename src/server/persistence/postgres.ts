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

const ROW_ID = 'usuario'

export class PostgresStateStore implements StateStore {
  private schemaPronto: Promise<PersistenceResult<true>> | null = null

  constructor(private db: Queryable) {}

  private async ensureSchema(): Promise<PersistenceResult<true>> {
    this.schemaPronto ??= (async () => {
      try {
        await this.db.query(`
          CREATE TABLE IF NOT EXISTS estado_usuario (
            id TEXT PRIMARY KEY,
            schema_version INTEGER NOT NULL,
            version INTEGER NOT NULL,
            dados JSONB,
            criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
            atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
          )
        `)
        await this.db.query(
          `INSERT INTO estado_usuario (id, schema_version, version, dados)
           VALUES ($1, $2, 0, NULL)
           ON CONFLICT (id) DO NOTHING`,
          [ROW_ID, SCHEMA_VERSION]
        )
        return { ok: true, value: true }
      } catch (error) {
        this.schemaPronto = null
        console.error('falha ao preparar schema de persistência', error)
        return { ok: false, error: { kind: 'armazenamento-indisponivel' } }
      }
    })()
    return this.schemaPronto
  }

  async load(): Promise<PersistenceResult<EstadoCarregado>> {
    const schema = await this.ensureSchema()
    if (!schema.ok) return schema

    let rows
    try {
      ;({ rows } = await this.db.query(
        'SELECT schema_version, version, dados FROM estado_usuario WHERE id = $1',
        [ROW_ID]
      ))
    } catch (error) {
      console.error('falha ao ler estado persistido', error)
      return { ok: false, error: { kind: 'armazenamento-indisponivel' } }
    }

    const row = rows[0]
    if (!row) return { ok: false, error: { kind: 'armazenamento-indisponivel' } }

    if (row.dados === null) {
      return { ok: true, value: { version: Number(row.version), dados: estadoVazio() } }
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
        `UPDATE estado_usuario
         SET dados = $1::jsonb,
             schema_version = $2,
             version = version + 1,
             atualizado_em = now()
         WHERE id = $3 AND version = $4`,
        [JSON.stringify(dados), SCHEMA_VERSION, ROW_ID, expectedVersion]
      )
      if (!rowCount) {
        return { ok: false, error: { kind: 'conflito-versao' } }
      }
      return { ok: true, value: expectedVersion + 1 }
    } catch (error) {
      console.error('falha ao gravar estado', error)
      return { ok: false, error: { kind: 'armazenamento-indisponivel' } }
    }
  }
}
