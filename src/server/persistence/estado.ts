import { ehDataCivil } from '../tempo'

export const SCHEMA_VERSION = 1

export type EstadoPrivado = {
  notasPorDia: Record<string, string>
}

export class SchemaInvalidoError extends Error {
  constructor(detalhe: string) {
    super(`schema inválido: ${detalhe}`)
    this.name = 'SchemaInvalidoError'
  }
}

export function estadoVazio(): EstadoPrivado {
  return { notasPorDia: {} }
}

export function validarEstadoPrivado(raw: unknown): EstadoPrivado {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new SchemaInvalidoError('estado não é um objeto')
  }
  const notas = (raw as Record<string, unknown>).notasPorDia
  if (typeof notas !== 'object' || notas === null || Array.isArray(notas)) {
    throw new SchemaInvalidoError('notasPorDia não é um mapa')
  }
  for (const [data, nota] of Object.entries(notas)) {
    if (!ehDataCivil(data)) {
      throw new SchemaInvalidoError(`data inválida: ${data}`)
    }
    if (typeof nota !== 'string') {
      throw new SchemaInvalidoError(`nota de ${data} não é texto`)
    }
  }
  return { notasPorDia: notas as Record<string, string> }
}
