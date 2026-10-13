import Link from 'next/link'
import { redirect } from 'next/navigation'
import ui from '@/app/_components/ui.module.css'
import { CabecalhoPagina } from '@/app/_components/ui'
import { storeDoUsuario } from '@/server/auth/contexto'
import { sessaoDaEntrevista } from '@/server/entrevista/sessao'
import styles from '../entrevista.module.css'

export const dynamic = 'force-dynamic'

// Revisão da proposta gerada a partir das respostas: exige consentimento
// e respostas na sessão efêmera. A geração via Gemini e a revisão dos
// blocos entram nas evoluções seguintes (#50, #51).
export default async function RevisaoPage() {
  const store = await storeDoUsuario()
  if (!store) redirect('/login')
  const carregado = await store.load()
  if (!carregado.ok) redirect('/hoje?erro=indisponivel')
  if (carregado.value.dados.semanaAtiva) redirect('/semana')

  const sessao = await sessaoDaEntrevista()
  if (!sessao) redirect('/entrevista/consentimento')
  if (!sessao.respostas) redirect('/entrevista/etapas')

  return (
    <main className={styles.container}>
      <CabecalhoPagina
        eyebrow="Entrevista concluída"
        titulo="Revisão da proposta"
        subtitulo="Suas respostas estão registradas nesta sessão — a proposta é montada a seguir."
      />
      <section className={styles.cartao}>
        <p>
          A próxima etapa gera uma proposta de semana a partir do que você contou. Você vai revisar
          cada bloco antes de confirmar — nada entra no calendário sem o seu aceite.
        </p>
        <div className={styles.acoes}>
          <Link className={`${ui.botao} ${ui.botaoSecundario}`} href="/entrevista/etapas">
            Refazer a entrevista
          </Link>
          <Link className={`${ui.botao} ${ui.botaoSecundario}`} href="/hoje">
            Fazer depois
          </Link>
        </div>
        <p className={styles.nota}>
          Refazer a entrevista descarta as respostas atuais — elas não ficam salvas.
        </p>
      </section>
    </main>
  )
}
