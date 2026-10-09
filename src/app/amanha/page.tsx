import Link from 'next/link'
import styles from '../configurar/configurar.module.css'
import { getStateStore } from '@/server/persistence'
import { MENSAGENS_ERRO } from '@/server/persistence/mensagens'
import {
  dataCivilAmanha,
  dataCivilParaTexto,
  dataHoraParaTexto,
  diaSemanaDe,
  horaParaMinutos,
  minutosParaHora,
} from '@/server/tempo'
import { CATEGORIAS, ROTULOS_CATEGORIA, ROTULOS_DIA, type Categoria } from '@/server/rotina/modelo'
import type { InstanciaDiaria, ItemDia, Tarefa } from '@/server/dia/modelo'
import { avaliarAlertas, type Alerta } from '@/server/dia/alertas'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{
    planejado?: string
    confirmado?: string
    salvo?: string
    erro?: string
    substituir?: string
  }>
}

function horario(item: { inicio: string | null; fim: string | null }): string {
  return item.inicio && item.fim ? `${item.inicio}–${item.fim}` : 'a confirmar'
}

function formatarMinutos(min: number): string {
  if (min % 60 === 0) return `${min / 60}h`
  if (min > 60) return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
  return `${min}min`
}

type Lacuna = { inicio: number; fim: number }

// Espaços livres entre itens com horário, dentro da janela acordar–dormir.
// São tempo respirável, não obrigação a preencher.
function lacunasDoDia(instancia: InstanciaDiaria): Lacuna[] {
  const janelaInicio = instancia.acordar ? horaParaMinutos(instancia.acordar) : null
  const janelaFim = instancia.dormir ? horaParaMinutos(instancia.dormir) : null
  const agendados = instancia.itens
    .filter((i) => i.inicio !== null && i.fim !== null)
    .map((i) => ({ inicio: horaParaMinutos(i.inicio!), fim: horaParaMinutos(i.fim!) }))
    .sort((a, b) => a.inicio - b.inicio)

  const livres: Lacuna[] = []
  let cursor = janelaInicio
  for (const item of agendados) {
    if (cursor !== null && item.inicio > cursor) {
      livres.push({ inicio: cursor, fim: item.inicio })
    }
    cursor = cursor === null ? item.fim : Math.max(cursor, item.fim)
  }
  if (cursor !== null && janelaFim !== null && janelaFim > cursor) {
    livres.push({ inicio: cursor, fim: janelaFim })
  }
  return livres
}

function ConfirmacaoProtegido({ id }: { id: string }) {
  return (
    <label className={styles.opcao} htmlFor={`confirmar-${id}`}>
      <input id={`confirmar-${id}`} type="checkbox" name="confirmar" />
      Confirmo a alteração deste item protegido
    </label>
  )
}

function AcaoAjustar({ item, data }: { item: ItemDia; data: string }) {
  return (
    <details className={styles.edicao}>
      <summary className={styles.secundaria}>Ajustar</summary>
      <form className={styles.form} action="/api/dia" method="post">
        <input type="hidden" name="acao" value="ajustar" />
        <input type="hidden" name="data" value={data} />
        <input type="hidden" name="id" value={item.id} />
        <label className={styles.label} htmlFor={`inicio-${item.id}`}>
          Início
        </label>
        <input
          className={styles.input}
          id={`inicio-${item.id}`}
          name="inicio"
          type="time"
          defaultValue={item.inicio ?? ''}
        />
        <label className={styles.label} htmlFor={`fim-${item.id}`}>
          Fim
        </label>
        <input
          className={styles.input}
          id={`fim-${item.id}`}
          name="fim"
          type="time"
          defaultValue={item.fim ?? ''}
        />
        {item.protecao === 'fixo' && <ConfirmacaoProtegido id={item.id} />}
        <button className={styles.acao} type="submit">
          Salvar ajuste
        </button>
      </form>
    </details>
  )
}

function AcaoPrioridade({
  itemId,
  data,
  ehPrioridade,
}: {
  itemId: string
  data: string
  ehPrioridade: boolean
}) {
  return (
    <form action="/api/dia" method="post" className={styles.formInline}>
      <input type="hidden" name="acao" value={ehPrioridade ? 'despromover' : 'promover'} />
      <input type="hidden" name="data" value={data} />
      <input type="hidden" name="id" value={itemId} />
      <button className={styles.secundaria} type="submit">
        {ehPrioridade ? 'Remover prioridade' : 'Marcar como prioridade'}
      </button>
    </form>
  )
}

