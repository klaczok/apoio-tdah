import Link from 'next/link'
import { redirect } from 'next/navigation'
import styles from './semana.module.css'
import { storeDoUsuario } from '@/server/auth/contexto'
import { MENSAGENS_ERRO } from '@/server/persistence/mensagens'
import { instanciaDoDia } from '@/server/dia/gerar'
import {
  janelaDaSemana,
  posicaoAgora,
  projetarColuna,
  textoLacuna,
  type EntradaBloco,
  type Janela,
  type TipoBloco,
} from '@/server/agenda/grade'
import { diasDaSemana, resumoSemana, type DiaResumo, type ResumoSemana } from '@/server/dia/semana'
import type { EstadoPrivado } from '@/server/persistence/estado'
import { ItemNaoEncontradoError } from '@/server/rotina/modelo'
import { CATEGORIAS, ROTULOS_CATEGORIA, ROTULOS_DIA, type Categoria } from '@/server/rotina/modelo'
import {
  dataCivilHoje,
  diaSemanaDe,
  dataCivilParaTexto,
  ehDataCivil,
  horaParaMinutos,
  horarioParaTexto,
  minutosParaHora,
  minutosParaTexto,
  somarDiasCivil,
} from '@/server/tempo'
import { AjusteItem } from '@/app/_components/ajuste-item'
import { FormCompromissoRapido } from '@/app/_components/compromisso-rapido'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{
    erro?: string
    salvo?: string
    criado?: string
    semana?: string
    dia?: string
  }>
}

const ROTULO_TIPO: Record<TipoBloco, string> = {
  fixo: 'Fixo',
  flexivel: 'Flexível',
  tarefa: 'Tarefa',
  margem: 'Margem',
}

const ROTULO_ESTADO: Record<string, string> = {
  parcial: 'parcial',
  reprogramado: 'reprogramado',
}

const ABREV_DIA: Record<string, string> = {
  seg: 'Seg',
  ter: 'Ter',
  qua: 'Qua',
  qui: 'Qui',
  sex: 'Sex',
  sab: 'Sáb',
  dom: 'Dom',
}

function horaAgoraMin(): number {
  const texto = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
  return horaParaMinutos(texto)
}

// Projeção de um dia a partir da semana ativa; proposta malformada ou sem
// o dia da semana correspondente vira "sem planejamento", não erro.
function projetarDia(dados: EstadoPrivado, data: string, versao: number) {
  try {
    return instanciaDoDia(dados.dias[data], dados, data, versao)
  } catch (e) {
    if (e instanceof ItemNaoEncontradoError) return null
    throw e
  }
}

function entradasDoDia(resumo: DiaResumo): EntradaBloco[] {
  const dia = resumo.instancia
  if (!dia) return []
  return [
    ...dia.itens.map((i) => ({
      id: i.id,
      titulo: i.titulo,
      inicio: i.inicio,
      fim: i.fim,
      tipo: (i.origem === 'pausa' ? 'margem' : i.protecao) as TipoBloco,
    })),
    ...dia.tarefas.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      inicio: t.inicio,
      fim: t.fim,
      tipo: 'tarefa' as TipoBloco,
    })),
  ]
}

function ResumoCategorias({
  planejado,
  realizado,
}: {
  planejado: Partial<Record<Categoria, number>>
  realizado: Partial<Record<Categoria, number>>
}) {
  const presentes = CATEGORIAS.filter((c) => (planejado[c] ?? 0) > 0)
  if (presentes.length === 0) return null
  return (
    <ul className={styles.lista}>
      {presentes.map((c) => (
        <li key={c} className={styles.item}>
          <span>
            {ROTULOS_CATEGORIA[c]}: planejado {minutosParaTexto(planejado[c] ?? 0)}
            {(realizado[c] ?? 0) > 0 ? ` · registrado ${minutosParaTexto(realizado[c] ?? 0)}` : ''}
          </span>
        </li>
      ))}
    </ul>
  )
}

