import Link from 'next/link'
import { ShellPublico } from '@/app/_components/shell'
import { Aviso } from '@/app/_components/ui'
import ui from '@/app/_components/ui.module.css'
import { SENHA_MINIMA } from '@/server/auth/cadastro'
import styles from '../login/login.module.css'

type Props = {
  searchParams: Promise<{ erro?: string; email?: string }>
}

// Erros de campo associados ao controle correspondente. O e-mail volta
// preenchido (dado não sensível); senha e confirmação nunca retornam.
function ErroCampo({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} role="alert" className={ui.erroCampo}>
      {children}
    </p>
  )
}

export default async function CadastroPage({ searchParams }: Props) {
  const { erro, email } = await searchParams

  const erroEmail =
    erro === 'email-invalido'
      ? 'Informe um e-mail válido.'
      : erro === 'email-em-uso'
        ? 'Este e-mail já tem uma conta — você pode entrar com ela.'
        : null
  const erroSenha = erro === 'senha-fraca' ? 'A senha não atende aos requisitos acima.' : null
  const erroConfirmacao =
    erro === 'confirmacao-divergente' ? 'A confirmação não confere com a senha.' : null

  return (
    <ShellPublico>
      <main className={styles.container}>
        <h1 className={styles.title}>Criar sua conta</h1>
        <p className={styles.lead}>Só e-mail e senha — sua rotina começa vazia, do seu jeito.</p>
        <form className={styles.form} action="/api/auth/cadastro" method="post" noValidate>
          {erro === 'indisponivel' && (
            <Aviso tipo="erro">Não foi possível criar a conta agora. Tente de novo em instantes.</Aviso>
          )}
          <label className={ui.campo} htmlFor="email">
            E-mail
            <input
              className={ui.entrada}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={email}
              required
              aria-invalid={erroEmail ? true : undefined}
              aria-describedby={erroEmail ? 'erro-email' : undefined}
            />
          </label>
          {erroEmail && <ErroCampo id="erro-email">{erroEmail}</ErroCampo>}
          <p id="requisitos-senha" className={ui.ajudaCampo}>
            A senha precisa ter pelo menos {SENHA_MINIMA} caracteres.
          </p>
          <label className={ui.campo} htmlFor="senha">
            Senha
            <input
              className={ui.entrada}
              id="senha"
              name="senha"
              type="password"
              autoComplete="new-password"
              minLength={SENHA_MINIMA}
              required
              aria-describedby={`requisitos-senha${erroSenha ? ' erro-senha' : ''}`}
              aria-invalid={erroSenha ? true : undefined}
            />
          </label>
          {erroSenha && <ErroCampo id="erro-senha">{erroSenha}</ErroCampo>}
          <label className={ui.campo} htmlFor="confirmacao">
            Confirmação de senha
            <input
              className={ui.entrada}
              id="confirmacao"
              name="confirmacao"
              type="password"
              autoComplete="new-password"
              minLength={SENHA_MINIMA}
              required
              aria-invalid={erroConfirmacao ? true : undefined}
              aria-describedby={erroConfirmacao ? 'erro-confirmacao' : undefined}
            />
          </label>
          {erroConfirmacao && <ErroCampo id="erro-confirmacao">{erroConfirmacao}</ErroCampo>}
          <button className={`${ui.botao} ${ui.botaoPrimario} ${styles.submit}`} type="submit">
            Criar conta
          </button>
        </form>
        <p className={ui.ajudaCampo}>
          Já tem conta? <Link href="/login">Entrar</Link>
        </p>
      </main>
    </ShellPublico>
  )
}
