import { redirect } from 'next/navigation'
import { CabecalhoPagina } from '@/app/_components/ui'
import { WizardEntrevista } from '@/app/_components/wizard-entrevista'
import { storeDoUsuario } from '@/server/auth/contexto'
import { consentimentoConcedido, sessaoDaEntrevista } from '@/server/entrevista/sessao'
import styles from '../entrevista.module.css'

export const dynamic = 'force-dynamic'

// Portão da entrevista: sem consentimento registrado na sessão efêmera,
// a conversa não começa e nenhum dado pode ir ao provedor de IA. Quem
// volta da revisão retoma a transcrição de onde parou — o histórico
// fica guardado em material transitório no servidor.
export default async function EtapasPage() {
  const store = await storeDoUsuario()
  if (!store) redirect('/login')
  const carregado = await store.load()
  if (!carregado.ok) redirect('/hoje?erro=indisponivel')
  if (carregado.value.dados.semanaAtiva) redirect('/semana')
  const sessao = await sessaoDaEntrevista()
  if (!sessao) redirect('/entrevista/consentimento')

  return (
    <main className={styles.container}>
      <CabecalhoPagina
        eyebrow="Entrevista"
        titulo="Sua conversa"
        subtitulo="A IA conduz — você só responde."
      />
      <WizardEntrevista />
    </main>
  )
}
