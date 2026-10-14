import { SchemaInvalidoError } from '../persistence/schema-error'
import { ROTULOS_CATEGORIA, ROTULOS_DIA } from '../rotina/modelo'
import type { PropostaSemanal } from './modelo'

// Opinião da IA sobre a semana montada: texto livre persistido junto ao
// estado, sempre acompanhado do que a pessoa disse que mais pesa ("dor").
// É leitura consultiva — nunca altera propostaSemanal nem semanaAtiva.
export type OpiniaoSemanal = {
  texto: string
  dor: string
  geradaEm: string
}

export const LIMITE_DOR = 500
export const LIMITE_TEXTO_IA = 4000

export function validarOpiniao(raw: unknown): OpiniaoSemanal {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new SchemaInvalidoError('opinião não é um objeto')
  }
  const { texto, dor, geradaEm } = raw as Record<string, unknown>
  if (typeof texto !== 'string' || !texto.trim()) {
    throw new SchemaInvalidoError('opinião sem texto')
  }
  if (typeof dor !== 'string' || !dor.trim()) {
    throw new SchemaInvalidoError('opinião sem dor registrada')
  }
  if (typeof geradaEm !== 'string' || Number.isNaN(new Date(geradaEm).getTime())) {
    throw new SchemaInvalidoError('opinião sem data de geração')
  }
  return { texto, dor, geradaEm }
}

// Resumo textual da semana para o prompt da IA: blocos com horário,
// categoria e proteção — sem ids nem explicações internas.
export function descreverSemanaParaIA(proposta: PropostaSemanal): string {
  return proposta.dias
    .map((dia) => {
      const cabeca = `${ROTULOS_DIA[dia.diaSemana]} (acordar ${dia.acordar ?? 'a confirmar'}, dormir ${dia.dormir ?? 'a confirmar'})`
      const itens = dia.sugestoes.map(
        (s) =>
          `- ${s.inicio && s.fim ? `${s.inicio}–${s.fim}` : 'horário a confirmar'} · ${s.titulo} · ${ROTULOS_CATEGORIA[s.categoria]} · ${s.protecao === 'fixo' ? 'protegido' : 'flexível'}`
      )
      return [cabeca, ...(itens.length ? itens : ['- sem blocos'])].join('\n')
    })
    .join('\n')
}
