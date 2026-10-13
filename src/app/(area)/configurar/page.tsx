import Link from 'next/link'
import styles from './configurar.module.css'
import { ETAPAS, ROTULOS_ETAPA } from './etapas'
import { etapaPendente, resumoEtapa } from './resumo'
import { redirect } from 'next/navigation'
import { Aviso, CabecalhoPagina } from '@/app/_components/ui'
import { storeDoUsuario } from '@/server/auth/contexto'
import { MENSAGENS_ERRO } from '@/server/persistence/mensagens'
import { rotinaVazia } from '@/server/rotina/modelo'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ erro?: string; concluida?: string }>
}

export default async function ConfigurarPage({ searchParams }: Props) {
  const params = await searchParams
  const store = await storeDoUsuario()
  if (!store) redirect('/login')
  const carregado = await store.load()

  const erroCarga = !carregado.ok
  const rotina = carregado.ok ? carregado.value.dados.rotina : rotinaVazia()
  const mensagemErro = params.erro ? MENSAGENS_ERRO[params.erro] : undefined
  const pendentes = erroCarga ? 0 : ETAPAS.filter((etapa) => etapaPendente(rotina, etapa)).length

  return (
    <main className={styles.container}>
      <CabecalhoPagina
        eyebrow="Rotina recorrente"
        titulo="Configurar rotina"
        subtitulo="Cada etapa é curta e pode ser revista depois. O que não for informado fica a confirmar — nenhum valor é inventado. As alterações aqui valem para todas as semanas futuras."
        acoes={
          <span className={`${styles.tagEtapa} ${pendentes ? styles.tagPendente : styles.tagOk}`}>
            {pendentes ? `${pendentes} etapa(s) a confirmar` : 'Tudo configurado'}
          </span>
        }
      />

      {params.concluida === '1' && <Aviso tipo="sucesso">Configuração salva.</Aviso>}
      {(mensagemErro || erroCarga) && (
        <Aviso tipo="erro">
          {mensagemErro ?? 'Não foi possível carregar sua rotina agora. Tente recarregar.'}
        </Aviso>
      )}

      <ol className={styles.etapas}>
        {ETAPAS.map((etapa, indice) => {
          const pendente = !erroCarga && etapaPendente(rotina, etapa)
          return (
            <li key={etapa} className={styles.etapa}>
              <span className={styles.etapaCabeca}>
                <Link className={styles.etapaLink} href={`/configurar/${etapa}`}>
                  {indice + 1}. {ROTULOS_ETAPA[etapa]}
                </Link>
                <span
                  className={`${styles.tagEtapa} ${pendente ? styles.tagPendente : styles.tagOk}`}
                >
                  {pendente ? 'A confirmar' : 'Configurada'}
                </span>
              </span>
              <span className={styles.resumo}>
                {erroCarga ? 'Resumo indisponível.' : resumoEtapa(rotina, etapa)}
              </span>
            </li>
          )
        })}
      </ol>

      <Link className={styles.voltar} href="/hoje">
        Voltar para hoje
      </Link>
    </main>
  )
}
