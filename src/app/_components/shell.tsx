import Link from 'next/link'
import type { ReactNode } from 'react'
import styles from './shell.module.css'
import { iniciaisDoEmail } from './identidade'
import { ACAO_CENTRAL, DESTINOS_PRINCIPAIS, DESTINO_CONFIGURACAO } from './destinos'
import { ItemNavegacao } from './navegacao'

function Marca({ href, compacto = false }: { href: string; compacto?: boolean }) {
  return (
    <Link className={styles.marca} href={href} aria-label="Ritmo">
      <span className={styles.marcaSimbolo} aria-hidden="true">
        r
      </span>
      <span className={styles.marcaTexto}>
        <strong>Ritmo</strong>
        {!compacto && <small>planejador pessoal</small>}
      </span>
    </Link>
  )
}

// Encerramento da sessão, exposto no desktop (área de conta) e no
// celular (cabeçalho) — a capacidade existe nos dois contextos.
function Sair({ classe }: { classe: string }) {
  return (
    <form action="/api/auth/logout" method="post" className={styles.sairForm}>
      <button className={classe} type="submit">
        Sair
      </button>
    </form>
  )
}

// Área de conta: identidade derivada do e-mail autenticado + saída.
// Nenhum campo de nome ou avatar configurável é introduzido.
function AreaConta({ email }: { email: string | null }) {
  const rotulo = email ?? 'Sua conta'
  return (
    <div className={styles.conta}>
      <span className={styles.avatar} aria-hidden="true">
        {email ? iniciaisDoEmail(email) : '◦'}
      </span>
      <span className={styles.contaTexto}>
        <strong>{rotulo}</strong>
        <small>conta pessoal</small>
      </span>
      <Sair classe={styles.sair} />
    </div>
  )
}

// Shell da área autenticada: sidebar no desktop; cabeçalho compacto e
// navegação inferior no celular. O conteúdo mantém o próprio <main> —
// o shell fornece só a moldura de navegação.
export function ShellPrivado({ email, children }: { email: string | null; children: ReactNode }) {
  return (
    <div className={styles.estrutura}>
      <aside className={styles.lateral}>
        <Marca href="/hoje" />
        <nav className={styles.navPrincipal} aria-label="Navegação principal">
          {DESTINOS_PRINCIPAIS.map((d) => (
            <ItemNavegacao key={d.href} destino={d} />
          ))}
        </nav>
        <div className={styles.lateralRodape}>
          <ItemNavegacao destino={DESTINO_CONFIGURACAO} />
          <div className={styles.encorajamento}>
            <span aria-hidden="true">✦</span>
            <p>
              <strong>Um passo de cada vez.</strong>
              <br />
              Seu plano não precisa ser perfeito para funcionar.
            </p>
          </div>
          <AreaConta email={email} />
        </div>
      </aside>

      <header className={styles.topoMovel}>
        <Marca href="/hoje" compacto />
        <div className={styles.topoMovelConta}>
          <Sair classe={styles.sairMovel} />
          <Link
            className={styles.avatar}
            href="/configurar"
            aria-label={email ? `Conta de ${email}` : 'Sua conta'}
            title={email ?? 'Sua conta'}
          >
            {email ? iniciaisDoEmail(email) : '◦'}
          </Link>
        </div>
      </header>

      <div className={styles.conteudo}>{children}</div>

      <nav className={styles.navMovel} aria-label="Navegação móvel">
        <ItemNavegacao destino={DESTINOS_PRINCIPAIS[0]!} />
        <ItemNavegacao destino={DESTINOS_PRINCIPAIS[1]!} />
        <Link
          className={styles.acaoCentral}
          href={ACAO_CENTRAL.href}
          aria-label={ACAO_CENTRAL.rotulo}
        >
          <span aria-hidden="true">{ACAO_CENTRAL.icone}</span>
        </Link>
        <ItemNavegacao destino={DESTINOS_PRINCIPAIS[2]!} />
        <ItemNavegacao destino={DESTINOS_PRINCIPAIS[3]!} />
      </nav>
    </div>
  )
}

// Shell das rotas públicas de autenticação: mesma identidade visual,
// sem expor navegação privada.
export function ShellPublico({ children }: { children: ReactNode }) {
  return (
    <div className={styles.publico}>
      <div className={styles.publicoCaixa}>
        <Marca href="/" />
        {children}
      </div>
    </div>
  )
}
