export const ETAPAS = [
  'trabalho',
  'presencial',
  'compromissos',
  'periodos',
  'sono',
  'alimentacao',
  'estudo',
  'musica',
  'preferencias',
] as const

export type Etapa = (typeof ETAPAS)[number]

export const ROTULOS_ETAPA: Record<Etapa, string> = {
  trabalho: 'Trabalho',
  presencial: 'Presencial',
  compromissos: 'Compromissos',
  periodos: 'Períodos protegidos',
  sono: 'Sono',
  alimentacao: 'Alimentação',
  estudo: 'Estudo',
  musica: 'Música',
  preferencias: 'Margens e carga',
}

// Etapas de lista permanecem na mesma tela após salvar; as demais avançam.
export const ETAPAS_DE_LISTA: ReadonlySet<Etapa> = new Set([
  'compromissos',
  'periodos',
  'estudo',
  'musica',
])

export function ehEtapa(valor: string): valor is Etapa {
  return (ETAPAS as readonly string[]).includes(valor)
}

export function proximaEtapa(etapa: Etapa): Etapa | null {
  const indice = ETAPAS.indexOf(etapa) + 1
  return indice < ETAPAS.length ? ETAPAS[indice] : null
}
