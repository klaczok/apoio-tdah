import Link from 'next/link'
import styles from '../configurar/configurar.module.css'
import { getStateStore } from '@/server/persistence'
import { MENSAGENS_ERRO } from '@/server/persistence/mensagens'
import { sinteseRevisao } from '@/server/dia/modelo'
import { ROTULOS_DIA } from '@/server/rotina/modelo'
import { dataCivilHoje, dataCivilParaTexto } from '@/server/tempo'

export const dynamic = 'force-dynamic'

// Consulta dos dias já passados com instância persistida — leitura pura:
// listar não materializa dias nem toca rotina ou revisões.
export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const search = await searchParams
  const hoje = dataCivilHoje()
  const carregado = await (await getStateStore()).load()
  const mensagemErro = carregado.ok
    ? search.erro
      ? MENSAGENS_ERRO[search.erro]
      : undefined
    : MENSAGENS_ERRO.persistencia

  const dias = carregado.ok
    ? Object.values(carregado.value.dados.dias)
        .filter((d) => d.data < hoje)
        .sort((a, b) => b.data.localeCompare(a.data))
    : []

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Histórico</h1>
      <p className={styles.intro}>
        Registro dos dias anteriores: o que foi planejado, os estados marcados na revisão e as
        decisões tomadas. Consulta — nada aqui altera a rotina nem o que já passou.
      </p>
      {mensagemErro && (
        <p role="alert" className={styles.erro}>
          {mensagemErro}
        </p>
      )}

      {carregado.ok &&
        (dias.length === 0 ? (
          <p>Nenhum dia anterior com registro ainda.</p>
        ) : (
          <ul className={styles.lista}>
            {dias.map((d) => (
              <li key={d.data} className={styles.item}>
                <span className={styles.itemTexto}>
                  <Link href={`/historico/${d.data}`}>
                    {ROTULOS_DIA[d.diaSemana]} · {dataCivilParaTexto(d.data)}
                  </Link>
                  {' — '}
                  {d.revisao.concluidaEm ? sinteseRevisao(d) : 'Revisão não concluída'}
                </span>
              </li>
            ))}
          </ul>
        ))}

      <p>
        <Link className={styles.voltar} href="/hoje">
          ← Voltar para hoje
        </Link>
      </p>
    </main>
  )
}
