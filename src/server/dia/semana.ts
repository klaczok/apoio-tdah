import { avaliarAlertas, type Alerta } from './alertas'
import type { EstadoRevisao, InstanciaDiaria } from './modelo'
import {
  CATEGORIAS,
  DIAS_SEMANA,
  type Categoria,
  type DiaSemana,
  type RotinaRecorrente,
} from '../rotina/modelo'
import { diaSemanaDe, horaParaMinutos, somarDiasCivil } from '../tempo'

// A semana começa na segunda, seguindo DIAS_SEMANA do modelo de rotina.
export function diasDaSemana(dataReferencia: string): string[] {
  const recuar = DIAS_SEMANA.indexOf(diaSemanaDe(dataReferencia))
  const segunda = somarDiasCivil(dataReferencia, -recuar)
  return Array.from({ length: 7 }, (_, i) => somarDiasCivil(segunda, i))
}

// Pendência que ainda espera decisão explícita: o usuário marcou o item
// como não concluído (parcial ou reprogramado) e ainda não decidiu o
// destino. Item sem marcação é "sem registro", não pendência. É lista
// factual — pendência não é falta, é estado atual.
export type PendenciaSemana = {
  id: string
  titulo: string
  estado: EstadoRevisao
  // Troca de dia cuja escrita no destino não foi confirmada — a decisão
  // existe, mas a pendência ainda espera nova confirmação.
  naoChegou: boolean
}

export type DiaResumo = {
  data: string
  diaSemana: DiaSemana
  instancia: InstanciaDiaria | null
  minutosPorCategoria: Partial<Record<Categoria, number>>
  minutosRealizadosPorCategoria: Partial<Record<Categoria, number>>
  trabalhoPlanejadoMin: number
  trabalhoRealizadoMin: number
  alertas: Alerta[]
  pendencias: PendenciaSemana[]
}

export type ResumoSemana = {
  dias: DiaResumo[]
  totaisPorCategoria: Partial<Record<Categoria, number>>
  totaisRealizadosPorCategoria: Partial<Record<Categoria, number>>
  trabalhoPlanejadoMin: number
  trabalhoRealizadoMin: number
}

function minutosDe(inicio: string | null, fim: string | null): number {
  if (!inicio || !fim) return 0
  return Math.max(0, horaParaMinutos(fim) - horaParaMinutos(inicio))
}

// Minutos planejados por categoria sobre itens do plano e tarefas do dia.
export function minutosPorCategoria(
  instancia: InstanciaDiaria
): Partial<Record<Categoria, number>> {
  const mapa: Partial<Record<Categoria, number>> = {}
  for (const item of [...instancia.itens, ...instancia.tarefas]) {
    somar(mapa, item.categoria, minutosDe(item.inicio, item.fim))
  }
  return mapa
}

function somar(mapa: Partial<Record<Categoria, number>>, categoria: Categoria, minutos: number) {
  if (minutos <= 0) return
  mapa[categoria] = (mapa[categoria] ?? 0) + minutos
}

// Agrega a semana sem emitir julgamento: só somas de minutos planejados e
// registrados, alertas calculados pelo mesmo módulo do planejamento e a
// lista de pendências que ainda esperam decisão.
export function resumoSemana(
  diasEntrada: { data: string; instancia: InstanciaDiaria | null }[],
  rotina: RotinaRecorrente
): ResumoSemana {
  const dias: DiaResumo[] = []
  const totaisPorCategoria: Partial<Record<Categoria, number>> = {}
  const totaisRealizadosPorCategoria: Partial<Record<Categoria, number>> = {}
  const porData = new Map(diasEntrada.map((e) => [e.data, e.instancia]))
  let trabalhoPlanejadoMin = 0
  let trabalhoRealizadoMin = 0

  for (const { data, instancia } of diasEntrada) {
    const minutos = instancia ? minutosPorCategoria(instancia) : {}
    const minutosRealizadosPorCategoria: Partial<Record<Categoria, number>> = {}
    const pendencias: PendenciaSemana[] = []
    let planejadoTrab = 0
    let realizadoTrab = 0

    if (instancia) {
      for (const categoria of CATEGORIAS) {
        somar(totaisPorCategoria, categoria, minutos[categoria] ?? 0)
      }
      planejadoTrab = minutos.trabalho ?? 0

      for (const item of [...instancia.itens, ...instancia.tarefas]) {
        const duracao = minutosDe(item.inicio, item.fim)
        const estado = instancia.revisao.estados[item.id]
        if (estado === 'realizado') {
          somar(minutosRealizadosPorCategoria, item.categoria, duracao)
          somar(totaisRealizadosPorCategoria, item.categoria, duracao)
          if (item.categoria === 'trabalho') realizadoTrab += duracao
        }
        if (estado === 'parcial' || estado === 'reprogramado') {
          const decisao = instancia.revisao.decisoes[item.id]
          // Troca decidida mas não materializada no destino continua
          // pendência — a decisão existe, a chegada não.
          const naoChegou =
            decisao?.tipo === 'trocar-dia' &&
            Boolean(decisao.destino) &&
            !porData.get(decisao.destino ?? '')?.tarefas.some((t) => t.origemId === item.id)
          if (!decisao || naoChegou) {
            pendencias.push({ id: item.id, titulo: item.titulo, estado, naoChegou })
          }
        }
      }
    }

    trabalhoPlanejadoMin += planejadoTrab
    trabalhoRealizadoMin += realizadoTrab
    dias.push({
      data,
      diaSemana: diaSemanaDe(data),
      instancia,
      minutosPorCategoria: minutos,
      minutosRealizadosPorCategoria,
      trabalhoPlanejadoMin: planejadoTrab,
      trabalhoRealizadoMin: realizadoTrab,
      alertas: instancia ? avaliarAlertas(instancia, rotina) : [],
      pendencias,
    })
  }

  return {
    dias,
    totaisPorCategoria,
    totaisRealizadosPorCategoria,
    trabalhoPlanejadoMin,
    trabalhoRealizadoMin,
  }
}
