import Link from 'next/link'
import styles from './hoje.module.css'
import { getStateStore } from '@/server/persistence'
import { MENSAGENS_ERRO } from '@/server/persistence/mensagens'
import { avaliarAlertas } from '@/server/dia/alertas'
import { instanciaDoDia } from '@/server/dia/gerar'
import {
  DESTINOS_PENDENCIA,
  ESTADOS_REVISAO,
  incluirPendencia,
  sinteseRevisao,
  type InstanciaDiaria,
} from '@/server/dia/modelo'
import { dataCivilHoje, dataCivilParaTexto, ehDataCivil, somarDiasCivil } from '@/server/tempo'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{
    salvo?: string
    erro?: string
    revisado?: string
    estado?: string
    decisao?: string
    prever?: string
    destino?: string
  }>
}

const ROTULOS_ESTADO: Record<string, string> = {
  realizado: 'Realizado',
  parcial: 'Parcial',
  reprogramado: 'Reprogramado',
  descartado: 'Descartado',
}

const ROTULOS_ENERGIA: Record<string, string> = { baixa: 'Baixa', ok: 'Ok', alta: 'Alta' }
const ROTULOS_SOBRECARGA: Record<string, string> = {
  leve: 'Leve',
  ok: 'Ok',
  pesada: 'Pesada',
}

const ROTULOS_DESTINO: Record<string, string> = {
  manter: 'Manter',
  reduzir: 'Reduzir',
  dividir: 'Dividir',
  'trocar-dia': 'Trocar de dia',
  descartar: 'Descartar',
}

function FormEstado({ instancia, id }: { instancia: InstanciaDiaria; id: string }) {
  const atual = instancia.revisao.estados[id]
  return (
    <form action="/api/dia" method="post" className={styles.formInline}>
      <input type="hidden" name="acao" value="revisar-item" />
      <input type="hidden" name="data" value={instancia.data} />
      <input type="hidden" name="id" value={id} />
      <label className={styles.srOnly} htmlFor={`estado-${id}`}>
        Estado do item
      </label>
      <select id={`estado-${id}`} name="estado" defaultValue={atual ?? ''}>
        <option value="">Sem registro</option>
        {ESTADOS_REVISAO.map((e) => (
          <option key={e} value={e}>
            {ROTULOS_ESTADO[e]}
          </option>
        ))}
      </select>
      <button type="submit">Registrar estado</button>
    </form>
  )
}

// Destino da pendência é sempre escolha explícita: nenhuma alternativa vem
// pré-selecionada e nada é reagendado automaticamente. Trocar de dia passa
// por um passo de prévia (conflitos/capacidade do destino) antes de gravar.
function FormDestino({
  instancia,
  id,
  dias,
}: {
  instancia: InstanciaDiaria
  id: string
  dias: Record<string, InstanciaDiaria>
}) {
  const decisao = instancia.revisao.decisoes[id]
  if (decisao) {
    // Se a troca de dia não chegou ao destino (falha na gravação), a
    // pendência continua aqui e o usuário pode confirmar de novo.
    const chegou =
      decisao.tipo !== 'trocar-dia' ||
      !decisao.destino ||
      Boolean(dias[decisao.destino]?.tarefas.some((t) => t.origemId === id))
    return (
      <span>
        {' '}
        → {ROTULOS_DESTINO[decisao.tipo]}
        {decisao.destino ? ` para ${dataCivilParaTexto(decisao.destino)}` : ''}
        {decisao.escopo ? ` (${decisao.escopo})` : ''}
        {decisao.partes.length > 0 ? ` (${decisao.partes.join(' + ')})` : ''}
        {!chegou && decisao.destino && (
          <form action="/api/dia" method="post" className={styles.formInline}>
            <input type="hidden" name="acao" value="pendencia-decidir" />
            <input type="hidden" name="data" value={instancia.data} />
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="tipo" value="trocar-dia" />
            <input type="hidden" name="destino" value={decisao.destino} />
            <label>
              <input type="checkbox" name="confirmar" /> Não chegou ao destino — confirmar novamente
            </label>
            <button type="submit">Confirmar troca</button>
          </form>
        )}
      </span>
    )
  }
  return (
    <>
      <form action="/api/dia" method="post" className={styles.formInline}>
        <input type="hidden" name="acao" value="pendencia-decidir" />
        <input type="hidden" name="data" value={instancia.data} />
        <input type="hidden" name="id" value={id} />
        <label className={styles.srOnly} htmlFor={`destino-tipo-${id}`}>
          Destino da pendência
        </label>
        <select id={`destino-tipo-${id}`} name="tipo" defaultValue="">
          <option value="" disabled>
            Escolher destino
          </option>
          {DESTINOS_PENDENCIA.filter((d) => d !== 'trocar-dia').map((d) => (
            <option key={d} value={d}>
              {ROTULOS_DESTINO[d]}
            </option>
          ))}
        </select>
        <label className={styles.srOnly} htmlFor={`escopo-${id}`}>
          Novo escopo ou duração
        </label>
        <input id={`escopo-${id}`} name="escopo" type="text" placeholder="Novo escopo" />
        <label className={styles.srOnly} htmlFor={`partes-${id}`}>
          Partes (uma por linha)
        </label>
        <textarea
          className={styles.textarea}
          id={`partes-${id}`}
          name="partes"
          rows={2}
          placeholder="Partes, uma por linha"
        />
        <button type="submit">Decidir</button>
      </form>
      <form action="/api/dia" method="post" className={styles.formInline}>
        <input type="hidden" name="acao" value="pendencia-prever" />
        <input type="hidden" name="data" value={instancia.data} />
        <input type="hidden" name="id" value={id} />
        <label className={styles.srOnly} htmlFor={`troca-${id}`}>
          Dia de destino
        </label>
        <input
          id={`troca-${id}`}
          name="destino"
          type="date"
          min={somarDiasCivil(instancia.data, 1)}
          required
        />
        <button type="submit">Trocar de dia</button>
      </form>
    </>
  )
}

