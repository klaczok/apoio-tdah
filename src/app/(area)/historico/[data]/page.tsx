import Link from 'next/link'
import { redirect } from 'next/navigation'
import styles from '../../configurar/configurar.module.css'
import { Aviso, CabecalhoPagina, Secao } from '@/app/_components/ui'
import { storeDoUsuario } from '@/server/auth/contexto'
import { MENSAGENS_ERRO } from '@/server/persistence/mensagens'
import {
  ESTADOS_REVISAO,
  ROTULOS_DESTINO,
  ROTULOS_ENERGIA,
  ROTULOS_ESTADO,
  ROTULOS_SOBRECARGA,
  sinteseRevisao,
  type EstadoRevisao,
  type InstanciaDiaria,
} from '@/server/dia/modelo'
import { ROTULOS_CATEGORIA, ROTULOS_DIA } from '@/server/rotina/modelo'
import {
  dataCivilHoje,
  dataCivilParaTexto,
  dataHoraParaTexto,
  ehDataCivil,
  horarioParaTexto,
} from '@/server/tempo'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ data: string }>
  searchParams: Promise<{ erro?: string; corrigido?: string }>
}

function rotuloEstado(estado: EstadoRevisao | null): string {
  return estado ? ROTULOS_ESTADO[estado] : 'Sem registro'
}

function decisaoTexto(instancia: InstanciaDiaria, id: string): string | null {
  const decisao = instancia.revisao.decisoes[id]
  if (!decisao) return null
  const partes = [
    ROTULOS_DESTINO[decisao.tipo],
    decisao.destino ? `para ${dataCivilParaTexto(decisao.destino)}` : null,
    decisao.escopo ? `(${decisao.escopo})` : null,
    decisao.partes.length > 0 ? `(${decisao.partes.join(' + ')})` : null,
  ]
  return partes.filter(Boolean).join(' ')
}

// Correção de estado em revisão concluída — ação explícita com trilha.
function FormCorrecao({ instancia, id }: { instancia: InstanciaDiaria; id: string }) {
  return (
    <form action="/api/dia" method="post" className={styles.form}>
      <input type="hidden" name="acao" value="revisao-corrigir" />
      <input type="hidden" name="data" value={instancia.data} />
      <input type="hidden" name="volta" value="historico" />
      <input type="hidden" name="id" value={id} />
      <label className={styles.label} htmlFor={`corrige-${id}`}>
        Novo estado
      </label>
      <select id={`corrige-${id}`} name="estado" defaultValue="" required>
        <option value="" disabled>
          Escolher estado
        </option>
        {ESTADOS_REVISAO.map((e) => (
          <option key={e} value={e}>
            {ROTULOS_ESTADO[e]}
          </option>
        ))}
      </select>
      <label className={styles.opcao} htmlFor={`confirmar-${id}`}>
        <input id={`confirmar-${id}`} type="checkbox" name="confirmar" />
        Confirmo a correção deste registro
      </label>
      <button className={styles.secundaria} type="submit">
        Corrigir estado
      </button>
    </form>
  )
}