function resolverItem(instancia: InstanciaDiaria, id: string): ItemDia | Tarefa | undefined {
  return instancia.itens.find((i) => i.id === id) ?? instancia.tarefas.find((t) => t.id === id)
}

// Até três prioridades do dia — seção própria antes dos detalhes flexíveis.
function PrioridadesDoDia({ instancia }: { instancia: InstanciaDiaria }) {
  if (instancia.prioridades.length === 0) return null
  const itens = instancia.prioridades
    .map((id) => resolverItem(instancia, id))
    .filter((i): i is ItemDia | Tarefa => i !== undefined)
  return (
    <section className={styles.form} aria-label="Prioridades do dia">
      <h2 className={styles.subtitulo}>Prioridades do dia</h2>
      <ol className={styles.lista}>
        {itens.map((item) => (
          <li key={item.id} className={styles.item}>
            <span className={styles.itemTexto}>
              {horario(item)} · {item.titulo} · {ROTULOS_CATEGORIA[item.categoria]}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

// A quarta prioridade não é aceita automaticamente: o usuário escolhe qual
// substituir — ou cancela voltando sem submeter.
function Substituicao({
  instancia,
  candidatoId,
}: {
  instancia: InstanciaDiaria
  candidatoId: string
}) {
  const candidato = resolverItem(instancia, candidatoId)
  if (!candidato || instancia.prioridades.length === 0) return null
  const atuais = instancia.prioridades
    .map((id) => resolverItem(instancia, id))
    .filter((i): i is ItemDia | Tarefa => i !== undefined)
  return (
    <section className={styles.form} aria-label="Substituir prioridade">
      <h2 className={styles.subtitulo}>Substituir prioridade</h2>
      <p className={styles.dica}>
        Já são três prioridades. Escolha qual sai para “{candidato.titulo}” entrar — ou simplesmente
        não escolha nada.
      </p>
      <form className={styles.form} action="/api/dia" method="post">
        <input type="hidden" name="acao" value="substituir" />
        <input type="hidden" name="data" value={instancia.data} />
        <input type="hidden" name="novo" value={candidatoId} />
        {atuais.map((item) => (
          <label key={item.id} className={styles.opcao} htmlFor={`antigo-${item.id}`}>
            <input id={`antigo-${item.id}`} type="radio" name="antigo" value={item.id} required />
            {item.titulo} · {horario(item)}
          </label>
        ))}
        <button className={styles.acao} type="submit">
          Substituir
        </button>
      </form>
      <Link className={styles.voltar} href="/amanha">
        Cancelar e manter as prioridades atuais
      </Link>
    </section>
  )
}

// Alertas aparecem como dados do plano, antes da confirmação — são
// informativos e distintos de erros de validação ou persistência.
function AlertasDoDia({ alertas }: { alertas: Alerta[] }) {
  if (alertas.length === 0) return null
  return (
    <section className={styles.form} aria-label="Alertas do dia">
      <h2 className={styles.subtitulo}>Alertas do dia</h2>
      <ul className={styles.lista}>
        {alertas.map((a, i) => (
          <li key={i} className={styles.item}>
            <span className={styles.itemTexto}>{a.mensagem}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function FixosDoDia({ instancia }: { instancia: InstanciaDiaria }) {
  const fixos = instancia.itens.filter((i) => i.protecao === 'fixo')
  const diaPresencial = instancia.itens.some(
    (i) => i.origem === 'preparacao' || i.origem === 'deslocamento'
  )
  if (fixos.length === 0 && !diaPresencial && instancia.saidaRecomendada === null) return null
  return (
    <section className={styles.form} aria-label="Compromissos fixos">
      <h2 className={styles.subtitulo}>Compromissos fixos</h2>
      {fixos.length === 0 ? (
        <p className={styles.dica}>Nenhum compromisso fixo neste dia.</p>
      ) : (
        <ul className={styles.lista}>
          {fixos.map((item) => (
            <li key={item.id} className={styles.item}>
              <span className={styles.itemTexto}>
                {horario(item)} · {item.titulo} · {ROTULOS_CATEGORIA[item.categoria]}
              </span>
            </li>
          ))}
        </ul>
      )}
      {diaPresencial && instancia.saidaRecomendada === null && (
        <p className={styles.dica}>Dia presencial — horário de saída a confirmar.</p>
      )}
    </section>
  )
}

// Forma normalizada da linha do tempo: itens do plano e tarefas agendadas
// dividem a mesma sequência cronológica.
type ItemLinha = {
  id: string
  titulo: string
  categoria: Categoria
  inicio: string | null
  fim: string | null
  protecao: 'fixo' | 'flexivel'
  explicacao: string
  plano: ItemDia | null
}

function paraItemLinha(item: ItemDia): ItemLinha {
  return { ...item, plano: item }
}

function tarefaParaLinha(tarefa: Tarefa): ItemLinha {
  return {
    id: tarefa.id,
    titulo: tarefa.titulo,
    categoria: tarefa.categoria,
    inicio: tarefa.inicio,
    fim: tarefa.fim,
    protecao: 'flexivel',
    explicacao: tarefa.nota ?? 'Tarefa do dia.',
    plano: null,
  }
}

function horarioLinha(item: ItemLinha): string {
  if (item.inicio && item.fim) return `${item.inicio}–${item.fim}`
  if (item.inicio) return `${item.inicio} · duração a confirmar`
  return 'a confirmar'
}

function CargaPorArea({ instancia }: { instancia: InstanciaDiaria }) {
  const porCategoria = new Map<Categoria, number>()
  for (const item of [...instancia.itens, ...instancia.tarefas]) {
    if (item.inicio === null || item.fim === null) continue
    const minutos = horaParaMinutos(item.fim) - horaParaMinutos(item.inicio)
    porCategoria.set(item.categoria, (porCategoria.get(item.categoria) ?? 0) + minutos)
  }
  const trabalho = porCategoria.get('trabalho') ?? 0
  const demais = [...porCategoria.entries()].filter(([c]) => c !== 'trabalho')
  return (
    <p className={styles.dica}>
      Carga planejada — trabalho: {formatarMinutos(trabalho)}
      {demais.length > 0 &&
        ` · ${demais.map(([c, m]) => `${ROTULOS_CATEGORIA[c]} ${formatarMinutos(m)}`).join(' · ')}`}
    </p>
  )
}

function LinhaDoTempo({ instancia, editavel }: { instancia: InstanciaDiaria; editavel: boolean }) {
  const todos = [...instancia.itens.map(paraItemLinha), ...instancia.tarefas.map(tarefaParaLinha)]
  const comHorario = todos
    .filter((i) => i.inicio !== null)
    .sort((a, b) => horaParaMinutos(a.inicio!) - horaParaMinutos(b.inicio!))
  // Tarefas sem horário ficam na seção própria, não nesta lista.
  const semHorario = todos.filter((i) => i.inicio === null && i.plano !== null)
  const livres = lacunasDoDia(instancia)

  type Evento =
    | { tipo: 'item'; item: ItemLinha }
    | { tipo: 'livre'; inicio: number; fim: number }
    | { tipo: 'marco'; texto: string; minutos: number }

  const eventos: Evento[] = comHorario.map((item) => ({ tipo: 'item', item }))
  for (const l of livres) eventos.push({ tipo: 'livre', ...l })
  if (instancia.acordar) {
    eventos.push({
      tipo: 'marco',
      texto: `acordar ${instancia.acordar}`,
      minutos: horaParaMinutos(instancia.acordar),
    })
  }
  if (instancia.dormir) {
    eventos.push({
      tipo: 'marco',
      texto: `dormir ${instancia.dormir}`,
      minutos: horaParaMinutos(instancia.dormir),
    })
  }
  if (instancia.saidaRecomendada) {
    eventos.push({
      tipo: 'marco',
      texto: `sair até ${instancia.saidaRecomendada}`,
      minutos: horaParaMinutos(instancia.saidaRecomendada),
    })
  }

  const minutosDe = (e: Evento): number =>
    e.tipo === 'item' ? horaParaMinutos(e.item.inicio!) : e.tipo === 'livre' ? e.inicio : e.minutos
  eventos.sort((a, b) => minutosDe(a) - minutosDe(b))

  return (
    <>
      <ol className={styles.lista} aria-label="Linha do tempo">
        {eventos.map((e, idx) =>
          e.tipo === 'livre' ? (
            <li key={`livre-${idx}`} className={styles.item}>
              <span className={styles.itemTexto}>
                Livre {minutosParaHora(e.inicio)}–{minutosParaHora(e.fim)} · tempo respirável
              </span>
            </li>
          ) : e.tipo === 'marco' ? (
            <li key={`marco-${idx}`} className={styles.item}>
              <span className={styles.itemTexto}>{e.texto}</span>
            </li>
          ) : (
            <li key={e.item.id} className={styles.item}>
              <span className={styles.itemTexto}>
                {horarioLinha(e.item)} · {e.item.titulo} · {ROTULOS_CATEGORIA[e.item.categoria]} ·{' '}
                {e.item.plano === null
                  ? 'Tarefa'
                  : e.item.protecao === 'fixo'
                    ? 'Fixo'
                    : 'Flexível'}
                {instancia.prioridades.includes(e.item.id) && ' · Prioridade'}
              </span>
              <p className={styles.dica}>{e.item.explicacao}</p>
              {editavel && e.item.plano !== null && (
                <AcaoAjustar item={e.item.plano} data={instancia.data} />
              )}
              {editavel && (
                <AcaoPrioridade
                  itemId={e.item.id}
                  data={instancia.data}
                  ehPrioridade={instancia.prioridades.includes(e.item.id)}
                />
              )}
            </li>
          )
        )}
      </ol>
      {semHorario.length > 0 && (
        <section className={styles.form} aria-label="Sem horário">
          <h2 className={styles.subtitulo}>Sem horário definido</h2>
          <ul className={styles.lista}>
            {semHorario.map((item) => (
              <li key={item.id} className={styles.item}>
                <span className={styles.itemTexto}>
                  {item.titulo} · {ROTULOS_CATEGORIA[item.categoria]}
                </span>
                <p className={styles.dica}>{item.explicacao}</p>
                {editavel && item.plano !== null && (
                  <AcaoAjustar item={item.plano} data={instancia.data} />
                )}
                {editavel && (
                  <AcaoPrioridade
                    itemId={item.id}
                    data={instancia.data}
                    ehPrioridade={instancia.prioridades.includes(item.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

function FormTarefa({ instancia, tarefa }: { instancia: InstanciaDiaria; tarefa?: Tarefa }) {
  return (
    <form className={styles.form} action="/api/dia" method="post">
      <input type="hidden" name="acao" value={tarefa ? 'tarefa-editar' : 'tarefa-criar'} />
      <input type="hidden" name="data" value={instancia.data} />
      {tarefa && <input type="hidden" name="id" value={tarefa.id} />}
      <label className={styles.label} htmlFor={`tarefa-titulo-${tarefa?.id ?? 'nova'}`}>
        Título
      </label>
      <input
        className={styles.input}
        id={`tarefa-titulo-${tarefa?.id ?? 'nova'}`}
        name="titulo"
        required
        defaultValue={tarefa?.titulo}
      />
      <label className={styles.label} htmlFor={`tarefa-categoria-${tarefa?.id ?? 'nova'}`}>
        Categoria
      </label>
      <select
        className={styles.input}
        id={`tarefa-categoria-${tarefa?.id ?? 'nova'}`}
        name="categoria"
        defaultValue={tarefa?.categoria ?? 'pessoal'}
      >
        {CATEGORIAS.map((c) => (
          <option key={c} value={c}>
            {ROTULOS_CATEGORIA[c]}
          </option>
        ))}
      </select>
      <label className={styles.label} htmlFor={`tarefa-inicio-${tarefa?.id ?? 'nova'}`}>
        Início (opcional)
      </label>
      <input
        className={styles.input}
        id={`tarefa-inicio-${tarefa?.id ?? 'nova'}`}
        name="inicio"
        type="time"
        defaultValue={tarefa?.inicio ?? ''}
      />
      <label className={styles.label} htmlFor={`tarefa-fim-${tarefa?.id ?? 'nova'}`}>
        Fim (opcional)
      </label>
      <input
        className={styles.input}
        id={`tarefa-fim-${tarefa?.id ?? 'nova'}`}
        name="fim"
        type="time"
        defaultValue={tarefa?.fim ?? ''}
      />
      <label className={styles.label} htmlFor={`tarefa-nota-${tarefa?.id ?? 'nova'}`}>
        Nota (opcional)
      </label>
      <input
        className={styles.input}
        id={`tarefa-nota-${tarefa?.id ?? 'nova'}`}
        name="nota"
        defaultValue={tarefa?.nota ?? ''}
      />
      <button className={styles.acao} type="submit">
        {tarefa ? 'Salvar tarefa' : 'Adicionar tarefa'}
      </button>
    </form>
  )
}

// Tarefas vivem na seção própria — criar, editar, agendar, dividir em partes
// rastreáveis, promover a prioridade e remover (com confirmação, sem estado
// de descarte).
function TarefasDoDia({ instancia, editavel }: { instancia: InstanciaDiaria; editavel: boolean }) {
  return (
    <section className={styles.form} aria-label="Tarefas do dia">
      <h2 className={styles.subtitulo}>Tarefas do dia</h2>
      {instancia.tarefas.length === 0 && (
        <p className={styles.dica}>Nenhuma tarefa anotada para amanhã.</p>
      )}
      <ul className={styles.lista}>
        {instancia.tarefas.map((t) => {
          const origem = t.origemId ? resolverItem(instancia, t.origemId) : undefined
          return (
            <li key={t.id} className={styles.item}>
              <span className={styles.itemTexto}>
                {t.inicio ? `${t.inicio}${t.fim ? `–${t.fim}` : ''}` : 'Sem horário'} · {t.titulo} ·{' '}
                {ROTULOS_CATEGORIA[t.categoria]}
                {instancia.prioridades.includes(t.id) && ' · Prioridade'}
                {origem && ` · parte de "${origem.titulo}"`}
              </span>
              {t.nota && <p className={styles.dica}>Nota: {t.nota}</p>}
              {editavel && (
                <>
                  <AcaoPrioridade
                    itemId={t.id}
                    data={instancia.data}
                    ehPrioridade={instancia.prioridades.includes(t.id)}
                  />
                  <details className={styles.edicao}>
                    <summary className={styles.secundaria}>Editar</summary>
                    <FormTarefa instancia={instancia} tarefa={t} />
                  </details>
                  <details className={styles.edicao}>
                    <summary className={styles.secundaria}>Dividir em partes</summary>
                    <form className={styles.form} action="/api/dia" method="post">
                      <input type="hidden" name="acao" value="tarefa-dividir" />
                      <input type="hidden" name="data" value={instancia.data} />
                      <input type="hidden" name="id" value={t.id} />
                      <label className={styles.label} htmlFor={`partes-${t.id}`}>
                        Uma parte por linha
                      </label>
                      <textarea
                        className={styles.input}
                        id={`partes-${t.id}`}
                        name="partes"
                        rows={3}
                      />
                      <button className={styles.acao} type="submit">
                        Dividir
                      </button>
                    </form>
                  </details>
                  <form className={styles.form} action="/api/dia" method="post">
                    <input type="hidden" name="acao" value="tarefa-remover" />
                    <input type="hidden" name="data" value={instancia.data} />
                    <input type="hidden" name="id" value={t.id} />
                    <label className={styles.opcao} htmlFor={`remover-${t.id}`}>
                      <input id={`remover-${t.id}`} type="checkbox" name="confirmar" />
                      Confirmo a remoção desta tarefa
                    </label>
                    <button className={styles.secundaria} type="submit">
                      Remover
                    </button>
                  </form>
                </>
              )}
            </li>
          )
        })}
      </ul>
      {editavel && (
        <details className={styles.edicao}>
          <summary className={styles.secundaria}>Nova tarefa</summary>
          <FormTarefa instancia={instancia} />
        </details>
      )}
    </section>
  )
}

function NotaDoDia({ instancia, editavel }: { instancia: InstanciaDiaria; editavel: boolean }) {
  return (
    <section className={styles.form} aria-label="Nota do dia">
      <h2 className={styles.subtitulo}>Nota do dia</h2>
      {instancia.notaDia && <p className={styles.itemTexto}>{instancia.notaDia}</p>}
      {editavel && (
        <form className={styles.form} action="/api/dia" method="post">
          <input type="hidden" name="acao" value="nota-dia" />
          <input type="hidden" name="data" value={instancia.data} />
          <label className={styles.label} htmlFor="nota-dia">
            Anotação opcional — nunca obrigatória para confirmar
          </label>
          <textarea
            className={styles.input}
            id="nota-dia"
            name="nota"
            rows={2}
            defaultValue={instancia.notaDia ?? ''}
          />
          <button className={styles.secundaria} type="submit">
            Salvar nota
          </button>
        </form>
      )}
    </section>
  )
}

export default async function AmanhaPage({ searchParams }: Props) {
  const params = await searchParams
  const amanha = dataCivilAmanha()
  const carregado = await (await getStateStore()).load()

  const erroCarga = !carregado.ok
  const instancia = carregado.ok ? (carregado.value.dados.dias[amanha] ?? null) : null
  const semanaAtiva = carregado.ok ? carregado.value.dados.semanaAtiva : null
  const mensagemErro = params.erro ? MENSAGENS_ERRO[params.erro] : undefined
  const editavel = instancia !== null && instancia.confirmadaEm === null
  const alertas =
    instancia !== null && carregado.ok
      ? avaliarAlertas(instancia, carregado.value.dados.rotina)
      : []

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Amanhã</h1>
      <p className={styles.intro}>
        {dataCivilParaTexto(amanha)} · {ROTULOS_DIA[diaSemanaDe(amanha)]}
      </p>

      {params.planejado === '1' && (
        <p role="status" className={styles.feedback}>
          Amanhã planejado a partir da semana confirmada — ajuste à vontade, nada muda na rotina.
        </p>
      )}
      {params.confirmado === '1' && (
        <p role="status" className={styles.feedback}>
          Dia confirmado.
        </p>
      )}
      {params.salvo === '1' && (
        <p role="status" className={styles.feedback}>
          Ajuste salvo.
        </p>
      )}
      {(mensagemErro || erroCarga) && (
        <p role="alert" className={styles.erro}>
          {mensagemErro ?? 'Não foi possível carregar o planejamento agora. Tente recarregar.'}
        </p>
      )}

      {!instancia && !semanaAtiva && !erroCarga && (
        <>
          <p className={styles.dica}>O dia é planejado a partir da proposta semanal confirmada.</p>
          <Link className={styles.acao} href="/proposta">
            Revisar a proposta da semana
          </Link>
        </>
      )}

      {!instancia && semanaAtiva && !erroCarga && (
        <>
          <p className={styles.dica}>
            Gera a linha do tempo de amanhã a partir da semana confirmada. Você pode mover e
            redimensionar os blocos flexíveis sem alterar a rotina.
          </p>
          <form action="/api/dia" method="post">
            <input type="hidden" name="acao" value="planejar" />
            <button className={styles.acao} type="submit">
              Planejar amanhã
            </button>
          </form>
        </>
      )}

      {instancia && (
        <>
          {instancia.confirmadaEm && (
            <p role="status" className={styles.feedback}>
              Dia confirmado em {dataHoraParaTexto(instancia.confirmadaEm)}.
            </p>
          )}
          <PrioridadesDoDia instancia={instancia} />
          {params.substituir && editavel && (
            <Substituicao instancia={instancia} candidatoId={params.substituir} />
          )}
          <FixosDoDia instancia={instancia} />
          <LinhaDoTempo instancia={instancia} editavel={editavel} />
          <TarefasDoDia instancia={instancia} editavel={editavel} />
          <NotaDoDia instancia={instancia} editavel={editavel} />
          <CargaPorArea instancia={instancia} />
          <AlertasDoDia alertas={alertas} />
          {editavel && (
            <form action="/api/dia" method="post" className={styles.form}>
              <input type="hidden" name="acao" value="confirmar" />
              <input type="hidden" name="data" value={instancia.data} />
              {alertas.length > 0 && (
                <label className={styles.opcao} htmlFor="ciente-alertas">
                  <input id="ciente-alertas" type="checkbox" name="ciente" />
                  Estou ciente dos alertas do dia
                </label>
              )}
              <button className={styles.acao} type="submit">
                Confirmar o dia
              </button>
            </form>
          )}
        </>
      )}

      <Link className={styles.voltar} href="/hoje">
        Voltar para hoje
      </Link>
    </main>
  )
}
