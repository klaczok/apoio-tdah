import { SchemaInvalidoError } from '../persistence/schema-error'
import type { PersistenceResult, StateStore } from '../persistence/store'
import { ConfirmacaoFixoError, validarRotina, type RotinaRecorrente } from '../rotina/modelo'

export async function atualizarRotina(
  store: StateStore,
  aplicar: (rotina: RotinaRecorrente) => RotinaRecorrente
): Promise<PersistenceResult<number>> {
  const atual = await store.load()
  if (!atual.ok) return atual

  let rotina: RotinaRecorrente
  try {
    rotina = validarRotina(aplicar(atual.value.dados.rotina))
  } catch (error) {
    if (error instanceof ConfirmacaoFixoError) {
      return { ok: false, error: { kind: 'confirmacao-necessaria', detalhe: error.message } }
    }
    return {
      ok: false,
      error: {
        kind: 'entrada-invalida',
        detalhe: error instanceof SchemaInvalidoError ? error.message : String(error),
      },
    }
  }

  return store.save({ ...atual.value.dados, rotina }, atual.value.version)
}
