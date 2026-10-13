import Link from 'next/link'
import { ShellPublico } from '@/app/_components/shell'
import { Aviso } from '@/app/_components/ui'
import ui from '@/app/_components/ui.module.css'
import styles from './login.module.css'

type Props = {
  searchParams: Promise<{ erro?: string }>
}

// Rota pública de autenticação: mesma identidade visual da área
// privada, sem expor navegação ou dados da conta.
export default async function LoginPage({ searchParams }: Props) {
  const { erro } = await searchParams

  return (
    <ShellPublico>
      <main className={styles.container}>
        <h1 className={styles.title}>Entrar na sua rotina</h1>
        <p className={styles.lead}>Seu plano está guardado do jeito que você deixou.</p>
        <form className={styles.form} action="/api/auth/login" method="post">
          {erro === 'credencial' && <Aviso tipo="erro">E-mail ou senha incorretos.</Aviso>}
          <label className={ui.campo} htmlFor="email">
            E-mail
            <input
              className={ui.entrada}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>
          <label className={ui.campo} htmlFor="password">
            Senha
            <input
              className={ui.entrada}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button className={`${ui.botao} ${ui.botaoPrimario} ${styles.submit}`} type="submit">
            Entrar
          </button>
        </form>
        <p className={ui.ajudaCampo}>
          Ainda não tem conta? <Link href="/cadastro">Criar conta</Link>
        </p>
      </main>
    </ShellPublico>
  )
}
