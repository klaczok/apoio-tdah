import { randomUUID } from 'crypto'
import { SchemaInvalidoError } from '../persistence/schema-error'
import { ehDataCivil, horaParaMinutos, minutosParaHora } from '../tempo'
import type { OrigemSugestao, ProtecaoSugestao } from '../proposta/modelo'
import { ehOrigem } from '../proposta/modelo'
import {
  ConfirmacaoFixoError,
  ehCategoria,
  ehDiaSemana,
  ehHora,
  ItemNaoEncontradoError,
  type Categoria,
  type DiaSemana,
} from '../rotina/modelo'

// ItemDia é uma cópia independente da sugestão da semana ativa: mexer aqui
// nunca altera a rotina recorrente nem a proposta vigente.
export type ItemDia = {
  id: string
  titulo: string
  categoria: Categoria
  inicio: string | null
  fim: string | null
  protecao: ProtecaoSugestao
  origem: OrigemSugestao
  explicacao: string
}

// Tarefa é um item livre do dia: criada, editada, agendada, dividida e
// removida pelo usuário. `origemId` liga uma parte à tarefa dividida que a
// gerou; remover uma tarefa a apaga por completo (correção de cadastro) —
// descarte com significado histórico é assunto da revisão do dia.
export type Tarefa = {
  id: string
  titulo: string
  categoria: Categoria
  inicio: string | null
  fim: string | null
  nota: string | null
  origemId: string | null
  criadaEm: string
}

export type InstanciaDiaria = {
  data: string
  diaSemana: DiaSemana
  acordar: string | null
  dormir: string | null
  // Em dia presencial: chegada limite - preparação - deslocamento.
  saidaRecomendada: string | null
  // Versão do estado usada na geração — rastreia de qual configuração o dia veio.
  versaoBase: number
  geradaEm: string
  confirmadaEm: string | null
  itens: ItemDia[]
  // Ids de itens promovidos a prioridade do dia — no máximo três, persistidos
  // por instância (prioridades pertencem ao dia, não à rotina).
  prioridades: string[]
  tarefas: Tarefa[]
  notaDia: string | null
  revisao: RevisaoDiaria
}

export const ESTADOS_REVISAO = ['realizado', 'parcial', 'reprogramado', 'descartado'] as const
export type EstadoRevisao = (typeof ESTADOS_REVISAO)[number]

export const ESCALAS_ENERGIA = ['baixa', 'ok', 'alta'] as const
export type EnergiaRevisao = (typeof ESCALAS_ENERGIA)[number]

export const ESCALAS_SOBRECARGA = ['leve', 'ok', 'pesada'] as const
export type SobrecargaRevisao = (typeof ESCALAS_SOBRECARGA)[number]

// Revisão noturna do dia: estados factuais por item/tarefa, escalas curtas e
// campos reflexivos opcionais — sem pontuação, ranking ou interpretação
// clínica. Ausência de estado é "sem registro", nunca uma falha implícita.
export type RevisaoDiaria = {
  estados: Record<string, EstadoRevisao>
  energia: EnergiaRevisao | null
  sobrecarga: SobrecargaRevisao | null
  motivo: string | null
  nota: string | null
  concluidaEm: string | null
}

export function revisaoVazia(): RevisaoDiaria {
  return {
    estados: {},
    energia: null,
    sobrecarga: null,
    motivo: null,
    nota: null,
    concluidaEm: null,
  }
}

export const LIMITE_PRIORIDADES = 3

export class LimitePrioridadesError extends Error {
  constructor() {
    super('no máximo três prioridades')
    this.name = 'LimitePrioridadesError'
  }
}

function horaEditavel(valor: unknown, campo: string): string | null {
  if (valor === null) return null
  if (typeof valor !== 'string' || !ehHora(valor)) {
    throw new SchemaInvalidoError(`${campo} não é horário válido`)
  }
  return valor
}

function ehObjeto(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
}