// Equivalente textual da coluna: mesmos itens da grade com ajustes,
// alertas e pendências — nada fica só na geometria visual.
function DetalheDia({ resumo, hoje }: { resumo: DiaResumo; hoje: string }) {
  const dia = resumo.instancia
  const ajustavel = Boolean(dia && !dia.confirmadaEm && resumo.data >= hoje)
  return (
    <section
      className={styles.diaLista}
      aria-label={`${ROTULOS_DIA[resumo.diaSemana]} ${dataCivilParaTexto(resumo.data)}`}
    >
      <h2>
        {ROTULOS_DIA[resumo.diaSemana]} · {dataCivilParaTexto(resumo.data)}
      </h2>
      {!dia ? (
        <p>Sem planejamento para este dia.</p>
      ) : (
        <>
          <ul className={styles.lista}>
            {dia.itens.map((item) => (
              <li key={item.id} className={styles.item}>
                <span>
                  {horarioParaTexto(item.inicio, item.fim)} · {item.titulo} ·{' '}
                  {ROTULOS_CATEGORIA[item.categoria]} ·{' '}
                  <span className={item.protecao === 'fixo' ? styles.tagFixo : styles.tagFlexivel}>
                    {item.protecao === 'fixo' ? 'Fixo' : 'Flexível'}
                  </span>
                </span>
                {ajustavel && <AjusteItem item={item} data={resumo.data} volta="semana" />}
              </li>
            ))}
            {dia.tarefas.map((t) => (
              <li key={t.id} className={styles.item}>
                <span>
                  {horarioParaTexto(t.inicio, t.fim)} · {t.titulo} ·{' '}
                  {ROTULOS_CATEGORIA[t.categoria]} · <span className={styles.tagTarefa}>tarefa</span>
                </span>
                {ajustavel && <AjusteItem item={t} data={resumo.data} volta="semana" />}
              </li>
            ))}
          </ul>
          {resumo.alertas.length > 0 && (
            <ul className={styles.lista} aria-label="Alertas do dia">
              {resumo.alertas.map((a, i) => (
                <li key={i} className={styles.item}>
                  <span>{a.mensagem}</span>
                </li>
              ))}
            </ul>
          )}
          {resumo.pendencias.length > 0 && (
            <p>
              A decidir:{' '}
              {resumo.pendencias
                .map(
                  (p) =>
                    `${p.titulo} (${ROTULO_ESTADO[p.estado] ?? p.estado}${p.naoChegou ? ' — não chegou ao destino' : ''})`
                )
                .join(' · ')}
            </p>
          )}
        </>
      )}
    </section>
  )
}


// Conteúdo interno de uma coluna temporal — compartilhado pela grade de
// sete dias (desktop) e pela coluna única do dia selecionado (celular).
type Coluna = ReturnType<typeof projetarColuna>

