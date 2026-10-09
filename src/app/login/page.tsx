import styles from './login.module.css'

type Props = {
  searchParams: Promise<{ erro?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { erro } = await searchParams

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Apoio à Rotina</h1>
      <form className={styles.form} action="/api/auth/login" method="post">
        {erro === 'credencial' && (
          <p role="alert" className={styles.error}>
            E-mail ou senha incorretos.
          </p>
        )}
        <label className={styles.label} htmlFor="email">
          E-mail
        </label>
        <input
          className={styles.input}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <label className={styles.label} htmlFor="password">
          Senha
        </label>
        <input
          className={styles.input}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <button className={styles.submit} type="submit">
          Entrar
        </button>
      </form>
    </main>
  )
}