function validarItemDia(raw: unknown): ItemDia {
  if (!ehObjeto(raw)) {
    throw new SchemaInvalidoError('item do dia não é um objeto')
  }
  const { id, titulo, categoria, inicio, fim, protecao, origem, explicacao } = raw
  if (typeof id !== 'string' || !id) throw new SchemaInvalidoError('item sem id')
  if (typeof titulo !== 'string' || !titulo) throw new SchemaInvalidoError('item sem título')
  if (typeof categoria !== 'string' || !ehCategoria(categoria)) {
    throw new SchemaInvalidoError('categoria inválida')
  }
  const ini = horaEditavel(inicio, 'inicio')
  const fm = horaEditavel(fim, 'fim')
  if (ini !== null && fm !== null && ini >= fm) {
    throw new SchemaInvalidoError('item com início após o fim')
  }
  if ((ini === null) !== (fm === null)) {
    throw new SchemaInvalidoError('item com horário incompleto')
  }
  if (protecao !== 'fixo' && protecao !== 'flexivel') {
    throw new SchemaInvalidoError('proteção inválida')
  }
  if (typeof origem !== 'string' || !ehOrigem(origem)) {
    throw new SchemaInvalidoError('origem inválida')
  }
  if (typeof explicacao !== 'string' || !explicacao) {
    throw new SchemaInvalidoError('item sem explicação')
  }
  return { id, titulo, categoria, inicio: ini, fim: fm, protecao, origem, explicacao }
}

export function validarInstancia(raw: unknown): InstanciaDiaria {
  if (!ehObjeto(raw)) {
    throw new SchemaInvalidoError('instância diária não é um objeto')
  }
  const {
    data,
    diaSemana,
    acordar,
    dormir,
    saidaRecomendada,
    versaoBase,
    geradaEm,
    confirmadaEm,
    itens,
    prioridades,
    tarefas,
    notaDia,
    revisao,
  } = raw
  if (typeof data !== 'string' || !ehDataCivil(data)) {
    throw new SchemaInvalidoError('data da instância inválida')
  }
  if (typeof diaSemana !== 'string' || !ehDiaSemana(diaSemana)) {
    throw new SchemaInvalidoError('dia da semana inválido')
  }
  if (typeof versaoBase !== 'number' || !Number.isInteger(versaoBase) || versaoBase < 0) {
    throw new SchemaInvalidoError('versão base inválida')
  }
  if (typeof geradaEm !== 'string' || !geradaEm) {
    throw new SchemaInvalidoError('instância sem data de geração')
  }
  if (confirmadaEm !== null && typeof confirmadaEm !== 'string') {
    throw new SchemaInvalidoError('confirmação inválida')
  }
  if (!Array.isArray(itens)) {
    throw new SchemaInvalidoError('itens do dia não é uma lista')
  }
  const itensValidados = itens.map(validarItemDia)
  const tarefasValidadas = validarTarefas(tarefas ?? [])
  const ids = new Set([...itensValidados.map((i) => i.id), ...tarefasValidadas.map((t) => t.id)])
  const pris = validarPrioridades(prioridades ?? [], ids)
  return {
    data,
    diaSemana,
    acordar: horaEditavel(acordar ?? null, 'acordar'),
    dormir: horaEditavel(dormir ?? null, 'dormir'),
    saidaRecomendada: horaEditavel(saidaRecomendada ?? null, 'saidaRecomendada'),
    versaoBase,
    geradaEm,
    confirmadaEm: confirmadaEm ?? null,
    itens: itensValidados,
    prioridades: pris,
    tarefas: tarefasValidadas,
    notaDia: validarNotaDia(notaDia ?? null),
    revisao: validarRevisao(revisao),
  }
}

export function ehEstadoRevisao(valor: string): valor is EstadoRevisao {
  return (ESTADOS_REVISAO as readonly string[]).includes(valor)
}

export function ehEnergiaRevisao(valor: string): valor is EnergiaRevisao {
  return (ESCALAS_ENERGIA as readonly string[]).includes(valor)
}

export function ehSobrecargaRevisao(valor: string): valor is SobrecargaRevisao {
  return (ESCALAS_SOBRECARGA as readonly string[]).includes(valor)
}