function ConteudoColuna({
  resumo: d,
  coluna,
  ehHoje,
  agoraPct,
  hoje,
}: {
  resumo: DiaResumo
  coluna: Coluna
  ehHoje: boolean
  agoraPct: number | null
  hoje: string
}) {
  return (
    <>
      {ehHoje && agoraPct !== null && (
        <div
          className={styles.agora}
          style={{ ['--y' as string]: `${agoraPct}%` }}
          role="presentation"
        >
          <span className="sr-only">agora, {minutosParaHora(horaAgoraMin())}</span>
        </div>
      )}
      {coluna.lacunas.map((l, i) => (
        <div
          key={`livre-${i}`}
          className={styles.livre}
          style={
            {
              ['--topo' as string]: `${l.topoPct}%`,
              ['--altura' as string]: `${l.alturaPct}%`,
            }
          }
        >
          <span className="sr-only">Espaço livre {textoLacuna(l)}</span>
        </div>
      ))}
      {coluna.blocos.map((b) => {
        const categoria =
          d.instancia?.itens.find((i) => i.id === b.id)?.categoria ??
          d.instancia?.tarefas.find((t) => t.id === b.id)?.categoria ??
          'pessoal'
        const ajustavel = Boolean(d.instancia && !d.instancia.confirmadaEm && d.data >= hoje)
        const fonte =
          d.instancia?.itens.find((i) => i.id === b.id) ??
          d.instancia?.tarefas.find((t) => t.id === b.id)
        return (
          <details
            key={b.id}
            className={`${styles.evento} ${b.tipo === 'fixo' ? styles.tipoFixo : ''} ${b.tipo === 'tarefa' ? styles.tipoTarefa : ''} ${b.tipo === 'margem' ? styles.tipoMargem : ''} ${b.sobreposto ? styles.sobreposto : ''}`}
            data-categoria={categoria}
            aria-label={`${b.titulo}, ${horarioParaTexto(b.inicio, b.fim)}, ${ROTULOS_CATEGORIA[categoria]}, ${ROTULO_TIPO[b.tipo]}${b.sobreposto ? ', sobreposto a outro item' : ''}`}
            style={
              {
                ['--topo' as string]: `${b.topoPct}%`,
                ['--altura' as string]: `${b.alturaPct}%`,
              }
            }
          >
            <summary>
              <b>{b.titulo}</b>
              <span>
                {horarioParaTexto(b.inicio, b.fim)} · {ROTULO_TIPO[b.tipo]}
              </span>
            </summary>
            <div className={styles.detalheEvento}>
              <p>
                {dataCivilParaTexto(d.data)} · {horarioParaTexto(b.inicio, b.fim)} ·{' '}
                {minutosParaTexto(b.fimMin - b.inicioMin)} · {ROTULOS_CATEGORIA[categoria]} ·{' '}
                {ROTULO_TIPO[b.tipo]}
              </p>
              {b.tipo === 'fixo' && (
                <p>Compromisso protegido — qualquer ajuste exige confirmação explícita.</p>
              )}
              {b.sobreposto && <p>Sobreposto a outro item do dia.</p>}
              {ajustavel && fonte && <AjusteItem item={fonte} data={d.data} volta="semana" />}
            </div>
          </details>
        )
      })}
      {coluna.semHorario.length > 0 && (
        <p className={styles.semHorario} title="Horário a confirmar">
          {coluna.semHorario.map((i) => i.titulo).join(' · ')} — a confirmar
        </p>
      )}
    </>
  )
}

