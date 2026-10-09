import { randomUUID } from 'crypto'
import { SchemaInvalidoError } from '../persistence/schema-error'

export class ConfirmacaoFixoError extends Error {
  constructor() {
    super('alteração de compromisso fixo exige confirmação específica')
    this.name = 'ConfirmacaoFixoError'
  }
}

export class ItemNaoEncontradoError extends Error {
  constructor(detalhe: string) {
    super(detalhe)
    this.name = 'ItemNaoEncontradoError'
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

export const REFEICAO_REFS = ['cafe-da-manha', 'almoco', 'lanche-da-tarde', 'jantar'] as const
export type RefeicaoRef = (typeof REFEICAO_REFS)[number]

export const REFEICOES_PADRAO: Record<RefeicaoRef, { titulo: string; horario: string }> = {
  'cafe-da-manha': { titulo: 'Café da manhã', horario: '09:00' },
  almoco: { titulo: 'Almoço', horario: '12:30' },
  'lanche-da-tarde': { titulo: 'Lanche da tarde', horario: '16:00' },
  jantar: { titulo: 'Jantar', horario: '20:30' },
}

export const TIPOS_DIA_ALIMENTAR = ['com-treino', 'sem-treino'] as const
export type TipoDiaAlimentar = (typeof TIPOS_DIA_ALIMENTAR)[number]

export const ROTULOS_TIPO_DIA: Record<TipoDiaAlimentar, string> = {
  'com-treino': 'Dias com treino',
  'sem-treino': 'Dias sem treino',
}

export type RefeicaoConfig = {
  ref: RefeicaoRef
  horario: string | null
  oculta: boolean
}

export type AlimentacaoConfig = {
  refeicoes: RefeicaoConfig[]
  diasTreino: DiaSemana[] | null
  referenciaVersao: number | null
}

export const TIPOS_ESTUDO = ['teoria', 'laboratorio-case', 'aplicacao-reflexao', 'revisao'] as const
export type TipoEstudo = (typeof TIPOS_ESTUDO)[number]

export const ROTULOS_TIPO_ESTUDO: Record<TipoEstudo, string> = {
  teoria: 'Teoria',
  'laboratorio-case': 'Laboratório/case',
  'aplicacao-reflexao': 'Aplicação/reflexão',
  revisao: 'Revisão',
}

export type BlocoEstudo = {
  id: string
  tipo: TipoEstudo
  diaSemana: DiaSemana
  inicio: string
  planejadoMin: number
  realizadoMin: number | null
}

export type EstudoConfig = {
  metaSemanalMin: number | null
  blocos: BlocoEstudo[]
}

export const TIPOS_MUSICA = ['estudo-musical', 'composicao', 'violino'] as const
export type TipoMusica = (typeof TIPOS_MUSICA)[number]

export const ROTULOS_TIPO_MUSICA: Record<TipoMusica, string> = {
  'estudo-musical': 'Estudo musical',
  composicao: 'Composição',
  violino: 'Violino',
}

export type BlocoMusica = {
  id: string
  tipo: TipoMusica
  diaSemana: DiaSemana
  inicio: string
  duracaoMin: number
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
  alimentacao: AlimentacaoConfig | null
  estudo: EstudoConfig | null
  musica: BlocoMusica[] | null
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
    alimentacao: null,
    estudo: null,
    musica: null,
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

export function ehRefeicaoRef(valor: string): valor is RefeicaoRef {
  return (REFEICAO_REFS as readonly string[]).includes(valor)
}

export function ehTipoEstudo(valor: string): valor is TipoEstudo {
  return (TIPOS_ESTUDO as readonly string[]).includes(valor)
}

export function ehTipoMusica(valor: string): valor is TipoMusica {
  return (TIPOS_MUSICA as readonly string[]).includes(valor)
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
  return [...new Set(valor as DiaSemana[])]
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

function validarSono(raw: unknown): SonoConfig {
  if (!ehObjeto(raw)) throw new SchemaInvalidoError('sono inválido')
  return {
    dormir: horaOuNula(raw.dormir, 'sono.dormir'),
    acordar: horaOuNula(raw.acordar, 'sono.acordar'),
  }
}

function validarMargens(raw: unknown): MargensConfig {
  if (!ehObjeto(raw)) throw new SchemaInvalidoError('margens inválidas')
  return { transicaoMin: minutosOuNulos(raw.transicaoMin, 'margens.transicaoMin') }
}

function validarCarga(raw: unknown): PreferenciaCarga {
  if (raw !== 'leve' && raw !== 'equilibrada' && raw !== 'intensa') {
    throw new SchemaInvalidoError('preferência de carga inválida')
  }
  return raw
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

function validarRefeicao(raw: unknown): RefeicaoConfig {
  if (!ehObjeto(raw)) throw new SchemaInvalidoError('refeição inválida')
  const { ref, horario, oculta } = raw
  if (typeof ref !== 'string' || !ehRefeicaoRef(ref)) {
    throw new SchemaInvalidoError('refeição desconhecida')
  }
  if (typeof oculta !== 'boolean') {
    throw new SchemaInvalidoError('refeição com ocultação inválida')
  }
  return { ref, horario: horaOuNula(horario, 'refeicao.horario'), oculta }
}

function validarAlimentacao(raw: unknown): AlimentacaoConfig {
  if (!ehObjeto(raw)) throw new SchemaInvalidoError('alimentação inválida')
  const refeicoes = listaOuNula(raw.refeicoes, 'refeicoes', validarRefeicao) ?? []
  const refs = refeicoes.map((r) => r.ref)
  if (new Set(refs).size !== refs.length) {
    throw new SchemaInvalidoError('refeição duplicada')
  }
  const versao = raw.referenciaVersao
  if (versao != null && (typeof versao !== 'number' || !Number.isInteger(versao) || versao < 1)) {
    throw new SchemaInvalidoError('versão de referência inválida')
  }
  return {
    refeicoes,
    diasTreino: raw.diasTreino == null ? null : diasValidos(raw.diasTreino, 'diasTreino'),
    referenciaVersao: versao ?? null,
  }
}

function validarMetaEstudo(valor: unknown): number {
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor <= 0) {
    throw new SchemaInvalidoError('meta semanal de estudo inválida')
  }
  return valor
}

function validarBlocoEstudo(raw: unknown): BlocoEstudo {
  if (!ehObjeto(raw)) throw new SchemaInvalidoError('bloco de estudo inválido')
  const { id, tipo, diaSemana, inicio, planejadoMin, realizadoMin } = raw
  if (typeof id !== 'string' || !id) throw new SchemaInvalidoError('bloco de estudo sem id')
  if (typeof tipo !== 'string' || !ehTipoEstudo(tipo)) {
    throw new SchemaInvalidoError('bloco de estudo com tipo inválido')
  }
  if (typeof diaSemana !== 'string' || !ehDiaSemana(diaSemana)) {
    throw new SchemaInvalidoError('bloco de estudo com dia inválido')
  }
  if (typeof inicio !== 'string' || !ehHora(inicio)) {
    throw new SchemaInvalidoError('bloco de estudo com horário inválido')
  }
  if (typeof planejadoMin !== 'number' || !Number.isInteger(planejadoMin) || planejadoMin <= 0) {
    throw new SchemaInvalidoError('bloco de estudo com tempo planejado inválido')
  }
  if (
    realizadoMin != null &&
    (typeof realizadoMin !== 'number' || !Number.isInteger(realizadoMin) || realizadoMin < 0)
  ) {
    throw new SchemaInvalidoError('bloco de estudo com tempo realizado inválido')
  }
  return { id, tipo, diaSemana, inicio, planejadoMin, realizadoMin: realizadoMin ?? null }
}

function validarEstudo(raw: unknown): EstudoConfig {
  if (!ehObjeto(raw)) throw new SchemaInvalidoError('estudo inválido')
  return {
    metaSemanalMin: raw.metaSemanalMin == null ? null : validarMetaEstudo(raw.metaSemanalMin),
    blocos: listaOuNula(raw.blocos, 'blocos', validarBlocoEstudo) ?? [],
  }
}

function validarBlocoMusica(raw: unknown): BlocoMusica {
  if (!ehObjeto(raw)) throw new SchemaInvalidoError('bloco de música inválido')
  const { id, tipo, diaSemana, inicio, duracaoMin } = raw
  if (typeof id !== 'string' || !id) throw new SchemaInvalidoError('bloco de música sem id')
  if (typeof tipo !== 'string' || !ehTipoMusica(tipo)) {
    throw new SchemaInvalidoError('bloco de música com tipo inválido')
  }
  if (typeof diaSemana !== 'string' || !ehDiaSemana(diaSemana)) {
    throw new SchemaInvalidoError('bloco de música com dia inválido')
  }
  if (typeof inicio !== 'string' || !ehHora(inicio)) {
    throw new SchemaInvalidoError('bloco de música com horário inválido')
  }
  if (typeof duracaoMin !== 'number' || !Number.isInteger(duracaoMin) || duracaoMin <= 0) {
    throw new SchemaInvalidoError('bloco de música com duração inválida')
  }
  return { id, tipo, diaSemana, inicio, duracaoMin }
}

export function definirTrabalho(rotina: RotinaRecorrente, entrada: unknown): RotinaRecorrente {
  return { ...rotina, trabalho: validarTrabalho(entrada) }
}

export function definirPresencial(rotina: RotinaRecorrente, entrada: unknown): RotinaRecorrente {
  return { ...rotina, presencial: validarPresencial(entrada) }
}

export function definirSono(rotina: RotinaRecorrente, entrada: unknown): RotinaRecorrente {
  return { ...rotina, sono: validarSono(entrada) }
}

export function definirPreferencias(rotina: RotinaRecorrente, entrada: unknown): RotinaRecorrente {
  if (!ehObjeto(entrada)) throw new SchemaInvalidoError('preferências inválidas')
  return {
    ...rotina,
    margens: validarMargens({ transicaoMin: entrada.transicaoMin }),
    preferenciaCarga:
      entrada.preferenciaCarga == null ? null : validarCarga(entrada.preferenciaCarga),
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
  if (!alvo) throw new ItemNaoEncontradoError('compromisso não encontrado')
  if (alvo.tipo === 'fixo' && !confirmarFixo) throw new ConfirmacaoFixoError()
  return { ...rotina, compromissos: lista.filter((c) => c.id !== id) }
}

export function acrescentarPeriodo(rotina: RotinaRecorrente, entrada: unknown): RotinaRecorrente {
  const periodo = validarPeriodo(
    ehObjeto(entrada) ? { ...entrada, id: entrada.id ?? randomUUID() } : entrada
  )
  return { ...rotina, periodos: [...(rotina.periodos ?? []), periodo] }
}

export function removerPeriodo(
  rotina: RotinaRecorrente,
  id: string,
  confirmarProtegido: boolean
): RotinaRecorrente {
  const lista = rotina.periodos ?? []
  const alvo = lista.find((p) => p.id === id)
  if (!alvo) throw new ItemNaoEncontradoError('período não encontrado')
  if (alvo.tipo === 'cuidado-familiar' && !confirmarProtegido) throw new ConfirmacaoFixoError()
  return { ...rotina, periodos: lista.filter((p) => p.id !== id) }
}

export function definirAlimentacao(rotina: RotinaRecorrente, entrada: unknown): RotinaRecorrente {
  return { ...rotina, alimentacao: validarAlimentacao(entrada) }
}

export function tipoDiaAlimentar(
  alimentacao: AlimentacaoConfig | null,
  dia: DiaSemana
): TipoDiaAlimentar | null {
  if (!alimentacao || alimentacao.diasTreino === null) return null
  return alimentacao.diasTreino.includes(dia) ? 'com-treino' : 'sem-treino'
}

export function definirMetaEstudo(rotina: RotinaRecorrente, meta: unknown): RotinaRecorrente {
  return {
    ...rotina,
    estudo: {
      metaSemanalMin: meta == null ? null : validarMetaEstudo(meta),
      blocos: rotina.estudo?.blocos ?? [],
    },
  }
}

export function acrescentarBlocoEstudo(
  rotina: RotinaRecorrente,
  entrada: unknown
): RotinaRecorrente {
  const bloco = validarBlocoEstudo(
    ehObjeto(entrada) ? { ...entrada, id: entrada.id ?? randomUUID() } : entrada
  )
  const estudo = rotina.estudo
  return {
    ...rotina,
    estudo: {
      metaSemanalMin: estudo?.metaSemanalMin ?? null,
      blocos: [...(estudo?.blocos ?? []), bloco],
    },
  }
}

export function atualizarBlocoEstudo(
  rotina: RotinaRecorrente,
  id: string,
  entrada: unknown
): RotinaRecorrente {
  const blocos = rotina.estudo?.blocos ?? []
  if (!blocos.some((b) => b.id === id)) {
    throw new ItemNaoEncontradoError('bloco de estudo não encontrado')
  }
  const bloco = validarBlocoEstudo(ehObjeto(entrada) ? { ...entrada, id } : entrada)
  return {
    ...rotina,
    estudo: {
      metaSemanalMin: rotina.estudo?.metaSemanalMin ?? null,
      blocos: blocos.map((b) => (b.id === id ? bloco : b)),
    },
  }
}

export function removerBlocoEstudo(rotina: RotinaRecorrente, id: string): RotinaRecorrente {
  const blocos = rotina.estudo?.blocos ?? []
  if (!blocos.some((b) => b.id === id)) {
    throw new ItemNaoEncontradoError('bloco de estudo não encontrado')
  }
  return {
    ...rotina,
    estudo: {
      metaSemanalMin: rotina.estudo?.metaSemanalMin ?? null,
      blocos: blocos.filter((b) => b.id !== id),
    },
  }
}

export function somatorioEstudo(
  estudo: EstudoConfig | null
): Record<TipoEstudo, { planejadoMin: number; realizadoMin: number }> {
  const totais = Object.fromEntries(
    TIPOS_ESTUDO.map((tipo) => [tipo, { planejadoMin: 0, realizadoMin: 0 }])
  ) as Record<TipoEstudo, { planejadoMin: number; realizadoMin: number }>
  for (const bloco of estudo?.blocos ?? []) {
    totais[bloco.tipo].planejadoMin += bloco.planejadoMin
    totais[bloco.tipo].realizadoMin += bloco.realizadoMin ?? 0
  }
  return totais
}

export function acrescentarBlocoMusica(
  rotina: RotinaRecorrente,
  entrada: unknown
): RotinaRecorrente {
  const bloco = validarBlocoMusica(
    ehObjeto(entrada) ? { ...entrada, id: entrada.id ?? randomUUID() } : entrada
  )
  return { ...rotina, musica: [...(rotina.musica ?? []), bloco] }
}

export function atualizarBlocoMusica(
  rotina: RotinaRecorrente,
  id: string,
  entrada: unknown
): RotinaRecorrente {
  const blocos = rotina.musica ?? []
  if (!blocos.some((b) => b.id === id)) {
    throw new ItemNaoEncontradoError('bloco de música não encontrado')
  }
  const bloco = validarBlocoMusica(ehObjeto(entrada) ? { ...entrada, id } : entrada)
  return { ...rotina, musica: blocos.map((b) => (b.id === id ? bloco : b)) }
}

export function removerBlocoMusica(rotina: RotinaRecorrente, id: string): RotinaRecorrente {
  const blocos = rotina.musica ?? []
  if (!blocos.some((b) => b.id === id)) {
    throw new ItemNaoEncontradoError('bloco de música não encontrado')
  }
  return { ...rotina, musica: blocos.filter((b) => b.id !== id) }
}

function listaOuNula<T>(valor: unknown, campo: string, validar: (v: unknown) => T): T[] | null {
  if (valor == null) return null
  if (!Array.isArray(valor)) throw new SchemaInvalidoError(`${campo} não é lista`)
  return valor.map(validar)
}

export function validarRotina(raw: unknown): RotinaRecorrente {
  if (!ehObjeto(raw)) throw new SchemaInvalidoError('rotina não é um objeto')

  const nuloOu = <T>(campo: unknown, validar: (v: unknown) => T): T | null =>
    campo == null ? null : validar(campo)

  return {
    trabalho: nuloOu(raw.trabalho, validarTrabalho),
    presencial: nuloOu(raw.presencial, validarPresencial),
    compromissos: listaOuNula(raw.compromissos, 'compromissos', validarCompromisso),
    periodos: listaOuNula(raw.periodos, 'periodos', validarPeriodo),
    sono: nuloOu(raw.sono, validarSono),
    alimentacao: nuloOu(raw.alimentacao, validarAlimentacao),
    estudo: nuloOu(raw.estudo, validarEstudo),
    musica: listaOuNula(raw.musica, 'musica', validarBlocoMusica),
    margens: nuloOu(raw.margens, validarMargens),
    preferenciaCarga: nuloOu(raw.preferenciaCarga, validarCarga),
  }
}
