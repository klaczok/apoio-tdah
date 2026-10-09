import styles from './hoje.module.css'
import { getStateStore } from '@/server/persistence'
import { MENSAGENS_ERRO } from '@/server/persistence/mensagens'
import { dataCivilHoje } from '@/server/tempo'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ salvo?: string; erro?: string }>
}

export default async function HojePage({ searchParams }: Props) {
  const params = await searchParams
  const hoje = dataCivilHoje()
  const carregado = await (await getStateStore()).load()

  const erroCarga = !carregado.ok
  const nota = carregado.ok ? (carregado.value.dados.notasPorDia[hoje] ?? '') : ''
  const mensagemErro = params.erro ? MENSAGENS_ERRO[params.erro] : undefined

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Hoje</h1>

      {params.salvo === '1' && (
        <p role="status" className={styles.feedback}>
          Anotação salva.
        </p>
      )}
      {(mensagemErro || erroCarga) && (
        <p role="alert" className={styles.erro}>
          {mensagemErro ?? 'Não foi possível carregar suas anotações agora. Tente recarregar.'}
        </p>
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

      <form action="/api/auth/logout" method="post">
        <button className={styles.logout} type="submit">
          Sair
        </button>
      </form>
    </main>
  )
}
