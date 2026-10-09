import type { DiaSemana } from './rotina/modelo'

const FUSO_PADRAO = 'America/Sao_Paulo'

export function dataCivilHoje(now = new Date(), timeZone = FUSO_PADRAO): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now)
}

export function dataCivilAmanha(now = new Date(), timeZone = FUSO_PADRAO): string {
  const amanha = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return dataCivilHoje(amanha, timeZone)
}

const ORDEM_JS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const

export function diaSemanaDe(dataCivil: string): DiaSemana {
  return ORDEM_JS[new Date(`${dataCivil}T12:00:00Z`).getUTCDay()]
}

// Soma dias a uma data civil sem depender de fuso — meio-dia UTC evita
// viradas de horário de verão.
export function somarDiasCivil(dataCivil: string, dias: number): string {
  const base = new Date(`${dataCivil}T12:00:00Z`)
  return new Date(base.getTime() + dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function ehDataCivil(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const data = new Date(`${valor}T00:00:00Z`)
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor
}

export function dataCivilParaTexto(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export function dataHoraParaTexto(iso: string, timeZone = FUSO_PADRAO): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function horaParaMinutos(hora: string): number {
  const [hh, mm] = hora.split(':').map(Number)
  return hh * 60 + mm
}

// Intervalo de horário para exibição; ausência de dado fica explícita.
export function horarioParaTexto(inicio: string | null, fim: string | null): string {
  if (!inicio) return 'a confirmar'
  if (!fim) return `${inicio} · duração a confirmar`
  return `${inicio}–${fim}`
}

// Duração em texto curto para a UI: "45min", "8h", "8h30".
export function minutosParaTexto(min: number): string {
  if (min % 60 === 0) return `${min / 60}h`
  if (min > 60) return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
  return `${min}min`
}

export function minutosParaHora(minutos: number): string {
  const clamp = Math.max(0, Math.min(1439, Math.round(minutos)))
  const hh = String(Math.floor(clamp / 60)).padStart(2, '0')
  const mm = String(clamp % 60).padStart(2, '0')
  return `${hh}:${mm}`
}
