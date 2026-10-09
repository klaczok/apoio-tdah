import { randomUUID } from 'crypto'
import { SchemaInvalidoError } from '../persistence/schema-error'

export class ConfirmacaoFixoError extends Error {
  constructor() {
    super('alteração de compromisso fixo exige confirmação específica')
    this.name = 'ConfirmacaoFixoError'
  }
}

export const DIAS_SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'] as const
export type DiaSemana = (typeof DIAS_SEMANA)[number]

export const ROTULOS_DIA: Record<DiaSemana, string> = {
  seg: 'Segunda',
  ter: 'Terça',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
  sab: 'Sábado',
  dom: 'Domingo',
}

export const CATEGORIAS = [
  'trabalho',
  'familia',
  'saude',
  'alimentacao',
  'estudo',
  'musica',
  'descanso',
  'pessoal',
] as const
export type Categoria = (typeof CATEGORIAS)[number]

export const ROTULOS_CATEGORIA: Record<Categoria, string> = {
  trabalho: 'Trabalho',
  familia: 'Família',
  saude: 'Saúde',
  alimentacao: 'Alimentação',
  estudo: 'Estudo',
  musica: 'Música',
  descanso: 'Descanso',
  pessoal: 'Pessoal',
}

export type Compromisso = {
  id: string
  titulo: string
  diaSemana: DiaSemana
  inicio: string
  duracaoMin: number
  categoria: Categoria
  tipo: 'fixo' | 'flexivel'
}

export type TipoPeriodo = 'cuidado-familiar' | 'indisponibilidade'

export type Periodo = {
  id: string
  tipo: TipoPeriodo
  diaSemana: DiaSemana
  inicio: string
  fim: string
}

export type TrabalhoConfig = {
  diasSemana: DiaSemana[]
  horasPadrao: number
  limiteExcepcional: number
}

export type PresencialConfig = {
  diasSemana: DiaSemana[]
  chegadaLimite: string | null
  preparacaoMin: number | null
  deslocamentoMin: number | null
}

export type SonoConfig = {
  dormir: string | null
  acordar: string | null
}

export type MargensConfig = {
  transicaoMin: number | null
}

export type PreferenciaCarga = 'leve' | 'equilibrada' | 'intensa'

export type RotinaRecorrente = {
  trabalho: TrabalhoConfig | null
  presencial: PresencialConfig | null
  compromissos: Compromisso[] | null
  periodos: Periodo[] | null
  sono: SonoConfig | null
  margens: MargensConfig | null
  preferenciaCarga: PreferenciaCarga | null
}

export function rotinaVazia(): RotinaRecorrente {
  return {
    trabalho: null,
    presencial: null,
    compromissos: null,
    periodos: null,
    sono: null,
    margens: null,
    preferenciaCarga: null,
  }
}

export function ehHora(valor: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(valor)
}

export function ehDiaSemana(valor: string): valor is DiaSemana {
  return (DIAS_SEMANA as readonly string[]).includes(valor)
}

export function ehCategoria(valor: string): valor is Categoria {
  return (CATEGORIAS as readonly string[]).includes(valor)
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function horaOuNula(valor: unknown, campo: string): string | null {
  if (valor === null) return null
  if (typeof valor !== 'string' || !ehHora(valor)) {
    throw new SchemaInvalidoError(`${campo} não é horário válido`)
  }
  return valor
}

function minutosOuNulos(valor: unknown, campo: string): number | null {
  if (valor === null) return null
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 0) {
    throw new SchemaInvalidoError(`${campo} não é duração válida`)
  }
  return valor
}

function diasValidos(valor: unknown, campo: string): DiaSemana[] {
  if (!Array.isArray(valor) || valor.some((d) => typeof d !== 'string' || !ehDiaSemana(d))) {
    throw new SchemaInvalidoError(`${campo} contém dia inválido`)
  }
  return valor as DiaSemana[]
}

