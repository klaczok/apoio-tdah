import type { RotinaRecorrente } from '@/server/rotina/modelo'
import type { MensagemConversa } from '@/entrevista/conversa'
import { descartarDocumento } from './documento'

// Material transitório da entrevista — transcrição da conversa e rotina
// interpretada vivem só na memória do processo, indexadas pelo usuário
// da sessão, com vida curta. A rotina interpretada NÃO entra no
// EstadoPrivado na geração: só a confirmação humana a promove (e aí
// junto da SemanaAtiva). Abandono ou saída descarta tudo — uma rotina
// montada manualmente nunca é sobrescrita antes do aceite.
const TTL_MATERIAL_MS = 30 * 60 * 1000

export type HistoricoEntrevista = {
  mensagens: MensagemConversa[]
  /** A IA sinalizou que conhece o suficiente para montar o calendário. */
  pronta: boolean
}

const estadoGlobal = globalThis as {
  __rotinasEntrevista?: Map<string, { rotina: RotinaRecorrente; expira: number }>
  __historicosEntrevista?: Map<string, { historico: HistoricoEntrevista; expira: number }>
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

// A transcrição fica por usuário: quem volta da revisão retoma a
// conversa de onde parou, com todas as mensagens já trocadas.
function mapaHistoricos() {
  return (estadoGlobal.__historicosEntrevista ??= new Map())
}

export function guardarHistorico(usuarioId: string, historico: HistoricoEntrevista): void {
  mapaHistoricos().set(usuarioId, { historico, expira: Date.now() + TTL_MATERIAL_MS })
}

export function obterHistorico(usuarioId: string): HistoricoEntrevista | null {
  const entrada = mapaHistoricos().get(usuarioId)
  if (!entrada) return null
  if (entrada.expira < Date.now()) {
    mapaHistoricos().delete(usuarioId)
    return null
  }
  return entrada.historico
}

export function descartarHistorico(usuarioId: string): void {
  mapaHistoricos().delete(usuarioId)
}

// Descarte total do material transitório da entrevista — documento,
// transcrição e rotina interpretada — nos caminhos de confirmação,
// saída e abandono.
export function descartarMaterial(usuarioId: string): void {
  descartarDocumento(usuarioId)
  descartarRotinaInterpretada(usuarioId)
  descartarHistorico(usuarioId)
}
