import Link from 'next/link'
import { redirect } from 'next/navigation'
import ui from '@/app/_components/ui.module.css'
import { CabecalhoPagina } from '@/app/_components/ui'
import { storeDoUsuario } from '@/server/auth/contexto'
import { consentimentoConcedido } from '@/server/entrevista/sessao'
import styles from '../entrevista.module.css'

export const dynamic = 'force-dynamic'

// Portão da entrevista: sem consentimento registrado na sessão efêmera,
// a coleta não começa e nenhum dado pode ir ao provedor de IA. O
// conteúdo das cinco etapas entra na evolução seguinte (#48).
export default async function EtapasPage() {
  const store = await storeDoUsuario()
  if (!store) redirect('/login')
  const carregado = await store.load()
  if (!carregado.ok) redirect('/hoje?erro=indisponivel')
  if (carregado.value.dados.semanaAtiva) redirect('/semana')
  if (!(await consentimentoConcedido())) redirect('/entrevista/consentimento')

  return (
    <main className={styles.container}>
      <CabecalhoPagina
        eyebrow="Entrevista"
        titulo="Suas respostas"
        subtitulo="Cinco etapas curtas."
      />

      <div className={styles.progresso} role="status">
        <span>Etapa 1 de 5</span>
        <div
          className={styles.progressoBarra}
          role="progressbar"
          aria-label="Progresso da entrevista"
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={1}
        >
          <div className={styles.progressoPreenchimento} style={{ width: '20%' }} />
        </div>
      </div>

      <section className={styles.cartao}>
        <p>
          Consentimento registrado — esta sessão de entrevista é temporária: se você sair ou fechar
          a página, o progresso é perdido.
        </p>
        <div className={styles.acoes}>
          <Link className={`${ui.botao} ${ui.botaoSecundario}`} href="/hoje">
            Sair da entrevista
          </Link>
        </div>
      </section>
    </main>
  )
}
