import Link from 'next/link'
import ui from './ui.module.css'

// Ponto de entrada persistente da entrevista no painel: aparece apenas
// onde ainda não existe semana ativa. Não grava nada — adiar é simplesmente
// não clicar, e o convite continua aqui até a primeira semana confirmada.
export function ConviteEntrevista() {
  return (
    <section className={ui.convite} aria-label="Entrevista inicial">
      <h2>Prefere começar com ajuda?</h2>
      <p>
        Uma entrevista de cinco etapas monta uma primeira proposta da sua semana com você. É
        opcional — e a configuração manual continua sempre disponível.
      </p>
      <Link className={`${ui.botao} ${ui.botaoPrimario}`} href="/entrevista">
        Começar entrevista
      </Link>
    </section>
  )
}
