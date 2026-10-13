import Link from 'next/link'
import { redirect } from 'next/navigation'
import ui from '@/app/_components/ui.module.css'
import { CabecalhoPagina } from '@/app/_components/ui'
import { storeDoUsuario } from '@/server/auth/contexto'
import styles from './entrevista.module.css'

export const dynamic = 'force-dynamic'

// Convite da entrevista inicial: ponto de entrada opcional para quem
// ainda não tem uma SemanaAtiva. Adiar não grava nada — o convite
// continua aparecendo no painel até existir uma semana confirmada.
export default async function EntrevistaPage() {
  const store = await storeDoUsuario()
  if (!store) redirect('/login')
  const carregado = await store.load()
  if (!carregado.ok) redirect('/hoje?erro=indisponivel')
  if (carregado.value.dados.semanaAtiva) redirect('/semana')

  return (
    <main className={styles.container}>
      <CabecalhoPagina
        eyebrow="Começo opcional"
        titulo="Entrevista inicial"
        subtitulo="Uma conversa guiada pela IA — ela pergunta sobre a sua rotina e propõe a primeira versão da sua semana."
      />

      <section className={styles.cartao} aria-label="Como a entrevista funciona">
        <ul>
          <li>
            A IA faz uma pergunta por vez e conhece você primeiro — sem número fixo de perguntas.
          </li>
          <li>
            Antes de qualquer envio, você decide se aceita que a conversa seja processada por IA — e
            pode seguir sem ela.
          </li>
          <li>
            Se sair ou fechar a página no meio, o progresso é perdido e nada fica salvo da
            entrevista.
          </li>
          <li>
            No fim, você revisa a proposta antes de confirmar: só o que você aceitar entra no
            calendário.
          </li>
          <li>Prefere montar sozinho? A configuração manual continua sempre disponível.</li>
        </ul>
        <div className={styles.acoes}>
          <Link className={`${ui.botao} ${ui.botaoPrimario}`} href="/entrevista/consentimento">
            Começar entrevista
          </Link>
          <Link className={`${ui.botao} ${ui.botaoSecundario}`} href="/hoje">
            Fazer depois
          </Link>
        </div>
        <p className={styles.nota}>
          Você também pode <Link href="/configurar">configurar sua rotina manualmente</Link>, sem
          usar a entrevista.
        </p>
      </section>
    </main>
  )
}
