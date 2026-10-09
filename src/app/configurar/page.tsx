import Link from 'next/link'
import styles from './configurar.module.css'
import { ETAPAS, ROTULOS_ETAPA } from './etapas'
import { resumoEtapa } from './resumo'
import { getStateStore } from '@/server/persistence'
import { MENSAGENS_ERRO } from '@/server/persistence/mensagens'
import { rotinaVazia } from '@/server/rotina/modelo'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ erro?: string; concluida?: string }>
}

export default async function ConfigurarPage({ searchParams }: Props) {
  const params = await searchParams
  const carregado = await (await getStateStore()).load()

  const erroCarga = !carregado.ok
  const rotina = carregado.ok ? carregado.value.dados.rotina : rotinaVazia()
  const mensagemErro = params.erro ? MENSAGENS_ERRO[params.erro] : undefined

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Configurar rotina</h1>
      <p className={styles.intro}>
        Cada etapa é curta e pode ser revista depois. O que não for informado fica a confirmar —
        nenhum valor é inventado. As alterações aqui valem para todas as semanas futuras.
      </p>

      {params.concluida === '1' && (
        <p role="status" className={styles.feedback}>
          Configuração salva.
        </p>
      )}
      {(mensagemErro || erroCarga) && (
        <p role="alert" className={styles.erro}>
          {mensagemErro ?? 'Não foi possível carregar sua rotina agora. Tente recarregar.'}
        </p>
      )}

      <ol className={styles.etapas}>
        {ETAPAS.map((etapa, indice) => (
          <li key={etapa} className={styles.etapa}>
            <Link className={styles.etapaLink} href={`/configurar/${etapa}`}>
              {indice + 1}. {ROTULOS_ETAPA[etapa]}
            </Link>
            <span className={styles.resumo}>{resumoEtapa(rotina, etapa)}</span>
          </li>
        ))}
      </ol>

      <Link className={styles.voltar} href="/hoje">
        Voltar para hoje
      </Link>
    </main>
  )
}
