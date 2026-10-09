import { SchemaInvalidoError } from '../persistence/schema-error'
import type { PersistenceResult, StateStore } from '../persistence/store'
import type { InstanciaDiaria } from '../dia/modelo'
import { LimitePrioridadesError, validarInstancia } from '../dia/modelo'
import { AlertasPendentesError } from '../dia/alertas'
import {
  ConfirmacaoFixoError,
  ItemNaoEncontradoError,
  type RotinaRecorrente,
} from '../rotina/modelo'
import type { PropostaSemanal } from '../proposta/modelo'

export type DiaAtual = {
  rotina: RotinaRecorrente
  semanaAtiva: PropostaSemanal | null
  instancia: InstanciaDiaria | null
  versao: number
}

// Campos omitidos preservam o valor atual; null remove a instância da data.
export type DiaNovo = {
  instancia?: InstanciaDiaria | null
}

export async function atualizarDia(
  store: StateStore,
  data: string,
  aplicar: (atual: DiaAtual) => DiaNovo
): Promise<PersistenceResult<number>> {
  const atual = await store.load()
  if (!atual.ok) return atual

  let proxima: InstanciaDiaria | null
  try {
    const resultado = aplicar({
      rotina: atual.value.dados.rotina,
      semanaAtiva: atual.value.dados.semanaAtiva,
      instancia: atual.value.dados.dias[data] ?? null,
      versao: atual.value.version,
    })
    if (resultado.instancia === undefined) return { ok: true, value: atual.value.version }
    if (resultado.instancia === null) {
      proxima = null
    } else {
      proxima = validarInstancia(resultado.instancia)
      if (proxima.data !== data) {
        throw new SchemaInvalidoError('instância de outra data')
      }
    }
  } catch (error) {
    if (error instanceof ConfirmacaoFixoError) {
      return { ok: false, error: { kind: 'confirmacao-necessaria', detalhe: error.message } }
    }
    if (error instanceof ItemNaoEncontradoError) {
      return { ok: false, error: { kind: 'item-ausente', detalhe: error.message } }
    }
    if (error instanceof LimitePrioridadesError) {
      return { ok: false, error: { kind: 'prioridade-cheia', detalhe: error.message } }
    }
    if (error instanceof AlertasPendentesError) {
      return { ok: false, error: { kind: 'alerta-pendente', detalhe: error.message } }
    }
    return {
      ok: false,
      error: {
        kind: 'entrada-invalida',
        detalhe: error instanceof SchemaInvalidoError ? error.message : String(error),
      },
    }
  }

  const dias = { ...atual.value.dados.dias }
  if (proxima === null) delete dias[data]
  else dias[data] = proxima

  return store.save({ ...atual.value.dados, dias }, atual.value.version)
}
