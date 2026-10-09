import Link from 'next/link'
import styles from '../configurar/configurar.module.css'
import { getStateStore } from '@/server/persistence'
import { MENSAGENS_ERRO } from '@/server/persistence/mensagens'
import { instanciaDoDia } from '@/server/dia/gerar'
import { diasDaSemana, resumoSemana, type DiaResumo, type ResumoSemana } from '@/server/dia/semana'
import type { EstadoPrivado } from '@/server/persistence/estado'
import { ItemNaoEncontradoError } from '@/server/rotina/modelo'
import { CATEGORIAS, ROTULOS_CATEGORIA, ROTULOS_DIA, type Categoria } from '@/server/rotina/modelo'
import {
  dataCivilHoje,
  dataCivilParaTexto,
  horarioParaTexto,
  minutosParaTexto,
} from '@/server/tempo'
import { AjusteItem } from '../_components/ajuste-item'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ erro?: string; salvo?: string }>
}

const ROTULO_PROTECAO: Record<'fixo' | 'flexivel', string> = {
  fixo: 'Fixo',
  flexivel: 'Flexível',
}

const ROTULO_ESTADO: Record<string, string> = {
  parcial: 'parcial',
  reprogramado: 'reprogramado',
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
          <span className={styles.itemTexto}>
            {ROTULOS_CATEGORIA[c]}: planejado {minutosParaTexto(planejado[c] ?? 0)}
            {(realizado[c] ?? 0) > 0 ? ` · registrado ${minutosParaTexto(realizado[c] ?? 0)}` : ''}
          </span>
        </li>
      ))}
    </ul>
  )
}

function CardDia({ resumo, hoje }: { resumo: DiaResumo; hoje: string }) {
  const dia = resumo.instancia
  // Ajuste é ato de planejamento: só dias presentes/futuros e ainda em
  // rascunho — dia confirmado ou já passado é histórico, não rascunho.
  const ajustavel = Boolean(dia && !dia.confirmadaEm && resumo.data >= hoje)
  return (
    <section
      className={styles.etapa}
      aria-label={`${ROTULOS_DIA[resumo.diaSemana]} ${dataCivilParaTexto(resumo.data)}`}
    >
      <h2 className={styles.subtitulo}>
        {ROTULOS_DIA[resumo.diaSemana]} · {dataCivilParaTexto(resumo.data)}
      </h2>
      {!dia ? (
        <p>Sem planejamento para este dia.</p>
      ) : (
        <>
          <ul className={styles.lista}>
            {dia.itens.map((item) => (
              <li key={item.id} className={styles.item}>
                <span className={styles.itemTexto}>
                  {horarioParaTexto(item.inicio, item.fim)} · {item.titulo} ·{' '}
                  {ROTULOS_CATEGORIA[item.categoria]} ·{' '}
                  <span className={item.protecao === 'fixo' ? styles.tagFixo : styles.tagFlexivel}>
                    {ROTULO_PROTECAO[item.protecao]}
                  </span>
                </span>
                {ajustavel && <AjusteItem item={item} data={resumo.data} volta="semana" />}
              </li>
            ))}
            {dia.tarefas.map((t) => (
              <li key={t.id} className={styles.item}>
                <span className={styles.itemTexto}>
                  {horarioParaTexto(t.inicio, t.fim)} · {t.titulo} ·{' '}
                  {ROTULOS_CATEGORIA[t.categoria]} · tarefa
                </span>
                {ajustavel && <AjusteItem item={t} data={resumo.data} volta="semana" />}
              </li>
            ))}
          </ul>
          <ResumoCategorias
            planejado={resumo.minutosPorCategoria}
            realizado={resumo.minutosRealizadosPorCategoria}
          />
          {resumo.trabalhoPlanejadoMin > 0 && (
            <p>
              Trabalho — planejado {minutosParaTexto(resumo.trabalhoPlanejadoMin)}
              {resumo.trabalhoRealizadoMin > 0
                ? ` · registrado ${minutosParaTexto(resumo.trabalhoRealizadoMin)}`
                : ' · sem registro ainda'}
            </p>
          )}
          {resumo.alertas.length > 0 && (
            <ul className={styles.lista} aria-label="Alertas do dia">
              {resumo.alertas.map((a, i) => (
                <li key={i} className={styles.item}>
                  <span className={styles.itemTexto}>{a.mensagem}</span>
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

export default async function SemanaPage({ searchParams }: Props) {
  const params = await searchParams
  const hoje = dataCivilHoje()
  const store = await getStateStore()
  const carregado = await store.load()
  const mensagemErro = carregado.ok
    ? params.erro
      ? MENSAGENS_ERRO[params.erro]
      : undefined
    : MENSAGENS_ERRO.persistencia

  const datas = diasDaSemana(hoje)
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

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Semana</h1>
      <p className={styles.intro}>
        Visão factual da semana: planejado à esquerda, registrado quando a revisão do dia marcou
        itens como realizados. Nada aqui é nota ou avaliação.
      </p>
      {params.salvo === '1' && (
        <p role="status" className={styles.feedback}>
          Ajuste salvo.
        </p>
      )}
      {mensagemErro && (
        <p role="alert" className={styles.erro}>
          {mensagemErro}
        </p>
      )}

      {resumo &&
        (!algumDia ? (
          <p>Nenhum dia planejado nesta semana ainda.</p>
        ) : (
          <>
            <section className={styles.etapa} aria-label="Resumo da semana">
              <h2 className={styles.subtitulo}>Totais da semana</h2>
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
            {resumo.dias.map((d) => (
              <CardDia key={d.data} resumo={d} hoje={hoje} />
            ))}
          </>
        ))}

      <p>
        <Link className={styles.voltar} href="/hoje">
          ← Voltar para hoje
        </Link>
      </p>
    </main>
  )
}
