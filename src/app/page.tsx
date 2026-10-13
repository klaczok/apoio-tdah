import Link from 'next/link'
import { ShellPublico } from '@/app/_components/shell'
import ui from '@/app/_components/ui.module.css'
import styles from './page.module.css'

export default function Home() {
  return (
    <ShellPublico>
      <main className={styles.container}>
        <h1 className={styles.title}>Apoio à Rotina</h1>
        <p className={styles.lead}>
          Planejador pessoal de baixa carga cognitiva — sua semana, organizada no seu ritmo.
        </p>
        <Link className={`${ui.botao} ${ui.botaoPrimario} ${styles.entrar}`} href="/login">
          Entrar
        </Link>
      </main>
    </ShellPublico>
  )
}