function validarTrabalho(raw: unknown): TrabalhoConfig {
  if (!ehObjeto(raw)) throw new SchemaInvalidoError('trabalho inválido')
  const diasSemana = diasValidos(raw.diasSemana, 'trabalho.diasSemana')
  const { horasPadrao, limiteExcepcional } = raw
  if (
    typeof horasPadrao !== 'number' ||
    !Number.isFinite(horasPadrao) ||
    typeof limiteExcepcional !== 'number' ||
    !Number.isFinite(limiteExcepcional) ||
    horasPadrao < 1 ||
    limiteExcepcional < horasPadrao ||
    limiteExcepcional > 10
  ) {
    throw new SchemaInvalidoError('trabalho com jornada inválida')
  }
  return { diasSemana, horasPadrao, limiteExcepcional }
}

function validarPresencial(raw: unknown): PresencialConfig {
  if (!ehObjeto(raw)) throw new SchemaInvalidoError('presencial inválido')
  return {
    diasSemana: diasValidos(raw.diasSemana, 'presencial.diasSemana'),
    chegadaLimite: horaOuNula(raw.chegadaLimite, 'presencial.chegadaLimite'),
    preparacaoMin: minutosOuNulos(raw.preparacaoMin, 'presencial.preparacaoMin'),
    deslocamentoMin: minutosOuNulos(raw.deslocamentoMin, 'presencial.deslocamentoMin'),
  }
}

function validarCompromisso(raw: unknown): Compromisso {
  if (!ehObjeto(raw)) throw new SchemaInvalidoError('compromisso inválido')
  const { id, titulo, diaSemana, inicio, duracaoMin, categoria, tipo } = raw
  if (typeof id !== 'string' || !id) throw new SchemaInvalidoError('compromisso sem id')
  if (typeof titulo !== 'string') throw new SchemaInvalidoError('compromisso sem título')
  if (typeof diaSemana !== 'string' || !ehDiaSemana(diaSemana)) {
    throw new SchemaInvalidoError('compromisso com dia inválido')
  }
  if (typeof inicio !== 'string' || !ehHora(inicio)) {
    throw new SchemaInvalidoError('compromisso com horário inválido')
  }
  if (typeof duracaoMin !== 'number' || !Number.isInteger(duracaoMin) || duracaoMin <= 0) {
    throw new SchemaInvalidoError('compromisso com duração inválida')
  }
  if (typeof categoria !== 'string' || !ehCategoria(categoria)) {
    throw new SchemaInvalidoError('compromisso com categoria inválida')
  }
  if (tipo !== 'fixo' && tipo !== 'flexivel') {
    throw new SchemaInvalidoError('compromisso com tipo inválido')
  }
  return { id, titulo, diaSemana, inicio, duracaoMin, categoria, tipo }
}

function validarPeriodo(raw: unknown): Periodo {
  if (!ehObjeto(raw)) throw new SchemaInvalidoError('período inválido')
  const { id, tipo, diaSemana, inicio, fim } = raw
  if (typeof id !== 'string' || !id) throw new SchemaInvalidoError('período sem id')
  if (tipo !== 'cuidado-familiar' && tipo !== 'indisponibilidade') {
    throw new SchemaInvalidoError('período com tipo inválido')
  }
  if (typeof diaSemana !== 'string' || !ehDiaSemana(diaSemana)) {
    throw new SchemaInvalidoError('período com dia inválido')
  }
  if (typeof inicio !== 'string' || !ehHora(inicio) || typeof fim !== 'string' || !ehHora(fim)) {
    throw new SchemaInvalidoError('período com horário inválido')
  }
  if (inicio >= fim) throw new SchemaInvalidoError('período com início após o fim')
  return { id, tipo, diaSemana, inicio, fim }
}

export function definirTrabalho(rotina: RotinaRecorrente, entrada: unknown): RotinaRecorrente {
  return { ...rotina, trabalho: validarTrabalho(entrada) }
}

export function definirPresencial(rotina: RotinaRecorrente, entrada: unknown): RotinaRecorrente {
  return { ...rotina, presencial: validarPresencial(entrada) }
}

export function definirSono(rotina: RotinaRecorrente, entrada: unknown): RotinaRecorrente {
  if (!ehObjeto(entrada)) throw new SchemaInvalidoError('sono inválido')
  return {
    ...rotina,
    sono: {
      dormir: horaOuNula(entrada.dormir, 'sono.dormir'),
      acordar: horaOuNula(entrada.acordar, 'sono.acordar'),
    },
  }
}

