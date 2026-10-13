import Link from 'next/link'
import { redirect } from 'next/navigation'
import ui from '@/app/_components/ui.module.css'
import { CabecalhoPagina } from '@/app/_components/ui'
import { storeDoUsuario } from '@/server/auth/contexto'
import styles from '../entrevista.module.css'

export const dynamic = 'force-dynamic'

// Tela de conclusão: só faz sentido com SemanaAtiva recém-confirmada.
// Comunica que a entrevista não pode ser reaberta nesta versão e que o
// material transitório foi descartado — o calendário segue editável
// manualmente.
export default async function ConcluidaPage() {
  const store = await storeDoUsuario()
  if (!store) redirect('/login')
  const carregado = await store.load()
  if (!carregado.ok) redirect('/hoje?erro=indisponivel')
  if (!carregado.value.dados.semanaAtiva) redirect('/entrevista')

  return (
    <main className={styles.container}>
      <CabecalhoPagina
        eyebrow="Tudo certo"
        titulo="Sua semana está no ar"
        subtitulo="A proposta virou sua semana ativa. A entrevista não pode ser reaberta nesta versão — e nada dela ficou guardado."
      />
      <section className={styles.cartao}>
        <p>
          Respostas, documento e sugestões da IA foram descartados. Daqui em diante, o calendário
          continua editável manualmente, no seu ritmo.
        </p>
        <div className={styles.acoes}>
          <Link className={`${ui.botao} ${ui.botaoPrimario}`} href="/semana">
            Ver minha semana
          </Link>
          <Link className={`${ui.botao} ${ui.botaoSecundario}`} href="/configurar">
            Ajustar configuração
          </Link>
        </div>
      </section>
    </main>
  )
}
