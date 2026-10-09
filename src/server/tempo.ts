const FUSO_PADRAO = 'America/Sao_Paulo'

export function dataCivilHoje(now = new Date(), timeZone = FUSO_PADRAO): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now)
}

export function ehDataCivil(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const data = new Date(`${valor}T00:00:00Z`)
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor
}
