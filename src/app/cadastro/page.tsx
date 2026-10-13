import Link from 'next/link'
import { ShellPublico } from '@/app/_components/shell'
import { Aviso } from '@/app/_components/ui'
import ui from '@/app/_components/ui.module.css'
import { SENHA_MINIMA } from '@/server/auth/cadastro'
import { MOTIVOS_USO, NECESSIDADES, ROTULOS_MOTIVO, ROTULOS_NECESSIDADE } from '@/server/perfil/modelo'
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
        <p className={styles.lead}>
          E-mail, senha e algumas perguntas rápidas — quanto mais você contar agora, menos a
          entrevista precisa perguntar depois.
        </p>
        <form className={styles.form} action="/api/auth/cadastro" method="post" noValidate>
          {erro === 'indisponivel' && (
            <Aviso tipo="erro">
              Não foi possível criar a conta agora. Tente de novo em instantes.
            </Aviso>
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

          <fieldset className={styles.perfil}>
            <legend className={styles.perfilTitulo}>Para a IA já conhecer você (opcional)</legend>
            <label className={ui.campo} htmlFor="nome">
              Como podemos te chamar?
              <input
                className={ui.entrada}
                id="nome"
                name="nome"
                type="text"
                autoComplete="name"
                maxLength={80}
              />
            </label>
            <label className={ui.campo} htmlFor="idade">
              Idade
              <input
                className={ui.entrada}
                id="idade"
                name="idade"
                type="number"
                min={5}
                max={120}
                inputMode="numeric"
              />
            </label>
            <label className={ui.campo} htmlFor="motivoUso">
              O que te trouxe até aqui?
              <select className={ui.entrada} id="motivoUso" name="motivoUso" defaultValue="">
                <option value="" disabled>
                  Escolha uma opção
                </option>
                {MOTIVOS_USO.map((motivo) => (
                  <option key={motivo} value={motivo}>
                    {ROTULOS_MOTIVO[motivo]}
                  </option>
                ))}
              </select>
            </label>
            <label className={ui.campo} htmlFor="motivoOutro">
              Se foi outro motivo, conte em uma frase
              <input className={ui.entrada} id="motivoOutro" name="motivoOutro" type="text" maxLength={200} />
            </label>
            <label className={ui.campo} htmlFor="necessidadePrincipal">
              O que mais pesa hoje?
              <select
                className={ui.entrada}
                id="necessidadePrincipal"
                name="necessidadePrincipal"
                defaultValue=""
              >
                <option value="" disabled>
                  Escolha uma opção
                </option>
                {NECESSIDADES.map((necessidade) => (
                  <option key={necessidade} value={necessidade}>
                    {ROTULOS_NECESSIDADE[necessidade]}
                  </option>
                ))}
              </select>
            </label>
            <label className={ui.campo} htmlFor="rotinaDiaria">
              Como é um dia típico seu? Conte horários de sono, trabalho e compromissos fixos.
              <textarea
                className={ui.entrada}
                id="rotinaDiaria"
                name="rotinaDiaria"
                rows={3}
                maxLength={600}
              />
            </label>
            <label className={ui.campo} htmlFor="tarefasSemana">
              Já sabe as tarefas desta semana? Liste se quiser.
              <textarea
                className={ui.entrada}
                id="tarefasSemana"
                name="tarefasSemana"
                rows={3}
                maxLength={600}
              />
            </label>
          </fieldset>

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
