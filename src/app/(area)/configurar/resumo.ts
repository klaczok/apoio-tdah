import {
  ROTULOS_CATEGORIA,
  ROTULOS_DIA,
  ROTULOS_TIPO_ESTUDO,
  ROTULOS_TIPO_MUSICA,
  type BlocoEstudo,
  type BlocoMusica,
  type Compromisso,
  type DiaSemana,
  type Periodo,
  type RotinaRecorrente,
} from '@/server/rotina/modelo'
import type { Etapa } from './etapas'

const A_CONFIRMAR = 'A confirmar'

export function rotulosDias(dias: DiaSemana[]): string {
  return dias.map((d) => ROTULOS_DIA[d]).join(', ')
}

export function formatarMinutos(min: number): string {
  if (min % 60 === 0) return `${min / 60}h`
  return min > 60 ? `${Math.floor(min / 60)}h${min % 60}` : `${min} min`
}

export function resumoCompromisso(c: Compromisso): string {
  const tipo = c.tipo === 'fixo' ? 'Fixo' : 'Flexível'
  return `${c.titulo} — ${ROTULOS_DIA[c.diaSemana]} ${c.inicio}, ${c.duracaoMin} min · ${ROTULOS_CATEGORIA[c.categoria]} · ${tipo}`
}

export function resumoPeriodo(p: Periodo): string {
  const tipo = p.tipo === 'cuidado-familiar' ? 'Cuidado familiar' : 'Indisponibilidade'
  return `${tipo} — ${ROTULOS_DIA[p.diaSemana]} ${p.inicio}–${p.fim}`
}

export function resumoBlocoEstudo(b: BlocoEstudo): string {
  const realizado = b.realizadoMin != null ? ` · realizado ${b.realizadoMin} min` : ''
  return `${ROTULOS_DIA[b.diaSemana]} ${b.inicio} · ${ROTULOS_TIPO_ESTUDO[b.tipo]} · planejado ${b.planejadoMin} min${realizado}`
}

export function resumoBlocoMusica(b: BlocoMusica): string {
  return `${ROTULOS_DIA[b.diaSemana]} ${b.inicio} · ${ROTULOS_TIPO_MUSICA[b.tipo]} · ${b.duracaoMin} min`
}

export function resumoEtapa(rotina: RotinaRecorrente, etapa: Etapa): string {
  switch (etapa) {
    case 'trabalho': {
      const t = rotina.trabalho
      if (!t) return A_CONFIRMAR
      const dias = t.diasSemana.length ? rotulosDias(t.diasSemana) : 'sem dias de trabalho'
      return `${t.horasPadrao}h por dia (até ${t.limiteExcepcional}h) · ${dias}`
    }
    case 'presencial': {
      const p = rotina.presencial
      if (!p) return A_CONFIRMAR
      const partes = [
        p.diasSemana.length ? rotulosDias(p.diasSemana) : 'sem dias presenciais',
        p.chegadaLimite ? `chegada ${p.chegadaLimite}` : 'chegada a confirmar',
      ]
      if (p.preparacaoMin != null) partes.push(`preparação ${p.preparacaoMin} min`)
      if (p.deslocamentoMin != null) partes.push(`deslocamento ${p.deslocamentoMin} min`)
      return partes.join(' · ')
    }
    case 'compromissos': {
      const c = rotina.compromissos
      if (c === null) return A_CONFIRMAR
      return c.length ? `${c.length} registrado(s)` : 'Nenhum registrado'
    }
    case 'periodos': {
      const p = rotina.periodos
      if (p === null) return A_CONFIRMAR
      return p.length ? `${p.length} registrado(s)` : 'Nenhum registrado'
    }
    case 'sono': {
      const s = rotina.sono
      if (!s) return A_CONFIRMAR
      return [
        s.dormir ? `dormir ${s.dormir}` : 'dormir a confirmar',
        s.acordar ? `acordar ${s.acordar}` : 'acordar a confirmar',
      ].join(' · ')
    }
    case 'alimentacao': {
      const a = rotina.alimentacao
      if (!a) return A_CONFIRMAR
      const visiveis = a.refeicoes.filter((r) => !r.oculta).length
      const treino =
        a.diasTreino === null
          ? 'dias de treino a confirmar'
          : a.diasTreino.length
            ? `treino ${rotulosDias(a.diasTreino)}`
            : 'sem dias de treino'
      return `${visiveis} lembrete(s) de refeição · ${treino}`
    }
    case 'estudo': {
      const e = rotina.estudo
      if (!e) return A_CONFIRMAR
      const meta =
        e.metaSemanalMin != null
          ? `meta ${formatarMinutos(e.metaSemanalMin)}/semana`
          : 'meta a confirmar'
      return `${meta} · ${e.blocos.length ? `${e.blocos.length} bloco(s)` : 'nenhum bloco'}`
    }
    case 'musica': {
      const m = rotina.musica
      if (m === null) return A_CONFIRMAR
      return m.length ? `${m.length} bloco(s)` : 'Nenhum registrado'
    }
    case 'preferencias': {
      const partes = [
        rotina.margens?.transicaoMin != null
          ? `transição ${rotina.margens.transicaoMin} min`
          : 'transição a confirmar',
        rotina.preferenciaCarga ? `carga ${rotina.preferenciaCarga}` : 'carga a confirmar',
      ]
      return rotina.margens === null && rotina.preferenciaCarga === null
        ? A_CONFIRMAR
        : partes.join(' · ')
    }
  }
}
