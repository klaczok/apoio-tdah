import { ItemNaoEncontradoError, type RotinaRecorrente } from '../rotina/modelo'
import type { PropostaSemanal } from '../proposta/modelo'
import { diaSemanaDe, horaParaMinutos, minutosParaHora } from '../tempo'
import type { InstanciaDiaria } from './modelo'

// A instância diária copia as sugestões do dia da semana correspondente na
// proposta confirmada. É uma cópia independente: mover ou redimensionar aqui
// não altera a rotina nem a proposta vigente.
export function gerarInstanciaDiaria(
  semana: PropostaSemanal,
  rotina: RotinaRecorrente,
  data: string,
  versaoBase: number,
  agora = new Date()
): InstanciaDiaria {
  const diaSemana = diaSemanaDe(data)
  const dia = semana.dias.find((d) => d.diaSemana === diaSemana)
  if (!dia) throw new ItemNaoEncontradoError(`dia ${diaSemana} ausente na proposta`)

  const presencial = rotina.presencial
  const diaPresencial = presencial?.diasSemana.includes(diaSemana) ?? false
  const dadosCompletos =
    presencial != null &&
    presencial.chegadaLimite != null &&
    presencial.preparacaoMin != null &&
    presencial.deslocamentoMin != null
  const saidaRecomendada =
    diaPresencial && dadosCompletos
      ? minutosParaHora(
          horaParaMinutos(presencial.chegadaLimite!) -
            presencial.preparacaoMin! -
            presencial.deslocamentoMin!
        )
      : null

  return {
    data,
    diaSemana,
    acordar: dia.acordar,
    dormir: dia.dormir,
    saidaRecomendada,
    versaoBase,
    geradaEm: agora.toISOString(),
    confirmadaEm: null,
    itens: dia.sugestoes.map((s) => ({
      id: s.id,
      titulo: s.titulo,
      categoria: s.categoria,
      inicio: s.inicio,
      fim: s.fim,
      protecao: s.protecao,
      origem: s.origem,
      explicacao: s.explicacao,
    })),
  }
}