function validarRevisao(raw: unknown): RevisaoDiaria {
  if (raw === undefined || raw === null) return revisaoVazia()
  if (!ehObjeto(raw)) throw new SchemaInvalidoError('revisão não é um objeto')
  const { estados, energia, sobrecarga, motivo, nota, concluidaEm } = raw
  const mapa: Record<string, EstadoRevisao> = {}
  if (estados !== undefined && estados !== null) {
    if (!ehObjeto(estados)) throw new SchemaInvalidoError('estados da revisão inválidos')
    for (const [id, estado] of Object.entries(estados)) {
      if (typeof estado !== 'string' || !ehEstadoRevisao(estado)) {
        throw new SchemaInvalidoError('estado de revisão inválido')
      }
      mapa[id] = estado
    }
  }
  if (
    energia !== undefined &&
    energia !== null &&
    !(typeof energia === 'string' && (ESCALAS_ENERGIA as readonly string[]).includes(energia))
  ) {
    throw new SchemaInvalidoError('energia fora da escala')
  }
  if (
    sobrecarga !== undefined &&
    sobrecarga !== null &&
    !(
      typeof sobrecarga === 'string' &&
      (ESCALAS_SOBRECARGA as readonly string[]).includes(sobrecarga)
    )
  ) {
    throw new SchemaInvalidoError('sobrecarga fora da escala')
  }
  for (const [campo, valor] of [
    ['motivo', motivo],
    ['nota', nota],
  ] as const) {
    if (valor !== undefined && valor !== null && typeof valor !== 'string') {
      throw new SchemaInvalidoError(`${campo} da revisão inválido`)
    }
  }
  if (concluidaEm !== undefined && concluidaEm !== null && typeof concluidaEm !== 'string') {
    throw new SchemaInvalidoError('conclusão da revisão inválida')
  }
  return {
    estados: mapa,
    energia: (energia ?? null) as EnergiaRevisao | null,
    sobrecarga: (sobrecarga ?? null) as SobrecargaRevisao | null,
    motivo: (motivo ?? null) as string | null,
    nota: (nota ?? null) as string | null,
    concluidaEm: (concluidaEm ?? null) as string | null,
  }
}

function validarTarefa(raw: unknown): Tarefa {
  if (!ehObjeto(raw)) {
    throw new SchemaInvalidoError('tarefa não é um objeto')
  }
  const { id, titulo, categoria, inicio, fim, nota, origemId, criadaEm } = raw
  if (typeof id !== 'string' || !id) throw new SchemaInvalidoError('tarefa sem id')
  if (typeof titulo !== 'string' || !titulo.trim()) {
    throw new SchemaInvalidoError('tarefa sem título')
  }
  if (typeof categoria !== 'string' || !ehCategoria(categoria)) {
    throw new SchemaInvalidoError('categoria inválida')
  }
  const ini = horaEditavel(inicio, 'inicio')
  const fm = horaEditavel(fim, 'fim')
  // Tarefa admite início sem fim (duração opcional); nunca fim sem início.
  if (ini === null && fm !== null) {
    throw new SchemaInvalidoError('tarefa com fim sem início')
  }
  if (ini !== null && fm !== null && ini >= fm) {
    throw new SchemaInvalidoError('tarefa com início após o fim')
  }
  if (nota !== null && nota !== undefined && typeof nota !== 'string') {
    throw new SchemaInvalidoError('nota de tarefa inválida')
  }
  if (origemId !== null && origemId !== undefined && typeof origemId !== 'string') {
    throw new SchemaInvalidoError('origem de tarefa inválida')
  }
  if (typeof criadaEm !== 'string' || !criadaEm) {
    throw new SchemaInvalidoError('tarefa sem data de criação')
  }
  return {
    id,
    titulo: titulo.trim(),
    categoria,
    inicio: ini,
    fim: fm,
    nota: nota ?? null,
    origemId: origemId ?? null,
    criadaEm,
  }
}

function validarTarefas(raw: unknown): Tarefa[] {
  if (!Array.isArray(raw)) {
    throw new SchemaInvalidoError('tarefas não é uma lista')
  }
  const tarefas = raw.map(validarTarefa)
  const ids = new Set(tarefas.map((t) => t.id))
  for (const t of tarefas) {
    if (t.origemId !== null && !ids.has(t.origemId)) {
      throw new SchemaInvalidoError('parte de tarefa sem origem no dia')
    }
  }
  return tarefas
}