// Detalhe de um dia passado — leitura do que ficou persistido. Nunca
// projeta nem materializa: sem instância, informa e devolve à lista.
export default async function HistoricoDiaPage({ params, searchParams }: Props) {
  const { data } = await params
  const search = await searchParams
  const hoje = dataCivilHoje()
  const store = await storeDoUsuario()
  if (!store) redirect('/login')
  const carregado = await store.load()
  const mensagemErro = carregado.ok
    ? search.erro
      ? MENSAGENS_ERRO[search.erro]
      : undefined
    : MENSAGENS_ERRO.persistencia

  // Histórico é o que passou e foi gravado — data de hoje, futura ou
  // inválida não entra, mesmo que exista instância persistida para ela.
  const valido = ehDataCivil(data) && data < hoje
  const instancia = carregado.ok && valido ? (carregado.value.dados.dias[data] ?? null) : null
  const concluida = instancia?.revisao.concluidaEm != null
  const anotacao = carregado.ok ? carregado.value.dados.notasPorDia[data] : undefined

  return (
    <main className={styles.container}>
      <CabecalhoPagina
        eyebrow="Histórico — consulta"
        titulo={
          instancia
            ? `${ROTULOS_DIA[instancia.diaSemana]} · ${dataCivilParaTexto(data)}`
            : valido
              ? 'Dia sem registro'
              : 'Fora do histórico'
        }
        subtitulo={
          instancia
            ? concluida
              ? 'Revisão concluída — correções pedem confirmação explícita.'
              : 'Revisão não concluída — os estados marcados ficam como estavam.'
            : undefined
        }
      />
      {search.corrigido === '1' && <Aviso tipo="sucesso">Correção registrada.</Aviso>}
      {mensagemErro && <Aviso tipo="erro">{mensagemErro}</Aviso>}

      {!instancia ? (
        !carregado.ok ? null : valido ? (
          <p>Não há instância persistida para este dia.</p>
        ) : (
          <p>O histórico mostra dias anteriores a hoje que já foram gravados.</p>
        )
      ) : (
        <>
          <Secao titulo="Plano do dia">
            <ul className={styles.lista}>
              {instancia.itens.map((item) => {
                const decisao = decisaoTexto(instancia, item.id)
                return (
                  <li key={item.id} className={styles.item}>
                    <span className={styles.itemTexto}>
                      {horarioParaTexto(item.inicio, item.fim)} · {item.titulo} ·{' '}
                      {ROTULOS_CATEGORIA[item.categoria]} ·{' '}
                      {item.protecao === 'fixo' ? 'Fixo' : 'Flexível'}
                      {' — '}
                      {rotuloEstado(instancia.revisao.estados[item.id] ?? null)}
                      {decisao ? ` · decisão: ${decisao}` : ''}
                    </span>
                    {concluida && (
                      <details className={styles.edicao}>
                        <summary className={styles.label}>Corrigir estado registrado</summary>
                        <FormCorrecao instancia={instancia} id={item.id} />
                      </details>
                    )}
                  </li>
                )
              })}
              {instancia.tarefas.map((t) => {
                const decisao = decisaoTexto(instancia, t.id)
                return (
                  <li key={t.id} className={styles.item}>
                    <span className={styles.itemTexto}>
                      {horarioParaTexto(t.inicio, t.fim)} · {t.titulo} ·{' '}
                      {ROTULOS_CATEGORIA[t.categoria]} · tarefa
                      {' — '}
                      {rotuloEstado(instancia.revisao.estados[t.id] ?? null)}
                      {decisao ? ` · decisão: ${decisao}` : ''}
                    </span>
                    {concluida && (
                      <details className={styles.edicao}>
                        <summary className={styles.label}>Corrigir estado registrado</summary>
                        <FormCorrecao instancia={instancia} id={t.id} />
                      </details>
                    )}
                  </li>
                )
              })}
            </ul>
          </Secao>

          {instancia.prioridades.length > 0 && (
            <Secao titulo="Prioridades do dia">
              <ul className={styles.lista}>
                {instancia.prioridades.map((pid) => {
                  const alvo =
                    instancia.itens.find((i) => i.id === pid) ??
                    instancia.tarefas.find((t) => t.id === pid)
                  return (
                    <li key={pid} className={styles.item}>
                      <span className={styles.itemTexto}>{alvo?.titulo ?? 'item removido'}</span>
                    </li>
                  )
                })}
              </ul>
            </Secao>
          )}

          <Secao titulo="Revisão do dia">
            <p>
              {concluida
                ? `Síntese: ${sinteseRevisao(instancia)}`
                : 'Revisão não concluída — os estados marcados ficam como estavam.'}
            </p>
            {instancia.revisao.energia && (
              <p>Energia: {ROTULOS_ENERGIA[instancia.revisao.energia]}</p>
            )}
            {instancia.revisao.sobrecarga && (
              <p>Sobrecarga: {ROTULOS_SOBRECARGA[instancia.revisao.sobrecarga]}</p>
            )}
            {instancia.revisao.motivo && <p>Motivo: {instancia.revisao.motivo}</p>}
            {instancia.revisao.nota && <p>Nota da revisão: {instancia.revisao.nota}</p>}
            {instancia.notaDia && <p>Nota do dia: {instancia.notaDia}</p>}
            {anotacao && <p>Anotação do dia: {anotacao}</p>}
            {instancia.revisao.correcoes.length > 0 && (
              <>
                <h3>Correções</h3>
                <ul className={styles.lista}>
                  {instancia.revisao.correcoes.map((c, i) => {
                    const alvo =
                      instancia.itens.find((i) => i.id === c.itemId) ??
                      instancia.tarefas.find((t) => t.id === c.itemId)
                    return (
                      <li key={i} className={styles.item}>
                        <span className={styles.itemTexto}>
                          {alvo?.titulo ?? 'item removido'}: de {rotuloEstado(c.anterior)} para{' '}
                          {ROTULOS_ESTADO[c.corrigido]} · {dataHoraParaTexto(c.registradaEm)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </Secao>
        </>
      )}

      <p>
        <Link className={styles.voltar} href="/historico">
          ← Voltar ao histórico
        </Link>
      </p>
    </main>
  )
}
