import { ehDataCivil } from '../tempo'
import { rotinaVazia, validarRotina, type RotinaRecorrente } from '../rotina/modelo'
import { validarProposta, type PropostaSemanal } from '../proposta/modelo'
import { validarInstancia, type InstanciaDiaria } from '../dia/modelo'
import { SchemaInvalidoError } from './schema-error'

export { SchemaInvalidoError }

export const SCHEMA_VERSION = 5

export type EstadoPrivado = {
  notasPorDia: Record<string, string>
  rotina: RotinaRecorrente
  // propostaSemanal é o rascunho em edição; semanaAtiva é a versão confirmada
  // que origina as instâncias diárias. Nenhuma muda a rotina recorrente.
  propostaSemanal: PropostaSemanal | null
  semanaAtiva: PropostaSemanal | null
  // Instâncias diárias por data civil — cópias independentes da semana ativa.
  dias: Record<string, InstanciaDiaria>
}

export function estadoVazio(): EstadoPrivado {
  return {
    notasPorDia: {},
    rotina: rotinaVazia(),
    propostaSemanal: null,
    semanaAtiva: null,
    dias: {},
  }
}

function migrarDeV1(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new SchemaInvalidoError('estado v1 não é um objeto')
  }
  return { ...(raw as Record<string, unknown>), rotina: rotinaVazia() }
}

function migrarDeV2(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new SchemaInvalidoError('estado v2 não é um objeto')
  }
  return raw
}

function migrarDeV3(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new SchemaInvalidoError('estado v3 não é um objeto')
  }
  return { ...(raw as Record<string, unknown>), propostaSemanal: null, semanaAtiva: null }
}

function migrarDeV4(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new SchemaInvalidoError('estado v4 não é um objeto')
  }
  return { ...(raw as Record<string, unknown>), dias: {} }
}

export function validarEstadoPrivado(raw: unknown, schemaVersion: number): EstadoPrivado {
  if (schemaVersion > SCHEMA_VERSION) {
    throw new SchemaInvalidoError(`versão de schema não suportada: ${schemaVersion}`)
  }
  let dados = raw
  if (schemaVersion <= 1) dados = migrarDeV1(dados)
  if (schemaVersion <= 2) dados = migrarDeV2(dados)
  if (schemaVersion <= 3) dados = migrarDeV3(dados)
  if (schemaVersion <= 4) dados = migrarDeV4(dados)

  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    throw new SchemaInvalidoError('estado não é um objeto')
  }
  const {
    notasPorDia: notas,
    rotina,
    propostaSemanal,
    semanaAtiva,
    dias,
  } = dados as Record<string, unknown>
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
  if (typeof dias !== 'object' || dias === null || Array.isArray(dias)) {
    throw new SchemaInvalidoError('dias não é um mapa')
  }
  const diasValidados: Record<string, InstanciaDiaria> = {}
  for (const [data, instancia] of Object.entries(dias)) {
    if (!ehDataCivil(data)) {
      throw new SchemaInvalidoError(`data inválida: ${data}`)
    }
    const validada = validarInstancia(instancia)
    if (validada.data !== data) {
      throw new SchemaInvalidoError(`instância de ${validada.data} gravada na chave ${data}`)
    }
    diasValidados[data] = validada
  }
  return {
    notasPorDia: notas as Record<string, string>,
    rotina: validarRotina(rotina),
    propostaSemanal: propostaSemanal == null ? null : validarProposta(propostaSemanal),
    semanaAtiva: semanaAtiva == null ? null : validarProposta(semanaAtiva),
    dias: diasValidados,
  }
}
