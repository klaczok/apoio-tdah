import { SchemaInvalidoError } from '../persistence/schema-error'
import {
  ConfirmacaoFixoError,
  ehCategoria,
  ehDiaSemana,
  ehHora,
  ItemNaoEncontradoError,
  type Categoria,
  type DiaSemana,
} from '../rotina/modelo'

export const ORIGENS_SUGESTAO = [
  'compromisso',
  'periodo',
  'refeicao',
  'preparacao',
  'deslocamento',
  'pausa',
  'trabalho',
  'estudo',
  'musica',
] as const
export type OrigemSugestao = (typeof ORIGENS_SUGESTAO)[number]

export type ProtecaoSugestao = 'fixo' | 'flexivel'

// inicio/fim nulos representam "a confirmar": nenhum horário é inventado.
export type Sugestao = {
  id: string
  diaSemana: DiaSemana
  titulo: string
  categoria: Categoria
  inicio: string | null
  fim: string | null
  protecao: ProtecaoSugestao
  origem: OrigemSugestao
  explicacao: string
  aceita: boolean
}

export type DiaProposta = {
  diaSemana: DiaSemana
  acordar: string | null
  dormir: string | null
  sugestoes: Sugestao[]
}

// A proposta é sempre um rascunho até confirmadaEm ser registrada.
// A versão confirmada persiste separada em `semanaAtiva` no estado do usuário.
export type PropostaSemanal = {
  geradaEm: string
  confirmadaEm: string | null
  dias: DiaProposta[]
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function ehOrigem(valor: string): valor is OrigemSugestao {
  return (ORIGENS_SUGESTAO as readonly string[]).includes(valor)
}

function horaEditavel(valor: unknown, campo: string): string | null {
  if (valor == null) return null
  if (typeof valor !== 'string' || !ehHora(valor)) {
    throw new SchemaInvalidoError(`${campo} não é horário válido`)
  }
  return valor
}

function validarSugestao(raw: unknown): Sugestao {
  if (!ehObjeto(raw)) throw new SchemaInvalidoError('sugestão inválida')
  const { id, diaSemana, titulo, categoria, inicio, fim, protecao, origem, explicacao, aceita } =
    raw
  if (typeof id !== 'string' || !id) throw new SchemaInvalidoError('sugestão sem id')
  if (typeof diaSemana !== 'string' || !ehDiaSemana(diaSemana)) {
    throw new SchemaInvalidoError('sugestão com dia inválido')
  }
  if (typeof titulo !== 'string' || !titulo) {
    throw new SchemaInvalidoError('sugestão sem título')
  }
  if (typeof categoria !== 'string' || !ehCategoria(categoria)) {
    throw new SchemaInvalidoError('sugestão com categoria inválida')
  }
  const ini = horaEditavel(inicio, 'sugestao.inicio')
  const end = horaEditavel(fim, 'sugestao.fim')
  if ((ini === null) !== (end === null)) {
    throw new SchemaInvalidoError('sugestão com horário incompleto')
  }
  if (ini !== null && end !== null && ini >= end) {
    throw new SchemaInvalidoError('sugestão com início após o fim')
  }
  if (protecao !== 'fixo' && protecao !== 'flexivel') {
    throw new SchemaInvalidoError('sugestão com proteção inválida')
  }
  if (typeof origem !== 'string' || !ehOrigem(origem)) {
    throw new SchemaInvalidoError('sugestão com origem inválida')
  }
  if (typeof explicacao !== 'string' || !explicacao) {
    throw new SchemaInvalidoError('sugestão sem explicação')
  }
  if (typeof aceita !== 'boolean') throw new SchemaInvalidoError('sugestão sem estado de aceite')
  return {
    id,
    diaSemana,
    titulo,
    categoria,
    inicio: ini,
    fim: end,
    protecao,
    origem,
    explicacao,
    aceita,
  }
}

function validarDiaProposta(raw: unknown): DiaProposta {
  if (!ehObjeto(raw)) throw new SchemaInvalidoError('dia da proposta inválido')
  const { diaSemana, acordar, dormir, sugestoes } = raw
  if (typeof diaSemana !== 'string' || !ehDiaSemana(diaSemana)) {
    throw new SchemaInvalidoError('dia da proposta inválido')
  }
  if (!Array.isArray(sugestoes)) throw new SchemaInvalidoError('sugestões não são lista')
  return {
    diaSemana,
    acordar: horaEditavel(acordar, 'dia.acordar'),
    dormir: horaEditavel(dormir, 'dia.dormir'),
    sugestoes: sugestoes.map(validarSugestao),
  }
}

export function validarProposta(raw: unknown): PropostaSemanal {
  if (!ehObjeto(raw)) throw new SchemaInvalidoError('proposta não é um objeto')
  const { geradaEm, confirmadaEm, dias } = raw
  if (typeof geradaEm !== 'string' || Number.isNaN(new Date(geradaEm).getTime())) {
    throw new SchemaInvalidoError('proposta sem data de geração')
  }
  if (
    confirmadaEm != null &&
    (typeof confirmadaEm !== 'string' || Number.isNaN(new Date(confirmadaEm).getTime()))
  ) {
    throw new SchemaInvalidoError('data de confirmação inválida')
  }
  if (!Array.isArray(dias) || dias.length !== 7) {
    throw new SchemaInvalidoError('proposta precisa dos sete dias')
  }
  return {
    geradaEm,
    confirmadaEm: confirmadaEm ?? null,
    dias: dias.map(validarDiaProposta),
  }
}

function exigirRascunho(proposta: PropostaSemanal): void {
  if (proposta.confirmadaEm !== null) {
    throw new ItemNaoEncontradoError('proposta já confirmada')
  }
}

function exigirFlexivel(sugestao: Sugestao, confirmarProtegido: boolean): void {
  if (sugestao.protecao === 'fixo' && !confirmarProtegido) throw new ConfirmacaoFixoError()
}

function alterarSugestao(
  proposta: PropostaSemanal,
  id: string,
  alterar: (s: Sugestao) => Sugestao
): PropostaSemanal {
  exigirRascunho(proposta)
  let encontrada = false
  const dias = proposta.dias.map((dia) => ({
    ...dia,
    sugestoes: dia.sugestoes.map((s) => {
      if (s.id !== id) return s
      encontrada = true
      return alterar(s)
    }),
  }))
  if (!encontrada) throw new ItemNaoEncontradoError('sugestão não encontrada')
  return { ...proposta, dias }
}

export function aceitarSugestao(proposta: PropostaSemanal, id: string): PropostaSemanal {
  return alterarSugestao(proposta, id, (s) => ({ ...s, aceita: true }))
}

export function editarSugestao(
  proposta: PropostaSemanal,
  id: string,
  entrada: { titulo?: string; inicio?: string | null; fim?: string | null },
  confirmarProtegido = false
): PropostaSemanal {
  return alterarSugestao(proposta, id, (s) => {
    exigirFlexivel(s, confirmarProtegido)
    const mudou =
      (entrada.titulo !== undefined && entrada.titulo !== s.titulo) ||
      (entrada.inicio !== undefined && entrada.inicio !== s.inicio) ||
      (entrada.fim !== undefined && entrada.fim !== s.fim)
    return validarSugestao({
      ...s,
      titulo: entrada.titulo ?? s.titulo,
      inicio: entrada.inicio === undefined ? s.inicio : entrada.inicio,
      fim: entrada.fim === undefined ? s.fim : entrada.fim,
      explicacao: mudou ? 'Editada manualmente a partir da sugestão gerada.' : s.explicacao,
    })
  })
}

export function removerSugestao(
  proposta: PropostaSemanal,
  id: string,
  confirmarProtegido = false
): PropostaSemanal {
  exigirRascunho(proposta)
  const alvo = proposta.dias.flatMap((d) => d.sugestoes).find((s) => s.id === id)
  if (!alvo) throw new ItemNaoEncontradoError('sugestão não encontrada')
  exigirFlexivel(alvo, confirmarProtegido)
  return {
    ...proposta,
    dias: proposta.dias.map((dia) => ({
      ...dia,
      sugestoes: dia.sugestoes.filter((s) => s.id !== id),
    })),
  }
}

// A confirmação aprova o conjunto inteiro: tudo que entra na versão vigente
// fica marcado como aceito.
export function confirmarProposta(proposta: PropostaSemanal, agora: Date): PropostaSemanal {
  exigirRascunho(proposta)
  return {
    ...proposta,
    confirmadaEm: agora.toISOString(),
    dias: proposta.dias.map((dia) => ({
      ...dia,
      sugestoes: dia.sugestoes.map((s) => ({ ...s, aceita: true })),
    })),
  }
}
