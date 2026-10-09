import { ehDataCivil } from '../tempo'
import type { PersistenceResult, StateStore } from '../persistence/store'

export async function registrarNotaDoDia(
  store: StateStore,
  data: string,
  nota: string
): Promise<PersistenceResult<number>> {
  if (!ehDataCivil(data)) {
    return { ok: false, error: { kind: 'entrada-invalida', detalhe: `data inválida: ${data}` } }
  }

  const atual = await store.load()
  if (!atual.ok) return atual

  const notasPorDia = { ...atual.value.dados.notasPorDia }
  if (nota.trim()) {
    notasPorDia[data] = nota
  } else {
    delete notasPorDia[data]
  }

  return store.save({ ...atual.value.dados, notasPorDia }, atual.value.version)
}
