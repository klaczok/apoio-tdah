import Link from 'next/link'
import styles from './hoje.module.css'
import { getStateStore } from '@/server/persistence'
import { MENSAGENS_ERRO } from '@/server/persistence/mensagens'
import { ESTADOS_REVISAO, sinteseRevisao, type InstanciaDiaria } from '@/server/dia/modelo'
import { dataCivilHoje } from '@/server/tempo'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ salvo?: string; erro?: string; revisado?: string; estado?: string }>
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

export default async function HojePage({ searchParams }: Props) {
  const params = await searchParams
  const hoje = dataCivilHoje()
  const carregado = await (await getStateStore()).load()

  const erroCarga = !carregado.ok
  const nota = carregado.ok ? (carregado.value.dados.notasPorDia[hoje] ?? '') : ''
  const instancia = carregado.ok ? carregado.value.dados.dias[hoje] : undefined
  const mensagemErro = params.erro ? MENSAGENS_ERRO[params.erro] : undefined

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
                  </li>
                ))}
              </ul>
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