function validarNotaDia(raw: unknown): string | null {
  if (raw === null) return null
  if (typeof raw !== 'string') {
    throw new SchemaInvalidoError('nota do dia inválida')
  }
  return raw.trim() || null
}

function validarPrioridades(raw: unknown, idsItens: Set<string>): string[] {
  if (!Array.isArray(raw)) {
    throw new SchemaInvalidoError('prioridades não é uma lista')
  }
  if (raw.length > LIMITE_PRIORIDADES) {
    throw new SchemaInvalidoError('mais de três prioridades')
  }
  const vistos = new Set<string>()
  for (const id of raw) {
    if (typeof id !== 'string' || !idsItens.has(id)) {
      throw new SchemaInvalidoError('prioridade sem item correspondente')
    }
    if (vistos.has(id)) {
      throw new SchemaInvalidoError('prioridade duplicada')
    }
    vistos.add(id)
  }
  return raw as string[]
}

function exigirRascunho(instancia: InstanciaDiaria): void {
  if (instancia.confirmadaEm !== null) {
    throw new ItemNaoEncontradoError('dia já confirmado')
  }
}

function validarHorario(inicio: string | null, fim: string | null): void {
  if ((inicio === null) !== (fim === null)) {
    throw new SchemaInvalidoError('horário incompleto')
  }
  if (inicio !== null && fim !== null && inicio >= fim) {
    throw new SchemaInvalidoError('início após o fim')
  }
}

// inicio sem fim desloca o item mantendo a duração; fim sozinho redimensiona;
// os dois juntos reposicionam e redimensionam. Item sem horário exige o par.
export function ajustarItem(
  instancia: InstanciaDiaria,
  id: string,
  entrada: { inicio?: string | null; fim?: string | null },
  confirmarProtegido = false
): InstanciaDiaria {
  exigirRascunho(instancia)
  const alvo = instancia.itens.find((i) => i.id === id)
  if (!alvo) throw new ItemNaoEncontradoError('item não encontrado')
  if (alvo.protecao === 'fixo' && !confirmarProtegido) throw new ConfirmacaoFixoError()

  let inicio = entrada.inicio === undefined ? alvo.inicio : entrada.inicio
  let fim = entrada.fim === undefined ? alvo.fim : entrada.fim
  if (entrada.inicio !== undefined && entrada.fim === undefined && inicio !== null) {
    if (alvo.inicio === null || alvo.fim === null) {
      throw new SchemaInvalidoError('item sem horário precisa de início e fim')
    }
    const duracao = horaParaMinutos(alvo.fim) - horaParaMinutos(alvo.inicio)
    fim = minutosParaHora(horaParaMinutos(inicio) + duracao)
  }
  validarHorario(inicio, fim)

  return {
    ...instancia,
    itens: instancia.itens.map((i) => (i.id === id ? { ...i, inicio, fim } : i)),
  }
}

export function confirmarDia(instancia: InstanciaDiaria, agora: Date): InstanciaDiaria {
  exigirRascunho(instancia)
  return { ...instancia, confirmadaEm: agora.toISOString() }
}

function exigirItem(instancia: InstanciaDiaria, id: string): void {
  const existe =
    instancia.itens.some((i) => i.id === id) || instancia.tarefas.some((t) => t.id === id)
  if (!existe) {
    throw new ItemNaoEncontradoError('item não encontrado')
  }
}

// Promover marca o item como prioridade do dia. Estourar o limite não remove
// nada: o chamador decide qual prioridade substituir (ou cancela).
export function promoverPrioridade(instancia: InstanciaDiaria, id: string): InstanciaDiaria {
  exigirRascunho(instancia)
  exigirItem(instancia, id)
  if (instancia.prioridades.includes(id)) return instancia
  if (instancia.prioridades.length >= LIMITE_PRIORIDADES) {
    throw new LimitePrioridadesError()
  }
  return { ...instancia, prioridades: [...instancia.prioridades, id] }
}

