import { SchemaInvalidoError } from '../persistence/schema-error'
import type { PersistenceResult, StateStore } from '../persistence/store'
import { validarProposta, type PropostaSemanal } from '../proposta/modelo'
import {
  ConfirmacaoFixoError,
  ItemNaoEncontradoError,
  type RotinaRecorrente,
} from '../rotina/modelo'

export type PropostaAtual = {
  rotina: RotinaRecorrente
  propostaSemanal: PropostaSemanal | null
  semanaAtiva: PropostaSemanal | null
}

// Campos omitidos preservam o valor atual; null remove explicitamente.
export type PropostaNova = {
  propostaSemanal?: PropostaSemanal | null
  semanaAtiva?: PropostaSemanal | null
}

export async function atualizarProposta(
  store: StateStore,
  aplicar: (atual: PropostaAtual) => PropostaNova
): Promise<PersistenceResult<number>> {
  const atual = await store.load()
  if (!atual.ok) return atual

  const resolver = (
    campo: 'propostaSemanal' | 'semanaAtiva',
    resultado: PropostaNova
  ): PropostaSemanal | null => {
    const valor = resultado[campo]
    if (valor === undefined) return atual.value.dados[campo]
    return valor === null ? null : validarProposta(valor)
  }

  let proximo: { propostaSemanal: PropostaSemanal | null; semanaAtiva: PropostaSemanal | null }
  try {
    const resultado = aplicar({
      rotina: atual.value.dados.rotina,
      propostaSemanal: atual.value.dados.propostaSemanal,
      semanaAtiva: atual.value.dados.semanaAtiva,
    })
    proximo = {
      propostaSemanal: resolver('propostaSemanal', resultado),
      semanaAtiva: resolver('semanaAtiva', resultado),
    }
  } catch (error) {
    if (error instanceof ConfirmacaoFixoError) {
      return { ok: false, error: { kind: 'confirmacao-necessaria', detalhe: error.message } }
    }
    if (error instanceof ItemNaoEncontradoError) {
      return { ok: false, error: { kind: 'item-ausente', detalhe: error.message } }
    }
    return {
      ok: false,
      error: {
        kind: 'entrada-invalida',
        detalhe: error instanceof SchemaInvalidoError ? error.message : String(error),
      },
    }
  }

  return store.save({ ...atual.value.dados, ...proximo }, atual.value.version)
}
