import Link from 'next/link'
import styles from '../configurar/configurar.module.css'
import { redirect } from 'next/navigation'
import { Aviso, CabecalhoPagina, EstadoVazio } from '@/app/_components/ui'
import { storeDoUsuario } from '@/server/auth/contexto'
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
  const store = await storeDoUsuario()
  if (!store) redirect('/login')
  const carregado = await store.load()
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
      <CabecalhoPagina
        eyebrow="Consulta"
        titulo="Histórico"
        subtitulo="Registro dos dias anteriores: o que foi planejado, os estados marcados na revisão e as decisões tomadas. Consulta — nada aqui altera a rotina nem o que já passou."
      />
      {mensagemErro && <Aviso tipo="erro">{mensagemErro}</Aviso>}

      {carregado.ok &&
        (dias.length === 0 ? (
          <EstadoVazio titulo="Nenhum dia registrado ainda">
            <p>O histórico acumula os dias anteriores a hoje conforme as revisões acontecem.</p>
          </EstadoVazio>
        ) : (
          <ul className={styles.lista}>
            {dias.map((d) => {
              const concluida = d.revisao.concluidaEm != null
              return (
                <li key={d.data} className={styles.item}>
                  <span className={styles.itemTexto}>
                    <Link href={`/historico/${d.data}`}>
                      {ROTULOS_DIA[d.diaSemana]} · {dataCivilParaTexto(d.data)}
                    </Link>
                    {' — '}
                    {concluida ? sinteseRevisao(d) : 'Revisão não concluída'}
                  </span>
                  <span
                    className={`${styles.tagEtapa} ${concluida ? styles.tagOk : styles.tagPendente}`}
                  >
                    {concluida ? 'Revisão concluída' : 'Revisão aberta'}
                  </span>
                </li>
              )
            })}
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
