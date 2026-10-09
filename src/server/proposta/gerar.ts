import { randomUUID } from 'crypto'
import { horaParaMinutos, minutosParaHora } from '../tempo'
import {
  DIAS_SEMANA,
  REFEICOES_PADRAO,
  ROTULOS_TIPO_ESTUDO,
  ROTULOS_TIPO_MUSICA,
  tipoDiaAlimentar,
  type Categoria,
  type DiaSemana,
  type PreferenciaCarga,
  type RotinaRecorrente,
} from '../rotina/modelo'
import type {
  DiaProposta,
  OrigemSugestao,
  PropostaSemanal,
  ProtecaoSugestao,
  Sugestao,
} from './modelo'

type Intervalo = { inicio: number; fim: number }

// Duração operacional de um lembrete de refeição — convenção do produto,
// não parte da prescrição.
const DURACAO_REFEICAO_MIN = 30
const MIN_BLOCO_FLEXIVEL_MIN = 15

// Distribuição gradual da meta de estudo: teto de minutos por dia conforme carga.
const TETO_ESTUDO_DIA: Record<PreferenciaCarga, number> = {
  leve: 30,
  equilibrada: 60,
  intensa: 120,
}
const TETO_ESTUDO_PADRAO = 60

type EntradaSugestao = {
  diaSemana: DiaSemana
  titulo: string
  categoria: Categoria
  inicio: string | null
  fim: string | null
  protecao: ProtecaoSugestao
  origem: OrigemSugestao
  explicacao: string
}

function sugestao(entrada: EntradaSugestao): Sugestao {
  return { id: randomUUID(), aceita: false, ...entrada }
}

function sobrepoe(a: Intervalo, b: Intervalo): boolean {
  return a.inicio < b.fim && b.inicio < a.fim
}

function maiorLacuna(lacunasLivres: Intervalo[]): Intervalo | null {
  return lacunasLivres.reduce<Intervalo | null>(
    (acc, l) => (!acc || l.fim - l.inicio > acc.fim - acc.inicio ? l : acc),
    null
  )
}

// Lacunas livres dentro da janela, já descontando a margem de transição
// ao redor de cada item ocupado — margens valem antes dos objetivos flexíveis.
function lacunas(janela: Intervalo | null, ocupados: Intervalo[], margem: number): Intervalo[] {
  if (!janela) return []
  const expandidos = ocupados
    .map((o) => ({ inicio: o.inicio - margem, fim: o.fim + margem }))
    .sort((a, b) => a.inicio - b.inicio)
  const livres: Intervalo[] = []
  let cursor = janela.inicio
  for (const o of expandidos) {
    if (o.inicio > cursor) livres.push({ inicio: cursor, fim: Math.min(o.inicio, janela.fim) })
    cursor = Math.max(cursor, o.fim)
  }
  if (cursor < janela.fim) livres.push({ inicio: cursor, fim: janela.fim })
  return livres.filter((l) => l.fim > l.inicio)
}

// Escolhe a primeira lacuna que comporte `duracao` a partir de `preferido`;
// se nenhuma couber inteira, usa a maior lacuna e informa a capacidade.
function posicionarFlexivel(
  lacunasLivres: Intervalo[],
  duracao: number,
  preferido: number | null
): { intervalo: Intervalo; completo: boolean } | null {
  const inicioPreferido = preferido ?? lacunasLivres[0]?.inicio ?? null
  if (inicioPreferido === null) return null
  for (const lacuna of lacunasLivres) {
    const inicio = Math.max(lacuna.inicio, inicioPreferido)
    if (inicio < lacuna.fim && lacuna.fim - inicio >= duracao) {
      return { intervalo: { inicio, fim: inicio + duracao }, completo: true }
    }
  }
  const maior = maiorLacuna(lacunasLivres)
  if (!maior || maior.fim - maior.inicio < MIN_BLOCO_FLEXIVEL_MIN) return null
  const inicio = Math.max(
    maior.inicio,
    inicioPreferido < maior.fim ? inicioPreferido : maior.inicio
  )
  return { intervalo: { inicio, fim: maior.fim }, completo: false }
}

