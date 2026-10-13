import type { RotinaRecorrente } from '@/server/rotina/modelo'
import { descartarDocumento } from './documento'

// Rotina interpretada pela IA: material transitório como o documento —
// vive só na memória do processo, indexada pelo usuário da sessão, com
// vida curta. A rotina interpretada NÃO entra no EstadoPrivado na
// geração: só a confirmação humana a promove (e aí junto da
// SemanaAtiva). Abandono ou saída descarta tudo — uma rotina montada
// manualmente nunca é sobrescrita antes do aceite.
const TTL_MATERIAL_MS = 30 * 60 * 1000

const estadoGlobal = globalThis as {
  __rotinasEntrevista?: Map<string, { rotina: RotinaRecorrente; expira: number }>
}

function mapa() {
  return (estadoGlobal.__rotinasEntrevista ??= new Map())
}

export function guardarRotinaInterpretada(usuarioId: string, rotina: RotinaRecorrente): void {
  mapa().set(usuarioId, { rotina, expira: Date.now() + TTL_MATERIAL_MS })
}

export function obterRotinaInterpretada(usuarioId: string): RotinaRecorrente | null {
  const entrada = mapa().get(usuarioId)
  if (!entrada) return null
  if (entrada.expira < Date.now()) {
    mapa().delete(usuarioId)
    return null
  }
  return entrada.rotina
}

export function descartarRotinaInterpretada(usuarioId: string): void {
  mapa().delete(usuarioId)
}

// Descarte total do material transitório da entrevista — documento e
// rotina interpretada — nos caminhos de confirmação, saída e abandono.
export function descartarMaterial(usuarioId: string): void {
  descartarDocumento(usuarioId)
  descartarRotinaInterpretada(usuarioId)
}
