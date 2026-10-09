import { horaParaMinutos } from '../tempo'
import type { PreferenciaCarga, RotinaRecorrente } from '../rotina/modelo'
import type { InstanciaDiaria, ItemDia } from './modelo'

// Alertas são dados factuais sobre o rascunho do dia — nunca exceções e
// nunca mensagens de validação/persistência. O mesmo cálculo alimenta a
// interface e os testes; nenhuma tela duplica estas regras.
export type TipoAlerta = 'sobreposicao' | 'margem' | 'capacidade' | 'jornada'

export type Alerta = {
  tipo: TipoAlerta
  mensagem: string
}

export class AlertasPendentesError extends Error {
  constructor() {
    super('alertas do dia sem reconhecimento')
    this.name = 'AlertasPendentesError'
  }
}

// Carga diária total que cada preferência tolera sem sinalizar — convenção do
// produto, análoga ao teto diário de estudo do gerador de proposta.
const CARGA_REFERENCIA_DIA: Record<PreferenciaCarga, number> = {
  leve: 8 * 60,
  equilibrada: 10 * 60,
  intensa: 12 * 60,
}

function minutosParaTexto(min: number): string {
  if (min % 60 === 0) return `${min / 60}h`
  if (min > 60) return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
  return `${min}min`
}

type ItemComHorario = ItemDia & { inicio: string; fim: string }

function comHorario(instancia: InstanciaDiaria): ItemComHorario[] {
  return instancia.itens
    .filter((i): i is ItemComHorario => i.inicio !== null && i.fim !== null)
    .sort((a, b) => horaParaMinutos(a.inicio) - horaParaMinutos(b.inicio))
}

function alertasSobreposicao(itens: ItemComHorario[]): Alerta[] {
  const alertas: Alerta[] = []
  for (let i = 0; i < itens.length; i++) {
    for (let j = i + 1; j < itens.length; j++) {
      const a = itens[i]
      const b = itens[j]
      if (
        horaParaMinutos(a.inicio) < horaParaMinutos(b.fim) &&
        horaParaMinutos(b.inicio) < horaParaMinutos(a.fim)
      ) {
        alertas.push({
          tipo: 'sobreposicao',
          mensagem: `Sobreposição: "${a.titulo}" (${a.inicio}–${a.fim}) e "${b.titulo}" (${b.inicio}–${b.fim}) ocupam o mesmo horário.`,
        })
      }
    }
  }
  return alertas
}

// Margem medida entre itens reais — pausas geradas pela transição já são a
// própria margem materializada e não contam como item consecutivo.
function alertasMargem(itens: ItemComHorario[], transicaoMin: number | null): Alerta[] {
  if (transicaoMin === null || transicaoMin <= 0) return []
  const reais = itens.filter((i) => i.origem !== 'pausa')
  const alertas: Alerta[] = []
  for (let i = 0; i + 1 < reais.length; i++) {
    const a = reais[i]
    const b = reais[i + 1]
    const folga = horaParaMinutos(b.inicio) - horaParaMinutos(a.fim)
    if (folga >= 0 && folga < transicaoMin) {
      alertas.push({
        tipo: 'margem',
        mensagem: `Margem de transição reduzida entre "${a.titulo}" e "${b.titulo}": ${folga}min livres, ${transicaoMin}min configurados.`,
      })
    }
  }
  return alertas
}

function alertasCapacidade(
  itens: ItemComHorario[],
  instancia: InstanciaDiaria,
  rotina: RotinaRecorrente
): Alerta[] {
  const total = itens
    .filter((i) => i.origem !== 'pausa')
    .reduce((acc, i) => acc + horaParaMinutos(i.fim) - horaParaMinutos(i.inicio), 0)
  const alertas: Alerta[] = []

  if (instancia.acordar && instancia.dormir) {
    const janela = horaParaMinutos(instancia.dormir) - horaParaMinutos(instancia.acordar)
    if (total > janela) {
      alertas.push({
        tipo: 'capacidade',
        mensagem: `Carga planejada de ${minutosParaTexto(total)} ultrapassa a janela do dia (${minutosParaTexto(janela)} entre acordar e dormir).`,
      })
    }
  }

  const preferencia = rotina.preferenciaCarga
  if (preferencia !== null && total > CARGA_REFERENCIA_DIA[preferencia]) {
    alertas.push({
      tipo: 'capacidade',
      mensagem: `Carga planejada de ${minutosParaTexto(total)} está acima do ritmo ${preferencia} preferido (referência de ${minutosParaTexto(CARGA_REFERENCIA_DIA[preferencia])}).`,
    })
  }
  return alertas
}

// Horas de trabalho contam só itens de categoria "trabalho" — terapia,
// refeições, deslocamento, família, saúde e descanso ficam de fora.
function alertasJornada(itens: ItemComHorario[], rotina: RotinaRecorrente): Alerta[] {
  const trabalho = rotina.trabalho
  if (!trabalho) return []
  const minutos = itens
    .filter((i) => i.categoria === 'trabalho')
    .reduce((acc, i) => acc + horaParaMinutos(i.fim) - horaParaMinutos(i.inicio), 0)
  if (minutos === 0) return []

  const padraoMin = trabalho.horasPadrao * 60
  const limiteMin = trabalho.limiteExcepcional * 60
  const alertas: Alerta[] = []
  const texto = minutosParaTexto(minutos)
  if (minutos > limiteMin) {
    alertas.push({
      tipo: 'jornada',
      mensagem: `Jornada de trabalho de ${texto} ultrapassa o limite excepcional de ${trabalho.limiteExcepcional}h.`,
    })
  } else if (minutos === limiteMin) {
    alertas.push({
      tipo: 'jornada',
      mensagem: `Jornada de trabalho de ${texto} atinge o limite excepcional de ${trabalho.limiteExcepcional}h.`,
    })
  } else if (minutos > limiteMin - 60) {
    alertas.push({
      tipo: 'jornada',
      mensagem: `Jornada de trabalho de ${texto} se aproxima do limite excepcional de ${trabalho.limiteExcepcional}h.`,
    })
  }
  if (minutos > padraoMin && minutos < limiteMin) {
    alertas.push({
      tipo: 'jornada',
      mensagem: `Jornada de trabalho de ${texto} ultrapassa a referência de ${trabalho.horasPadrao}h.`,
    })
  } else if (minutos > padraoMin - 60 && minutos < padraoMin) {
    alertas.push({
      tipo: 'jornada',
      mensagem: `Jornada de trabalho de ${texto} se aproxima da referência de ${trabalho.horasPadrao}h.`,
    })
  }
  return alertas
}

export function avaliarAlertas(instancia: InstanciaDiaria, rotina: RotinaRecorrente): Alerta[] {
  const itens = comHorario(instancia)
  return [
    ...alertasSobreposicao(itens),
    ...alertasMargem(itens, rotina.margens?.transicaoMin ?? null),
    ...alertasCapacidade(itens, instancia, rotina),
    ...alertasJornada(itens, rotina),
  ]
}
