import type { EstadoPrivado } from './estado'

export type PersistenceError =
  | { kind: 'schema-invalido'; detalhe: string }
  | { kind: 'conflito-versao' }
  | { kind: 'armazenamento-indisponivel' }
  | { kind: 'entrada-invalida'; detalhe: string }

export type PersistenceResult<T> = { ok: true; value: T } | { ok: false; error: PersistenceError }

export type EstadoCarregado = {
  version: number
  dados: EstadoPrivado
}

export interface StateStore {
  load(): Promise<PersistenceResult<EstadoCarregado>>
  save(dados: EstadoPrivado, expectedVersion: number): Promise<PersistenceResult<number>>
}

export function storeIndisponivel(): StateStore {
  const falha = { ok: false as const, error: { kind: 'armazenamento-indisponivel' as const } }
  return {
    load: async () => falha,
    save: async () => falha,
  }
}