export function removerPrioridade(instancia: InstanciaDiaria, id: string): InstanciaDiaria {
  exigirRascunho(instancia)
  return { ...instancia, prioridades: instancia.prioridades.filter((p) => p !== id) }
}

// A substituição é a resposta ao limite: sai a prioridade que o usuário
// escolheu, entra o novo item na mesma posição da lista.
export function substituirPrioridade(
  instancia: InstanciaDiaria,
  antigoId: string,
  novoId: string
): InstanciaDiaria {
  exigirRascunho(instancia)
  exigirItem(instancia, novoId)
  const posicao = instancia.prioridades.indexOf(antigoId)
  if (posicao === -1) throw new ItemNaoEncontradoError('prioridade não encontrada')
  if (instancia.prioridades.includes(novoId)) {
    throw new SchemaInvalidoError('item já é prioridade')
  }
  const prioridades = instancia.prioridades.slice()
  prioridades[posicao] = novoId
  return { ...instancia, prioridades }
}

export type EntradaTarefa = {
  titulo: string
  categoria: Categoria
  inicio?: string | null
  fim?: string | null
  nota?: string | null
}

export function adicionarTarefa(
  instancia: InstanciaDiaria,
  entrada: EntradaTarefa,
  agora = new Date()
): InstanciaDiaria {
  exigirRascunho(instancia)
  const tarefa = validarTarefa({
    id: randomUUID(),
    titulo: entrada.titulo,
    categoria: entrada.categoria,
    inicio: entrada.inicio ?? null,
    fim: entrada.fim ?? null,
    nota: entrada.nota ?? null,
    origemId: null,
    criadaEm: agora.toISOString(),
  })
  return { ...instancia, tarefas: [...instancia.tarefas, tarefa] }
}

// inicio/fim presentes na entrada substituem o horário (null desagenda);
// campos omitidos preservam o valor atual.
export function editarTarefa(
  instancia: InstanciaDiaria,
  id: string,
  entrada: Partial<EntradaTarefa>
): InstanciaDiaria {
  exigirRascunho(instancia)
  const alvo = instancia.tarefas.find((t) => t.id === id)
  if (!alvo) throw new ItemNaoEncontradoError('tarefa não encontrada')
  const atualizada = validarTarefa({
    ...alvo,
    titulo: entrada.titulo ?? alvo.titulo,
    categoria: entrada.categoria ?? alvo.categoria,
    inicio: entrada.inicio === undefined ? alvo.inicio : entrada.inicio,
    fim: entrada.fim === undefined ? alvo.fim : entrada.fim,
    nota: entrada.nota === undefined ? alvo.nota : entrada.nota,
  })
  return {
    ...instancia,
    tarefas: instancia.tarefas.map((t) => (t.id === id ? atualizada : t)),
  }
}

// Remover é correção de cadastro por engano — apaga por completo e exige
// confirmação explícita. Não grava nenhum estado "descartada".
export function removerTarefa(
  instancia: InstanciaDiaria,
  id: string,
  confirmar = false
): InstanciaDiaria {
  exigirRascunho(instancia)
  if (!instancia.tarefas.some((t) => t.id === id)) {
    throw new ItemNaoEncontradoError('tarefa não encontrada')
  }
  if (!confirmar) throw new ConfirmacaoFixoError()
  // Partes geradas por divisão ficam órfãs — mantêm origemId como rastro.
  return {
    ...instancia,
    tarefas: instancia.tarefas.filter((t) => t.id !== id),
    prioridades: instancia.prioridades.filter((p) => p !== id),
  }
}

// Dividir cria partes novas apontando para a origem; a tarefa original fica
// intacta (não é marcada como realizada — estado é assunto da revisão).
export function dividirTarefa(
  instancia: InstanciaDiaria,
  id: string,
  titulosPartes: string[],
  agora = new Date()
): InstanciaDiaria {
  exigirRascunho(instancia)
  const alvo = instancia.tarefas.find((t) => t.id === id)
  if (!alvo) throw new ItemNaoEncontradoError('tarefa não encontrada')
  const titulos = titulosPartes.map((t) => t.trim()).filter((t) => t.length > 0)
  if (titulos.length < 2) {
    throw new SchemaInvalidoError('divisão precisa de pelo menos duas partes')
  }
  const partes: Tarefa[] = titulos.map((titulo) => ({
    id: randomUUID(),
    titulo,
    categoria: alvo.categoria,
    inicio: null,
    fim: null,
    nota: null,
    origemId: alvo.id,
    criadaEm: agora.toISOString(),
  }))
  return { ...instancia, tarefas: [...instancia.tarefas, ...partes] }
}

