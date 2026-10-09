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
import { ROTULOS_CATEGORIA, ROTULOS_DIA, type Categoria } from '@/server/rotina/modelo'
import type { InstanciaDiaria, ItemDia } from '@/server/dia/modelo'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{
    planejado?: string
    confirmado?: string
    salvo?: string
    erro?: string
  }>
}

function horario(item: ItemDia): string {
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

function CargaPorArea({ itens }: { itens: ItemDia[] }) {
  const porCategoria = new Map<Categoria, number>()
  for (const item of itens) {
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
  const comHorario = instancia.itens
    .filter((i) => i.inicio !== null)
    .sort((a, b) => horaParaMinutos(a.inicio!) - horaParaMinutos(b.inicio!))
  const semHorario = instancia.itens.filter((i) => i.inicio === null)
  const livres = lacunasDoDia(instancia)

  type Evento =
    | { tipo: 'item'; item: ItemDia }
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
                {horario(e.item)} · {e.item.titulo} · {ROTULOS_CATEGORIA[e.item.categoria]} ·{' '}
                {e.item.protecao === 'fixo' ? 'Fixo' : 'Flexível'}
              </span>
              <p className={styles.dica}>{e.item.explicacao}</p>
              {editavel && <AcaoAjustar item={e.item} data={instancia.data} />}
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
                {editavel && <AcaoAjustar item={item} data={instancia.data} />}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
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
          <FixosDoDia instancia={instancia} />
          <LinhaDoTempo instancia={instancia} editavel={editavel} />
          <CargaPorArea itens={instancia.itens} />
          {editavel && (
            <form action="/api/dia" method="post">
              <input type="hidden" name="acao" value="confirmar" />
              <input type="hidden" name="data" value={instancia.data} />
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