export function gerarPropostaSemanal(
  rotina: RotinaRecorrente,
  agora = new Date()
): PropostaSemanal {
  const margem = rotina.margens?.transicaoMin ?? 0
  const dias: DiaProposta[] = []

  // Minutos de estudo ainda não cobertos por blocos configurados.
  const metaEstudo = rotina.estudo?.metaSemanalMin ?? null
  const planejadoEstudo = (rotina.estudo?.blocos ?? []).reduce((acc, b) => acc + b.planejadoMin, 0)
  let restanteEstudo = metaEstudo === null ? 0 : Math.max(0, metaEstudo - planejadoEstudo)
  const carga = rotina.preferenciaCarga
  const tetoEstudo = carga === null ? TETO_ESTUDO_PADRAO : TETO_ESTUDO_DIA[carga]

  for (const diaSemana of DIAS_SEMANA) {
    const itens: Sugestao[] = []
    const acordarMin = rotina.sono?.acordar ? horaParaMinutos(rotina.sono.acordar) : null
    const dormirMin = rotina.sono?.dormir ? horaParaMinutos(rotina.sono.dormir) : null
    const janela: Intervalo | null =
      acordarMin !== null && dormirMin !== null
        ? { inicio: acordarMin, fim: dormirMin > acordarMin ? dormirMin : 1439 }
        : null
    const ocupados: Intervalo[] = []

    // 1. Protegidos posicionados primeiro: cuidado familiar, indisponibilidades
    //    e compromissos nos horários configurados.
    for (const p of rotina.periodos ?? []) {
      if (p.diaSemana !== diaSemana) continue
      const cuidado = p.tipo === 'cuidado-familiar'
      itens.push(
        sugestao({
          diaSemana,
          titulo: cuidado ? 'Cuidado familiar' : 'Indisponibilidade',
          categoria: cuidado ? 'familia' : 'pessoal',
          inicio: p.inicio,
          fim: p.fim,
          protecao: 'fixo',
          origem: 'periodo',
          explicacao: cuidado
            ? 'Período de cuidado familiar protegido.'
            : 'Período indisponível configurado.',
        })
      )
      ocupados.push({ inicio: horaParaMinutos(p.inicio), fim: horaParaMinutos(p.fim) })
    }

    for (const c of (rotina.compromissos ?? []).filter((c) => c.tipo === 'fixo')) {
      if (c.diaSemana !== diaSemana) continue
      const fim = horaParaMinutos(c.inicio) + c.duracaoMin
      itens.push(
        sugestao({
          diaSemana,
          titulo: c.titulo,
          categoria: c.categoria,
          inicio: c.inicio,
          fim: minutosParaHora(fim),
          protecao: 'fixo',
          origem: 'compromisso',
          explicacao: 'Compromisso fixo configurado.',
        })
      )
      ocupados.push({ inicio: horaParaMinutos(c.inicio), fim })
    }

    // 2. Preparação e deslocamento derivados da chegada limite presencial.
    const presencial = rotina.presencial
    const diaPresencial = presencial?.diasSemana.includes(diaSemana) ?? false
    if (diaPresencial && presencial) {
      if (!presencial.chegadaLimite) {
        itens.push(
          sugestao({
            diaSemana,
            titulo: 'Deslocamento',
            categoria: 'pessoal',
            inicio: null,
            fim: null,
            protecao: 'fixo',
            origem: 'deslocamento',
            explicacao: 'Horário limite de chegada a confirmar.',
          })
        )
      } else {
        const chegada = horaParaMinutos(presencial.chegadaLimite)
        if (presencial.deslocamentoMin === null) {
          itens.push(
            sugestao({
              diaSemana,
              titulo: 'Deslocamento',
              categoria: 'pessoal',
              inicio: null,
              fim: null,
              protecao: 'fixo',
              origem: 'deslocamento',
              explicacao: 'Duração de deslocamento a confirmar.',
            })
          )
        } else {
          const iniDesloc = chegada - presencial.deslocamentoMin
          itens.push(
            sugestao({
              diaSemana,
              titulo: 'Deslocamento',
              categoria: 'pessoal',
              inicio: minutosParaHora(iniDesloc),
              fim: presencial.chegadaLimite,
              protecao: 'fixo',
              origem: 'deslocamento',
              explicacao: `Deslocamento para chegar até ${presencial.chegadaLimite}.`,
            })
          )
          ocupados.push({ inicio: iniDesloc, fim: chegada })
          if (presencial.preparacaoMin === null) {
            itens.push(
              sugestao({
                diaSemana,
                titulo: 'Preparação',
                categoria: 'pessoal',
                inicio: null,
                fim: null,
                protecao: 'fixo',
                origem: 'preparacao',
                explicacao: 'Duração de preparação a confirmar.',
              })
            )
          } else {
            const iniPrep = iniDesloc - presencial.preparacaoMin
            itens.push(
              sugestao({
                diaSemana,
                titulo: 'Preparação',
                categoria: 'pessoal',
                inicio: minutosParaHora(iniPrep),
                fim: minutosParaHora(iniDesloc),
                protecao: 'fixo',
                origem: 'preparacao',
                explicacao: 'Preparação antes de sair de casa.',
              })
            )
            ocupados.push({ inicio: iniPrep, fim: iniDesloc })
          }
        }
      }
    }

    // 3. Refeições nos horários prescritos/configurados.
    for (const r of rotina.alimentacao?.refeicoes ?? []) {
      if (r.oculta) continue
      const padrao = REFEICOES_PADRAO[r.ref]
      const tipoDia = tipoDiaAlimentar(rotina.alimentacao, diaSemana)
      const explicacaoBase =
        tipoDia === 'com-treino'
          ? 'Horário da referência alimentar — dia com treino.'
          : tipoDia === 'sem-treino'
            ? 'Horário da referência alimentar — dia sem treino.'
            : 'Horário da referência alimentar.'
      if (r.horario === null) {
        itens.push(
          sugestao({
            diaSemana,
            titulo: padrao.titulo,
            categoria: 'alimentacao',
            inicio: null,
            fim: null,
            protecao: 'fixo',
            origem: 'refeicao',
            explicacao: 'Horário a confirmar na configuração de alimentação.',
          })
        )
      } else {
        const ini = horaParaMinutos(r.horario)
        itens.push(
          sugestao({
            diaSemana,
            titulo: padrao.titulo,
            categoria: 'alimentacao',
            inicio: r.horario,
            fim: minutosParaHora(ini + DURACAO_REFEICAO_MIN),
            protecao: 'fixo',
            origem: 'refeicao',
            explicacao: explicacaoBase,
          })
        )
        ocupados.push({ inicio: ini, fim: ini + DURACAO_REFEICAO_MIN })
      }
    }

    // 4. Blocos flexíveis já configurados pelo usuário mantêm o horário escolhido;
    //    se coincidirem com um protegido, a explicação registra a coincidência.
    const protegidos = [...ocupados]
    const notaConflito = (ini: number, fim: number) =>
      protegidos.some((p) => sobrepoe({ inicio: ini, fim }, p))
        ? ' Coincide com um item protegido — revise a configuração.'
        : ''

    for (const c of (rotina.compromissos ?? []).filter((c) => c.tipo === 'flexivel')) {
      if (c.diaSemana !== diaSemana) continue
      const ini = horaParaMinutos(c.inicio)
      const fim = ini + c.duracaoMin
      itens.push(
        sugestao({
          diaSemana,
          titulo: c.titulo,
          categoria: c.categoria,
          inicio: c.inicio,
          fim: minutosParaHora(fim),
          protecao: 'flexivel',
          origem: 'compromisso',
          explicacao: `Bloco flexível configurado.${notaConflito(ini, fim)}`,
        })
      )
      ocupados.push({ inicio: ini, fim })
    }

    for (const b of rotina.estudo?.blocos ?? []) {
      if (b.diaSemana !== diaSemana) continue
      const ini = horaParaMinutos(b.inicio)
      const fim = ini + b.planejadoMin
      itens.push(
        sugestao({
          diaSemana,
          titulo: `Estudo — ${ROTULOS_TIPO_ESTUDO[b.tipo]}`,
          categoria: 'estudo',
          inicio: b.inicio,
          fim: minutosParaHora(fim),
          protecao: 'flexivel',
          origem: 'estudo',
          explicacao: `Bloco de estudo configurado.${notaConflito(ini, fim)}`,
        })
      )
      ocupados.push({ inicio: ini, fim })
    }

    for (const b of rotina.musica ?? []) {
      if (b.diaSemana !== diaSemana) continue
      const ini = horaParaMinutos(b.inicio)
      const fim = ini + b.duracaoMin
      itens.push(
        sugestao({
          diaSemana,
          titulo: ROTULOS_TIPO_MUSICA[b.tipo],
          categoria: 'musica',
          inicio: b.inicio,
          fim: minutosParaHora(fim),
          protecao: 'flexivel',
          origem: 'musica',
          explicacao: `Bloco de música configurado.${notaConflito(ini, fim)}`,
        })
      )
      ocupados.push({ inicio: ini, fim })
    }

    // 5. Trabalho e objetivos flexíveis somente na capacidade restante.
    if (rotina.trabalho?.diasSemana.includes(diaSemana)) {
      const { horasPadrao, limiteExcepcional } = rotina.trabalho
      const duracao = Math.min(horasPadrao, limiteExcepcional) * 60
      const preferido =
        diaPresencial && presencial?.chegadaLimite
          ? horaParaMinutos(presencial.chegadaLimite)
          : acordarMin
      const titulo = 'Trabalho'
      if (!janela) {
        itens.push(
          sugestao({
            diaSemana,
            titulo,
            categoria: 'trabalho',
            inicio: null,
            fim: null,
            protecao: 'flexivel',
            origem: 'trabalho',
            explicacao: `Jornada de ${horasPadrao}h — horário de sono a confirmar.`,
          })
        )
      } else {
        const posicao = posicionarFlexivel(lacunas(janela, ocupados, margem), duracao, preferido)
        if (!posicao) {
          itens.push(
            sugestao({
              diaSemana,
              titulo,
              categoria: 'trabalho',
              inicio: null,
              fim: null,
              protecao: 'flexivel',
              origem: 'trabalho',
              explicacao: 'Sem período livre para a jornada — capacidade a confirmar.',
            })
          )
        } else {
          const base =
            diaPresencial && presencial?.chegadaLimite
              ? `Presencial: início na chegada (${presencial.chegadaLimite}); jornada de ${horasPadrao}h — limite excepcional de ${limiteExcepcional}h.`
              : `Jornada de ${horasPadrao}h — limite excepcional de ${limiteExcepcional}h — no primeiro período livre do dia.`
          itens.push(
            sugestao({
              diaSemana,
              titulo,
              categoria: 'trabalho',
              inicio: minutosParaHora(posicao.intervalo.inicio),
              fim: minutosParaHora(posicao.intervalo.fim),
              protecao: 'flexivel',
              origem: 'trabalho',
              explicacao: posicao.completo
                ? base
                : `${base} Só ${Math.floor((posicao.intervalo.fim - posicao.intervalo.inicio) / 60)}h livres no dia.`,
            })
          )
          ocupados.push(posicao.intervalo)
        }
      }
    }

    if (restanteEstudo > 0 && janela) {
      const lacuna = maiorLacuna(lacunas(janela, ocupados, margem))
      const tamanho = lacuna ? Math.min(tetoEstudo, restanteEstudo, lacuna.fim - lacuna.inicio) : 0
      if (lacuna && tamanho >= MIN_BLOCO_FLEXIVEL_MIN) {
        itens.push(
          sugestao({
            diaSemana,
            titulo: 'Estudo',
            categoria: 'estudo',
            inicio: minutosParaHora(lacuna.inicio),
            fim: minutosParaHora(lacuna.inicio + tamanho),
            protecao: 'flexivel',
            origem: 'estudo',
            explicacao: carga
              ? `Meta semanal de estudo distribuída em ritmo ${carga}.`
              : 'Meta semanal de estudo em ritmo moderado — preferência de carga a confirmar.',
          })
        )
        ocupados.push({ inicio: lacuna.inicio, fim: lacuna.inicio + tamanho })
        restanteEstudo -= tamanho
      }
    }

    // 6. Pausas de transição visíveis após cada item com horário, quando a
    //    margem configurada couber sem colidir com o próximo item.
    if (margem > 0) {
      const agendados = itens
        .filter((s) => s.inicio !== null && s.fim !== null)
        .map((s) => ({
          inicio: horaParaMinutos(s.inicio!),
          fim: horaParaMinutos(s.fim!),
          titulo: s.titulo,
        }))
      const pausas: Intervalo[] = []
      for (const a of agendados) {
        const pausa = { inicio: a.fim, fim: a.fim + margem }
        if (janela && pausa.fim > janela.fim) continue
        const colide =
          agendados.some((o) => sobrepoe(pausa, o)) || pausas.some((p) => sobrepoe(pausa, p))
        if (colide) continue
        pausas.push(pausa)
        itens.push(
          sugestao({
            diaSemana,
            titulo: 'Pausa',
            categoria: 'descanso',
            inicio: minutosParaHora(pausa.inicio),
            fim: minutosParaHora(pausa.fim),
            protecao: 'flexivel',
            origem: 'pausa',
            explicacao: `Transição após ${a.titulo}.`,
          })
        )
      }
    }

    itens.sort((a, b) => {
      if (a.inicio === null) return b.inicio === null ? 0 : 1
      if (b.inicio === null) return -1
      return horaParaMinutos(a.inicio) - horaParaMinutos(b.inicio)
    })

    dias.push({
      diaSemana,
      acordar: rotina.sono?.acordar ?? null,
      dormir: rotina.sono?.dormir ?? null,
      sugestoes: itens,
    })
  }

  return { geradaEm: agora.toISOString(), confirmadaEm: null, dias }
}