export default async function HojePage({ searchParams }: Props) {
  const params = await searchParams
  const hoje = dataCivilHoje()
  const carregado = await (await getStateStore()).load()

  const erroCarga = !carregado.ok
  const nota = carregado.ok ? (carregado.value.dados.notasPorDia[hoje] ?? '') : ''
  const instancia = carregado.ok ? carregado.value.dados.dias[hoje] : undefined
  const mensagemErro = params.erro ? MENSAGENS_ERRO[params.erro] : undefined

  // Prévia da troca de dia: reutiliza o cálculo de alertas do planejamento
  // sobre a instância do destino (existente ou materializada da semana
  // ativa) com a pendência incluída — sem gravar nada.
  let previa: {
    item: { id: string; titulo: string }
    destino: string
    alertas: { mensagem: string }[]
  } | null = null
  if (instancia && carregado.ok && params.prever && params.destino && ehDataCivil(params.destino)) {
    const item =
      instancia.itens.find((i) => i.id === params.prever) ??
      instancia.tarefas.find((t) => t.id === params.prever)
    const alvo = instanciaDoDia(
      carregado.value.dados.dias[params.destino],
      carregado.value.dados,
      params.destino,
      carregado.value.version
    )
    if (item && alvo) {
      const simulada = incluirPendencia(alvo, item)
      previa = {
        item: { id: item.id, titulo: item.titulo },
        destino: params.destino,
        alertas: avaliarAlertas(simulada, carregado.value.dados.rotina),
      }
    }
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Hoje</h1>

      {params.salvo === '1' && (
        <p role="status" className={styles.feedback}>
          Anotação salva.
        </p>
      )}
      {params.revisado === '1' && (
        <p role="status" className={styles.feedback}>
          Revisão concluída.
        </p>
      )}
      {params.estado === '1' && (
        <p role="status" className={styles.feedback}>
          Estado registrado.
        </p>
      )}
      {params.decisao === '1' && (
        <p role="status" className={styles.feedback}>
          Decisão registrada.
        </p>
      )}
      {(mensagemErro || erroCarga) && (
        <p role="alert" className={styles.erro}>
          {mensagemErro ?? 'Não foi possível carregar suas anotações agora. Tente recarregar.'}
        </p>
      )}

      {instancia ? (
        <section aria-labelledby="revisao-titulo">
          <h2 id="revisao-titulo">Revisar o dia</h2>
          {instancia.revisao.concluidaEm ? (
            <>
              <h3>Síntese do dia</h3>
              <p>{sinteseRevisao(instancia)}</p>
              {instancia.revisao.energia && (
                <p>Energia: {ROTULOS_ENERGIA[instancia.revisao.energia]}</p>
              )}
              {instancia.revisao.sobrecarga && (
                <p>Sobrecarga: {ROTULOS_SOBRECARGA[instancia.revisao.sobrecarga]}</p>
              )}
              {instancia.revisao.motivo && <p>Motivo: {instancia.revisao.motivo}</p>}
              {instancia.revisao.nota && <p>Nota: {instancia.revisao.nota}</p>}
              <ul>
                {[...instancia.itens, ...instancia.tarefas].map((item) => (
                  <li key={item.id}>
                    {item.titulo} —{' '}
                    {instancia.revisao.estados[item.id]
                      ? ROTULOS_ESTADO[instancia.revisao.estados[item.id]]
                      : 'Sem registro'}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <ul>
                {[...instancia.itens, ...instancia.tarefas].map((item) => (
                  <li key={item.id}>
                    {item.titulo}
                    <FormEstado instancia={instancia} id={item.id} />
                    {instancia.revisao.estados[item.id] !== 'realizado' &&
                      instancia.revisao.estados[item.id] !== 'descartado' && (
                        <FormDestino
                          instancia={instancia}
                          id={item.id}
                          dias={carregado.ok ? carregado.value.dados.dias : {}}
                        />
                      )}
                  </li>
                ))}
              </ul>
              {params.prever && !previa && (
                <p role="alert" className={styles.erro}>
                  Não foi possível simular o dia de destino.
                </p>
              )}
              {previa && (
                <section aria-labelledby="prever-titulo">
                  <h3 id="prever-titulo">
                    Destino {dataCivilParaTexto(previa.destino)} — {previa.item.titulo}
                  </h3>
                  {previa.alertas.length > 0 ? (
                    <ul>
                      {previa.alertas.map((a, i) => (
                        <li key={i}>{a.mensagem}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Sem conflitos ou alertas no destino.</p>
                  )}
                  <form action="/api/dia" method="post" className={styles.formInline}>
                    <input type="hidden" name="acao" value="pendencia-decidir" />
                    <input type="hidden" name="data" value={instancia.data} />
                    <input type="hidden" name="id" value={previa.item.id} />
                    <input type="hidden" name="tipo" value="trocar-dia" />
                    <input type="hidden" name="destino" value={previa.destino} />
                    <label>
                      <input type="checkbox" name="confirmar" /> Confirmo a troca para{' '}
                      {dataCivilParaTexto(previa.destino)}
                    </label>
                    <button type="submit">Confirmar troca</button>
                  </form>
                </section>
              )}
              <form action="/api/dia" method="post" className={styles.nota}>
                <input type="hidden" name="acao" value="revisar-concluir" />
                <input type="hidden" name="data" value={instancia.data} />
                <label className={styles.label} htmlFor="energia">
                  Energia (opcional)
                </label>
                <select id="energia" name="energia" defaultValue="">
                  <option value="">—</option>
                  {Object.entries(ROTULOS_ENERGIA).map(([v, r]) => (
                    <option key={v} value={v}>
                      {r}
                    </option>
                  ))}
                </select>
                <label className={styles.label} htmlFor="sobrecarga">
                  Sobrecarga (opcional)
                </label>
                <select id="sobrecarga" name="sobrecarga" defaultValue="">
                  <option value="">—</option>
                  {Object.entries(ROTULOS_SOBRECARGA).map(([v, r]) => (
                    <option key={v} value={v}>
                      {r}
                    </option>
                  ))}
                </select>
                <label className={styles.label} htmlFor="motivo">
                  Motivo de não conclusão (opcional)
                </label>
                <input id="motivo" name="motivo" type="text" />
                <label className={styles.label} htmlFor="nota-revisao">
                  Nota (opcional)
                </label>
                <textarea className={styles.textarea} id="nota-revisao" name="nota" rows={3} />
                <button className={styles.salvar} type="submit">
                  Concluir revisão
                </button>
              </form>
            </>
          )}
        </section>
      ) : (
        <p>Nenhum planejamento para hoje.</p>
      )}

      <form className={styles.nota} action="/api/notas/dia" method="post">
        <input type="hidden" name="data" value={hoje} />
        <label className={styles.label} htmlFor="nota">
          Anotação do dia
        </label>
        <textarea
          className={styles.textarea}
          id="nota"
          name="nota"
          rows={4}
          defaultValue={nota}
          disabled={erroCarga}
        />
        <button className={styles.salvar} type="submit" disabled={erroCarga}>
          Salvar anotação
        </button>
      </form>

      <Link href="/amanha">Planejar amanhã</Link>

      <Link href="/proposta">Proposta da semana</Link>

      <Link href="/configurar">Configurar rotina</Link>

      <form action="/api/auth/logout" method="post">
        <button className={styles.logout} type="submit">
          Sair
        </button>
      </form>
    </main>
  )
}
