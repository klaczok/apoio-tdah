import { ehDataCivil } from '../tempo'
import { rotinaVazia, validarRotina, type RotinaRecorrente } from '../rotina/modelo'
import { SchemaInvalidoError } from './schema-error'

export { SchemaInvalidoError }

export const SCHEMA_VERSION = 2

export type EstadoPrivado = {
  notasPorDia: Record<string, string>
  rotina: RotinaRecorrente
}

export function estadoVazio(): EstadoPrivado {
  return { notasPorDia: {}, rotina: rotinaVazia() }
}

function migrarDeV1(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new SchemaInvalidoError('estado v1 não é um objeto')
  }
  return { ...(raw as Record<string, unknown>), rotina: rotinaVazia() }
}

export function validarEstadoPrivado(raw: unknown, schemaVersion: number): EstadoPrivado {
  if (schemaVersion > SCHEMA_VERSION) {
    throw new SchemaInvalidoError(`versão de schema não suportada: ${schemaVersion}`)
  }
  let dados = raw
  if (schemaVersion === 1) dados = migrarDeV1(dados)

  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    throw new SchemaInvalidoError('estado não é um objeto')
  }
  const { notasPorDia: notas, rotina } = dados as Record<string, unknown>
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
  return {
    notasPorDia: notas as Record<string, string>,
    rotina: validarRotina(rotina),
  }
}
