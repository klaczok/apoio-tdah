import { redirect } from 'next/navigation'
import { CabecalhoPagina } from '@/app/_components/ui'
import { WizardEntrevista } from '@/app/_components/wizard-entrevista'
import { storeDoUsuario } from '@/server/auth/contexto'
import { consentimentoConcedido } from '@/server/entrevista/sessao'
import styles from '../entrevista.module.css'

export const dynamic = 'force-dynamic'

// Portão da entrevista: sem consentimento registrado na sessão efêmera,
// a coleta não começa e nenhum dado pode ir ao provedor de IA.
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
      <WizardEntrevista />
    </main>
  )
}