export default async function SemanaPage({ searchParams }: Props) {
  const params = await searchParams
  const hoje = dataCivilHoje()
  const referencia = params.semana && ehDataCivil(params.semana) ? params.semana : hoje
  const store = await storeDoUsuario()
  if (!store) redirect('/login')
  const carregado = await store.load()
  const mensagemErro = carregado.ok
    ? params.erro
      ? MENSAGENS_ERRO[params.erro]
      : undefined
    : MENSAGENS_ERRO.persistencia

  const datas = diasDaSemana(referencia)
  const segunda = datas[0]!
  const semanaAnterior = somarDiasCivil(segunda, -7)
  const proximaSemana = somarDiasCivil(segunda, 7)
  const semanaCorrente = diasDaSemana(hoje).includes(segunda)

  let resumo: ResumoSemana | null = null
  if (carregado.ok) {
    const dados = carregado.value.dados
    // Dias ainda não persistidos aparecem como projeção da semana ativa —
    // nada é gravado aqui; a instância só vira dia real quando o usuário
    // ajusta ou planeja explicitamente.
    resumo = resumoSemana(
      datas.map((data) => ({
        data,
        instancia: projetarDia(dados, data, carregado.value.version),
      })),
      dados.rotina
    )
  }
  const algumDia = resumo?.dias.some((d) => d.instancia) ?? false

  // Janela única: todos os horários da semana + sono, para os sete dias
  // ficarem comparáveis na mesma escala.
  const referencias: (string | null)[] = []
  for (const d of resumo?.dias ?? []) {
    referencias.push(d.instancia?.acordar ?? null, d.instancia?.dormir ?? null)
    for (const i of d.instancia?.itens ?? []) referencias.push(i.inicio, i.fim)
    for (const t of d.instancia?.tarefas ?? []) referencias.push(t.inicio, t.fim)
  }
  const janela: Janela = janelaDaSemana(referencias)
  const colunas = (resumo?.dias ?? []).map((d) => ({
    resumo: d,
    coluna: projetarColuna(entradasDoDia(d), janela, {
      acordar: d.instancia?.acordar ?? null,
      dormir: d.instancia?.dormir ?? null,
    }),
  }))
  const agoraPct = posicaoAgora(horaAgoraMin(), janela)

  const horasEixo: { min: number; rotulo: string; topo: number }[] = []
  const passo = 120
  for (let m = janela.inicioMin; m <= janela.fimMin; m += passo) {
    horasEixo.push({
      min: m,
      rotulo: minutosParaHora(m),
      topo: ((m - janela.inicioMin) / (janela.fimMin - janela.inicioMin)) * 100,
    })
  }
  const faixaHoraPct = (120 / (janela.fimMin - janela.inicioMin)) * 100

  // Dia selecionado na leitura móvel: parâmetro válido dentro da semana
  // exibida; senão, hoje quando faz parte dela, ou a segunda-feira.
  const diaSel =
    params.dia && datas.includes(params.dia)
      ? params.dia
      : datas.includes(hoje)
        ? hoje
        : segunda
  const indiceSel = datas.indexOf(diaSel)
  const diaAnterior = indiceSel > 0 ? datas[indiceSel - 1]! : null
  const diaProximo = indiceSel < datas.length - 1 ? datas[indiceSel + 1]! : null
  const colunaSel = colunas.find((c) => c.resumo.data === diaSel) ?? null
  const diasComItens = colunas.filter((c) => c.coluna.blocos.length > 0).length

  const maiorCarga = colunas.reduce<(typeof colunas)[number] | null>(
    (acc, c) => (!acc || c.coluna.ocupadoMin > acc.coluna.ocupadoMin ? c : acc),
    null
  )
  const margensMin = colunas.reduce(
    (acc, c) =>
      acc +
      c.coluna.blocos
        .filter((b) => b.tipo === 'margem')
        .reduce((s, b) => s + (b.fimMin - b.inicioMin), 0),
    0
  )

  return (
    <main className={styles.container}>
      <h1>Semana</h1>
      <p className={styles.intro}>
        Visão factual da semana: cada bloco mostra horário pela posição e duração pela altura.
        Nada aqui é nota ou avaliação.
      </p>

      <nav className={styles.navSemana} aria-label="Navegar entre semanas">
        <Link href={`/semana?semana=${semanaAnterior}`}>← Semana anterior</Link>
        {!semanaCorrente && <Link href="/semana">Esta semana</Link>}
        <span className={styles.rotuloSemana}>
          semana de {dataCivilParaTexto(segunda)}
        </span>
        <Link href={`/semana?semana=${proximaSemana}`}>Próxima semana →</Link>
      </nav>

      {params.salvo === '1' && (
        <p role="status" className={styles.feedback}>
          Ajuste salvo.
        </p>
      )}
      {params.criado === '1' && (
        <p role="status" className={styles.feedback}>
          Compromisso criado na rotina — entra nas próximas propostas semanais.
        </p>
      )}
      {mensagemErro && (
        <p role="alert" className={styles.erro}>
          {mensagemErro}
        </p>
      )}

      {resumo && !algumDia && <p>Nenhum dia planejado nesta semana ainda.</p>}

      {resumo && algumDia && (
        <>
          <details className={styles.criacao}>
            <summary>Novo compromisso</summary>
            <p className={styles.dicaCriacao}>
              Cria uma recorrência na sua rotina — entra nas próximas propostas semanais.
            </p>
            <FormCompromissoRapido
              prefixo="agenda"
              diaSemanaPadrao={diaSemanaDe(diaSel)}
              semana={segunda}
              dia={diaSel}
            />
          </details>

          <div className={styles.gradeScroll}>
            <div
              className={styles.grade}
              role="grid"
              aria-label={`Agenda da semana de ${dataCivilParaTexto(segunda)}`}
              style={{ ['--faixa-hora' as string]: `${faixaHoraPct}%` }}
            >
              <div className={styles.canto} role="columnheader" aria-label="Horários" />
              {colunas.map(({ resumo: d, coluna }) => {
                const fds = d.diaSemana === 'sab' || d.diaSemana === 'dom'
                const ehHoje = d.data === hoje
                return (
                  <div
                    key={d.data}
                    role="columnheader"
                    className={`${styles.cabDia} ${ehHoje ? styles.cabDiaHoje : ''} ${fds ? styles.cabDiaFds : ''}`}
                  >
                    <span className={styles.cabDiaSemana}>{ABREV_DIA[d.diaSemana]}</span>
                    <span className={styles.cabDiaNumero}>{d.data.slice(8)}</span>
                    <span className="sr-only">{dataCivilParaTexto(d.data)}</span>
                    {ehHoje && <span className="sr-only">(hoje)</span>}
                    <span className={styles.cabDiaCarga}>
                      {coluna.ocupadoMin > 0 ? `${minutosParaTexto(coluna.ocupadoMin)} ocupadas` : 'livre'}
                    </span>
                  </div>
                )
              })}

              <div className={styles.horas} aria-hidden="true">
                {horasEixo.map((h) => (
                  <span key={h.min} style={{ top: `${h.topo}%` }}>
                    {h.rotulo}
                  </span>
                ))}
              </div>
              {colunas.map(({ resumo: d, coluna }) => {
                const fds = d.diaSemana === 'sab' || d.diaSemana === 'dom'
                const ehHoje = d.data === hoje
                return (
                  <div
                    key={d.data}
                    role="gridcell"
                    className={`${styles.coluna} ${fds ? styles.colunaFds : ''} ${ehHoje ? styles.colunaHoje : ''}`}
                    aria-label={`${ROTULOS_DIA[d.diaSemana]} ${dataCivilParaTexto(d.data)}${ehHoje ? ', hoje' : ''}`}
                  >
                    <ConteudoColuna resumo={d} coluna={coluna} ehHoje={ehHoje} agoraPct={agoraPct} hoje={hoje} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Celular: um dia por vez, mesma projeção temporal — nenhum
              modelo paralelo. O seletor é navegação por links, sem gesto. */}
          <section className={styles.agendaMovel} aria-label="Agenda do dia selecionado">
            <nav className={styles.seletorDias} aria-label="Escolher dia da semana">
              <p className={styles.seletorContexto}>
                {diasComItens === 0
                  ? '7 dias, nenhum com itens'
                  : `7 dias, ${diasComItens} com itens`}
              </p>
              <ul className={styles.seletorLista}>
                {colunas.map(({ resumo: d, coluna }) => {
                  const selecionado = d.data === diaSel
                  return (
                    <li key={d.data}>
                      <Link
                        href={`/semana?semana=${segunda}&dia=${d.data}`}
                        aria-current={selecionado ? 'date' : undefined}
                        className={`${styles.diaChip} ${selecionado ? styles.diaChipAtivo : ''} ${d.data === hoje ? styles.diaChipHoje : ''}`}
                      >
                        <span>{ABREV_DIA[d.diaSemana]}</span>
                        <b>{d.data.slice(8)}</b>
                        <span className="sr-only">
                          {dataCivilParaTexto(d.data)}
                          {d.data === hoje ? ', hoje' : ''}
                          {selecionado ? ', selecionado' : ''}
                          {coluna.blocos.length === 0 ? ', sem itens' : ''}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>

            <nav className={styles.navDia} aria-label="Mudar de dia">
              {diaAnterior ? (
                <Link href={`/semana?semana=${segunda}&dia=${diaAnterior}`}>← Dia anterior</Link>
              ) : (
                <span />
              )}
              {diaProximo && (
                <Link href={`/semana?semana=${segunda}&dia=${diaProximo}`}>Próximo dia →</Link>
              )}
            </nav>

            {colunaSel && (
              <>
                <h2 className={styles.diaMovelTitulo}>
                  {ROTULOS_DIA[colunaSel.resumo.diaSemana]} · {dataCivilParaTexto(diaSel)}
                  {diaSel === hoje ? ' — hoje' : ''}
                </h2>
                <div
                  className={styles.diaMovel}
                  role="group"
                  aria-label={`Grade do dia ${dataCivilParaTexto(diaSel)}`}
                >
                  <div className={styles.horas} aria-hidden="true">
                    {horasEixo.map((h) => (
                      <span key={h.min} style={{ top: `${h.topo}%` }}>
                        {h.rotulo}
                      </span>
                    ))}
                  </div>
                  <div
                    className={`${styles.coluna} ${diaSel === hoje ? styles.colunaHoje : ''}`}
                    style={{ ['--faixa-hora' as string]: `${faixaHoraPct}%` }}
                  >
                    <ConteudoColuna
                      resumo={colunaSel.resumo}
                      coluna={colunaSel.coluna}
                      ehHoje={diaSel === hoje}
                      agoraPct={agoraPct}
                      hoje={hoje}
                    />
                  </div>
                </div>
                <p className={styles.diaMovelCarga}>
                  {colunaSel.coluna.ocupadoMin > 0
                    ? `${minutosParaTexto(colunaSel.coluna.ocupadoMin)} ocupadas`
                    : 'Dia livre'}
                </p>
                {colunaSel.resumo.alertas.length > 0 && (
                  <ul className={styles.lista} aria-label="Alertas do dia">
                    {colunaSel.resumo.alertas.map((a, i) => (
                      <li key={i} className={styles.item}>
                        <span>{a.mensagem}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {colunaSel.resumo.pendencias.length > 0 && (
                  <p>
                    A decidir:{' '}
                    {colunaSel.resumo.pendencias
                      .map(
                        (p) =>
                          `${p.titulo} (${ROTULO_ESTADO[p.estado] ?? p.estado}${p.naoChegou ? ' — não chegou ao destino' : ''})`
                      )
                      .join(' · ')}
                  </p>
                )}
              </>
            )}
          </section>

          <section className={styles.leitura} aria-label="Leitura da semana">
            <h2>Leitura da semana</h2>
            {maiorCarga && maiorCarga.coluna.ocupadoMin > 0 && (
              <p>
                Maior carga: {ROTULOS_DIA[maiorCarga.resumo.diaSemana]} com{' '}
                {minutosParaTexto(maiorCarga.coluna.ocupadoMin)} ocupadas.
              </p>
            )}
            {margensMin > 0 && <p>Margens preservadas: {minutosParaTexto(margensMin)}.</p>}
            <ResumoCategorias
              planejado={resumo.totaisPorCategoria}
              realizado={resumo.totaisRealizadosPorCategoria}
            />
            {resumo.trabalhoPlanejadoMin > 0 && (
              <p>
                Trabalho na semana — planejado {minutosParaTexto(resumo.trabalhoPlanejadoMin)}
                {resumo.trabalhoRealizadoMin > 0
                  ? ` · registrado ${minutosParaTexto(resumo.trabalhoRealizadoMin)}`
                  : ' · sem registro ainda'}
              </p>
            )}
          </section>

          <div className={styles.detalhesDia}>
            {resumo.dias.map((d) => (
              <DetalheDia key={d.data} resumo={d} hoje={hoje} />
            ))}
          </div>
        </>
      )}

      <p>
        <Link className={styles.voltar} href="/hoje">
          ← Voltar para hoje
        </Link>
      </p>
    </main>
  )
}