export function definirPreferencias(rotina: RotinaRecorrente, entrada: unknown): RotinaRecorrente {
  if (!ehObjeto(entrada)) throw new SchemaInvalidoError('preferências inválidas')
  const carga = entrada.preferenciaCarga
  if (carga !== null && carga !== 'leve' && carga !== 'equilibrada' && carga !== 'intensa') {
    throw new SchemaInvalidoError('preferência de carga inválida')
  }
  return {
    ...rotina,
    margens: { transicaoMin: minutosOuNulos(entrada.transicaoMin, 'margens.transicaoMin') },
    preferenciaCarga: carga,
  }
}

export function acrescentarCompromisso(
  rotina: RotinaRecorrente,
  entrada: unknown
): RotinaRecorrente {
  const compromisso = validarCompromisso(
    ehObjeto(entrada) ? { ...entrada, id: entrada.id ?? randomUUID() } : entrada
  )
  return { ...rotina, compromissos: [...(rotina.compromissos ?? []), compromisso] }
}

export function removerCompromisso(
  rotina: RotinaRecorrente,
  id: string,
  confirmarFixo: boolean
): RotinaRecorrente {
  const lista = rotina.compromissos ?? []
  const alvo = lista.find((c) => c.id === id)
  if (!alvo) throw new SchemaInvalidoError('compromisso não encontrado')
  if (alvo.tipo === 'fixo' && !confirmarFixo) throw new ConfirmacaoFixoError()
  return { ...rotina, compromissos: lista.filter((c) => c.id !== id) }
}

export function acrescentarPeriodo(rotina: RotinaRecorrente, entrada: unknown): RotinaRecorrente {
  const periodo = validarPeriodo(
    ehObjeto(entrada) ? { ...entrada, id: entrada.id ?? randomUUID() } : entrada
  )
  return { ...rotina, periodos: [...(rotina.periodos ?? []), periodo] }
}

export function removerPeriodo(rotina: RotinaRecorrente, id: string): RotinaRecorrente {
  const lista = rotina.periodos ?? []
  if (!lista.some((p) => p.id === id)) throw new SchemaInvalidoError('período não encontrado')
  return { ...rotina, periodos: lista.filter((p) => p.id !== id) }
}

function listaOuNula<T>(valor: unknown, campo: string, validar: (v: unknown) => T): T[] | null {
  if (valor === null) return null
  if (!Array.isArray(valor)) throw new SchemaInvalidoError(`${campo} não é lista`)
  return valor.map(validar)
}

export function validarRotina(raw: unknown): RotinaRecorrente {
  if (!ehObjeto(raw)) throw new SchemaInvalidoError('rotina não é um objeto')

  const nuloOu = <T>(campo: unknown, validar: (v: unknown) => T): T | null =>
    campo === null ? null : validar(campo)

  const sono = nuloOu(raw.sono, (s) => {
    if (!ehObjeto(s)) throw new SchemaInvalidoError('sono inválido')
    return {
      dormir: horaOuNula(s.dormir, 'sono.dormir'),
      acordar: horaOuNula(s.acordar, 'sono.acordar'),
    }
  })
  const margens = nuloOu(raw.margens, (m) => {
    if (!ehObjeto(m)) throw new SchemaInvalidoError('margens inválidas')
    return { transicaoMin: minutosOuNulos(m.transicaoMin, 'margens.transicaoMin') }
  })
  const carga = raw.preferenciaCarga
  if (carga !== null && carga !== 'leve' && carga !== 'equilibrada' && carga !== 'intensa') {
    throw new SchemaInvalidoError('preferência de carga inválida')
  }

  return {
    trabalho: nuloOu(raw.trabalho, validarTrabalho),
    presencial: nuloOu(raw.presencial, validarPresencial),
    compromissos: listaOuNula(raw.compromissos, 'compromissos', validarCompromisso),
    periodos: listaOuNula(raw.periodos, 'periodos', validarPeriodo),
    sono,
    margens,
    preferenciaCarga: carga,
  }
}
