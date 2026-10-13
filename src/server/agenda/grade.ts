import { horaParaMinutos, minutosParaHora } from '../tempo'

// Projeção visual da agenda: converte itens do dia em posições relativas
// (porcentagens da janela visível) para a grade temporal. É cálculo de
// apresentação — nenhuma regra de conflito, capacidade ou revisão mora
// aqui, e nada do que é projetado é persistido (espaços livres nascem
// da diferença entre ocupado e janela, não viram itens).

export type TipoBloco = 'fixo' | 'flexivel' | 'tarefa' | 'margem'

export type EntradaBloco = {
  id: string
  titulo: string
  inicio: string | null
  fim: string | null
  tipo: TipoBloco
}

export type BlocoGrade = EntradaBloco & {
  inicioMin: number
  fimMin: number
  topoPct: number
  alturaPct: number
  // Sobreposição real no horário — sinalizada, nunca rearranjada.
  sobreposto: boolean
}

export type LacunaGrade = {
  inicioMin: number
  fimMin: number
  topoPct: number
  alturaPct: number
}

export type ItemSemHorario = EntradaBloco

export type Janela = { inicioMin: number; fimMin: number }

export type ColunaGrade = {
  blocos: BlocoGrade[]
  lacunas: LacunaGrade[]
  semHorario: ItemSemHorario[]
  // Leitura factual da carga: minutos ocupados e minutos livres na janela.
  ocupadoMin: number
  livreMin: number
}

export const JANELA_PADRAO: Janela = { inicioMin: 7 * 60, fimMin: 22 * 60 }
const LACUNA_MINIMA_MIN = 10

function paraMinutos(hora: string | null): number | null {
  return hora === null ? null : horaParaMinutos(hora)
}

// Janela única da semana para que os sete dias sejam comparáveis:
// começa na hora cheia anterior ao primeiro evento (ou ao acordar) e
// termina na hora cheia após o último, com piso na janela padrão quando
// não há nada agendado.
export function janelaDaSemana(referencias: (string | null)[]): Janela {
  const minutos = referencias
    .map(paraMinutos)
    .filter((m): m is number => m !== null)
    .sort((a, b) => a - b)
  if (minutos.length === 0) return JANELA_PADRAO
  const inicioMin = Math.max(0, Math.floor(minutos[0]! / 60) * 60)
  const fimMin = Math.min(1439, Math.ceil(minutos[minutos.length - 1]! / 60) * 60)
  return { inicioMin, fimMin: Math.max(fimMin, inicioMin + 60) }
}

function pct(valor: number, janela: Janela): number {
  return ((valor - janela.inicioMin) / (janela.fimMin - janela.inicioMin)) * 100
}

function intervalosOcupados(blocos: BlocoGrade[]): { inicio: number; fim: number }[] {
  const ordenados = blocos
    .map((b) => ({ inicio: b.inicioMin, fim: b.fimMin }))
    .sort((a, b) => a.inicio - b.inicio)
  const fundidos: { inicio: number; fim: number }[] = []
  for (const i of ordenados) {
    const ultimo = fundidos[fundidos.length - 1]
    if (ultimo && i.inicio <= ultimo.fim) ultimo.fim = Math.max(ultimo.fim, i.fim)
    else fundidos.push({ ...i })
  }
  return fundidos
}

// Projeta um dia: blocos posicionados por início/duração, lacunas livres
// como respiro visível dentro do período acordado (quando conhecido) e
// itens "a confirmar" mantidos fora da linha do tempo, sem horário
// inventado.
export function projetarColuna(
  entradas: EntradaBloco[],
  janela: Janela,
  periodo: { acordar: string | null; dormir: string | null } | null = null
): ColunaGrade {
  const comHorario: BlocoGrade[] = []
  const semHorario: ItemSemHorario[] = []

  for (const e of entradas) {
    const inicioMin = paraMinutos(e.inicio)
    const fimMin = paraMinutos(e.fim)
    if (inicioMin === null || fimMin === null || fimMin <= inicioMin) {
      semHorario.push(e)
      continue
    }
    const inicioCortado = Math.max(inicioMin, janela.inicioMin)
    const fimCortado = Math.min(fimMin, janela.fimMin)
    if (fimCortado <= inicioCortado) continue
    comHorario.push({
      ...e,
      inicioMin,
      fimMin,
      topoPct: pct(inicioCortado, janela),
      alturaPct: pct(fimCortado, janela) - pct(inicioCortado, janela),
      sobreposto: false,
    })
  }

  comHorario.sort((a, b) => a.inicioMin - b.inicioMin)
  for (const bloco of comHorario) {
    bloco.sobreposto = comHorario.some(
      (o) => o !== bloco && o.inicioMin < bloco.fimMin && o.fimMin > bloco.inicioMin
    )
  }

  const fundidos = intervalosOcupados(comHorario)
  const ocupadoMin = fundidos.reduce((acc, i) => acc + (i.fim - i.inicio), 0)

  // Espaço livre medido dentro do período acordado; sem sono configurado,
  // vale a janela visível inteira.
  const livreInicio = paraMinutos(periodo?.acordar ?? null) ?? janela.inicioMin
  const livreFim = paraMinutos(periodo?.dormir ?? null) ?? janela.fimMin
  const lacunas: LacunaGrade[] = []
  let cursor = Math.max(livreInicio, janela.inicioMin)
  const limite = Math.min(livreFim, janela.fimMin)
  for (const o of fundidos) {
    const fimLacuna = Math.min(o.inicio, limite)
    if (fimLacuna - cursor >= LACUNA_MINIMA_MIN) {
      lacunas.push({
        inicioMin: cursor,
        fimMin: fimLacuna,
        topoPct: pct(cursor, janela),
        alturaPct: pct(fimLacuna, janela) - pct(cursor, janela),
      })
    }
    cursor = Math.max(cursor, o.fim)
  }
  if (limite - cursor >= LACUNA_MINIMA_MIN) {
    lacunas.push({
      inicioMin: cursor,
      fimMin: limite,
      topoPct: pct(cursor, janela),
      alturaPct: pct(limite, janela) - pct(cursor, janela),
    })
  }
  const livreMin = lacunas.reduce((acc, l) => acc + (l.fimMin - l.inicioMin), 0)

  return { blocos: comHorario, lacunas, semHorario, ocupadoMin, livreMin }
}

// Marca a linha do horário atual dentro da janela; fora dela não há linha.
export function posicaoAgora(agoraMin: number, janela: Janela): number | null {
  if (agoraMin < janela.inicioMin || agoraMin > janela.fimMin) return null
  return pct(agoraMin, janela)
}

export function textoLacuna(lacuna: LacunaGrade): string {
  return `${minutosParaHora(lacuna.inicioMin)}–${minutosParaHora(lacuna.fimMin)}`
}
