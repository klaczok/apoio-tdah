const FUSO_PADRAO = 'America/Sao_Paulo'

export function dataCivilHoje(now = new Date(), timeZone = FUSO_PADRAO): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now)
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

export function minutosParaHora(minutos: number): string {
  const clamp = Math.max(0, Math.min(1439, Math.round(minutos)))
  const hh = String(Math.floor(clamp / 60)).padStart(2, '0')
  const mm = String(clamp % 60).padStart(2, '0')
  return `${hh}:${mm}`
}
