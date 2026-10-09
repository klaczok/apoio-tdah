import styles from './hoje.module.css'

export default function HojePage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Hoje</h1>
      <form action="/api/auth/logout" method="post">
        <button className={styles.logout} type="submit">
          Sair
        </button>
      </form>
    </main>
  )
}
