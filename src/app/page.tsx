import Link from 'next/link'
import ui from '@/app/_components/ui.module.css'
import styles from './page.module.css'

const BENEFICIOS = [
  {
    icone: '◔',
    titulo: 'Um dia de cada vez',
    texto:
      'O Hoje mostra só o que importa agora — o agora, o próximo passo e o que já passou. Sem a semana inteira gritando por atenção.',
  },
  {
    icone: '✎',
    titulo: 'Conversa que vira calendário',
    texto:
      'Uma entrevista guiada por IA pergunta sobre a sua rotina e propõe a semana pronta. Você revisa tudo antes de aceitar.',
  },
  {
    icone: '♡',
    titulo: 'Feito para quem se distrai',
    texto:
      'Poucos cliques, linguagem acolhedora e nada de culpa. O plano se ajusta ao seu ritmo — nunca o contrário.',
  },
  {
    icone: '◈',
    titulo: 'Privado por padrão',
    texto:
      'Suas respostas e documentos somem quando você sai. O que fica é só o seu plano — e ele é só seu.',
  },
]

const PASSOS = [
  {
    numero: '1',
    titulo: 'Conte sua rotina',
    texto:
      'Cinco perguntas acolhedoras sobre seus horários, suas prioridades e sua energia. Leva poucos minutos.',
  },
  {
    numero: '2',
    titulo: 'Revise a proposta',
    texto:
      'A IA monta um rascunho de semana equilibrada. Você ajusta o que quiser — nada é promovido sem o seu aceite.',
  },
  {
    numero: '3',
    titulo: 'Viva o dia',
    texto:
      'Hoje e Amanhã mostram o foco do momento; a Semana dá a visão inteira quando você precisar.',
  },
]

// Página pública de entrada: landing do produto — proposta de valor,
// benefícios e os caminhos de entrada (criar conta / entrar). Sem
// navegação privada nem dados de sessão.
export default function Home() {
  return (
    <div className={styles.pagina}>
      <header className={styles.topo}>
        <Link className={styles.marca} href="/" aria-label="Ritmo — página inicial">
          <span className={styles.marcaSimbolo} aria-hidden="true">
            r
          </span>
          <span className={styles.marcaTexto}>
            <strong>Ritmo</strong>
            <small>planejador pessoal</small>
          </span>
        </Link>
        <nav className={styles.topoNav} aria-label="Acesso">
          <Link className={styles.linkEntrar} href="/login">
            Entrar
          </Link>
          <Link className={`${ui.botao} ${ui.botaoPrimario}`} href="/cadastro">
            Criar conta
          </Link>
        </nav>
      </header>

      <main>
        <section className={styles.heroi} aria-labelledby="titulo-principal">
          <p className={styles.sobretitulo}>Planejador pessoal de baixa carga cognitiva</p>
          <h1 id="titulo-principal" className={styles.titulo}>
            Sua semana,
            <br />
            no <em>seu ritmo</em>.
          </h1>
          <p className={styles.lead}>
            O Ritmo transforma uma conversa simples sobre a sua rotina em um plano de semana
            realista — com horários, pausas e espaço para o que importa. Menos tela para decidir,
            mais vida para viver.
          </p>
          <div className={styles.acoes}>
            <Link
              className={`${ui.botao} ${ui.botaoPrimario} ${styles.acaoPrincipal}`}
              href="/cadastro"
            >
              Começar minha rotina
            </Link>
            <Link className={`${ui.botao} ${ui.botaoSecundario}`} href="/login">
              Já tenho conta
            </Link>
          </div>
          <p className={styles.prova}>Grátis para começar · seus dados são só seus</p>
        </section>

        <section className={styles.secao} aria-labelledby="beneficios">
          <h2 id="beneficios" className={styles.secaoTitulo}>
            Pensado para dias reais
          </h2>
          <ul className={styles.grade}>
            {BENEFICIOS.map((b) => (
              <li key={b.titulo} className={styles.cartao}>
                <span className={styles.cartaoIcone} aria-hidden="true">
                  {b.icone}
                </span>
                <h3 className={styles.cartaoTitulo}>{b.titulo}</h3>
                <p className={styles.cartaoTexto}>{b.texto}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.secao} aria-labelledby="como-funciona">
          <h2 id="como-funciona" className={styles.secaoTitulo}>
            Como funciona
          </h2>
          <ol className={styles.passos}>
            {PASSOS.map((p) => (
              <li key={p.numero} className={styles.passo}>
                <span className={styles.passoNumero} aria-hidden="true">
                  {p.numero}
                </span>
                <div>
                  <h3 className={styles.cartaoTitulo}>{p.titulo}</h3>
                  <p className={styles.cartaoTexto}>{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.chamadaFinal} aria-labelledby="chamada-final">
          <h2 id="chamada-final" className={styles.chamadaTitulo}>
            Organizar a semana não precisa pesar.
          </h2>
          <p className={styles.lead}>
            Crie sua conta, responda a cinco perguntas e receba uma proposta de rotina feita para o
            seu ritmo.
          </p>
          <Link
            className={`${ui.botao} ${ui.botaoPrimario} ${styles.acaoPrincipal}`}
            href="/cadastro"
          >
            Criar minha conta
          </Link>
        </section>
      </main>

      <footer className={styles.rodape}>
        <span>Ritmo — apoio à rotina, um dia de cada vez.</span>
        <Link className={styles.linkEntrar} href="/login">
          Entrar na sua conta
        </Link>
      </footer>
    </div>
  )
}