export function anotarDia(instancia: InstanciaDiaria, nota: string): InstanciaDiaria {
  exigirRascunho(instancia)
  return { ...instancia, notaDia: validarNotaDia(nota) }
}

// A revisão registra o que aconteceu — não é edição do plano, então vale
// também depois do dia confirmado. `estado` null limpa o registro do item:
// ausência de estado permanece "sem registro", nunca falha implícita.
// Revisão concluída é imutável — não existe fluxo de correção por enquanto.
export function registrarEstado(
  instancia: InstanciaDiaria,
  id: string,
  estado: EstadoRevisao | null
): InstanciaDiaria {
  if (instancia.revisao.concluidaEm) {
    throw new SchemaInvalidoError('revisão já concluída')
  }
  const existe =
    instancia.itens.some((i) => i.id === id) || instancia.tarefas.some((t) => t.id === id)
  if (!existe) throw new ItemNaoEncontradoError('item não encontrado')
  if (estado !== null && !ehEstadoRevisao(estado)) {
    throw new SchemaInvalidoError('estado de revisão inválido')
  }
  const estados = { ...instancia.revisao.estados }
  if (estado === null) {
    delete estados[id]
  } else {
    estados[id] = estado
  }
  return { ...instancia, revisao: { ...instancia.revisao, estados } }
}

// Concluir a revisão só exige o gesto do usuário — energia, sobrecarga,
// motivo e nota são opcionais e escalas ficam limitadas às opções curtas.
export function concluirRevisao(
  instancia: InstanciaDiaria,
  campos: {
    energia?: EnergiaRevisao | null
    sobrecarga?: SobrecargaRevisao | null
    motivo?: string | null
    nota?: string | null
  },
  agora = new Date()
): InstanciaDiaria {
  if (instancia.revisao.concluidaEm) {
    throw new SchemaInvalidoError('revisão já concluída')
  }
  // Campo omitido preserva o valor atual; string vazia/null limpa.
  const revisao = validarRevisao({
    ...instancia.revisao,
    energia: campos.energia === undefined ? instancia.revisao.energia : campos.energia,
    sobrecarga: campos.sobrecarga === undefined ? instancia.revisao.sobrecarga : campos.sobrecarga,
    motivo: campos.motivo === undefined ? instancia.revisao.motivo : campos.motivo,
    nota: campos.nota === undefined ? instancia.revisao.nota : campos.nota,
    concluidaEm: agora.toISOString(),
  })
  return { ...instancia, revisao }
}

// Síntese factual: conta estados declarados, inclui "sem registro" para o
// que ficou sem marcação e não emite julgamento, nota ou ranking.
export function sinteseRevisao(instancia: InstanciaDiaria): string {
  const ids = [...instancia.itens.map((i) => i.id), ...instancia.tarefas.map((t) => t.id)]
  const contagem: Record<EstadoRevisao | 'semRegistro', number> = {
    realizado: 0,
    parcial: 0,
    reprogramado: 0,
    descartado: 0,
    semRegistro: 0,
  }
  for (const id of ids) {
    const estado = instancia.revisao.estados[id]
    if (estado) contagem[estado] += 1
    else contagem.semRegistro += 1
  }
  const plural = (n: number, singular: string, plurais: string) =>
    `${n} ${n === 1 ? singular : plurais}`
  const partes = [
    plural(contagem.realizado, 'realizado', 'realizados'),
    plural(contagem.parcial, 'parcial', 'parciais'),
    plural(contagem.reprogramado, 'reprogramado', 'reprogramados'),
    plural(contagem.descartado, 'descartado', 'descartados'),
    `${contagem.semRegistro} sem registro`,
  ]
  return `De ${ids.length} itens: ${partes.join(' · ')}.`
}
