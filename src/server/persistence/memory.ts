import {
  estadoVazio,
  validarEstadoPrivado,
  SchemaInvalidoError,
  SCHEMA_VERSION,
  type EstadoPrivado,
} from './estado'
import type { PersistenceResult, EstadoCarregado, StateStore } from './store'

export type CelulaMemoria = {
  dados: unknown
  version: number
  schemaVersion?: number
  indisponivel: boolean
}

function clonar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T
}

export class MemoryStateStore implements StateStore {
  constructor(private celula: CelulaMemoria = { dados: null, version: 0, indisponivel: false }) {}

  async load(): Promise<PersistenceResult<EstadoCarregado>> {
    if (this.celula.indisponivel) {
      return { ok: false, error: { kind: 'armazenamento-indisponivel' } }
    }
    if (this.celula.dados === null) {
      return { ok: true, value: { version: this.celula.version, dados: estadoVazio() } }
    }
    try {
      const dados = validarEstadoPrivado(
        clonar(this.celula.dados),
        this.celula.schemaVersion ?? SCHEMA_VERSION
      )
      return { ok: true, value: { version: this.celula.version, dados } }
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
    if (this.celula.indisponivel) {
      return { ok: false, error: { kind: 'armazenamento-indisponivel' } }
    }
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
    if (this.celula.version !== expectedVersion) {
      return { ok: false, error: { kind: 'conflito-versao' } }
    }
    this.celula.dados = clonar(dados)
    this.celula.schemaVersion = SCHEMA_VERSION
    this.celula.version += 1
    return { ok: true, value: this.celula.version }
  }
}
