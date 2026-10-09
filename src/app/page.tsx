'use client'

import styles from './page.module.css'

export default function Home() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Apoio à Rotina</h1>
      <p className={styles.lead}>Planejador pessoal de baixa carga cognitiva.</p>
    </main>
  )
}
