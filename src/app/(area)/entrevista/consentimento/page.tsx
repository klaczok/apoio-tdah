import Link from 'next/link'
import { redirect } from 'next/navigation'
import ui from '@/app/_components/ui.module.css'
import { CabecalhoPagina } from '@/app/_components/ui'
import { storeDoUsuario } from '@/server/auth/contexto'
import styles from '../entrevista.module.css'

export const dynamic = 'force-dynamic'

// Consentimento geral informado, exigido antes de qualquer dado sair
// para o provedor de IA. Recusar não bloqueia nada: a configuração
// manual segue aberta.
export default async function ConsentimentoPage() {
  const store = await storeDoUsuario()
  if (!store) redirect('/login')
  const carregado = await store.load()
  if (!carregado.ok) redirect('/hoje?erro=indisponivel')
  if (carregado.value.dados.semanaAtiva) redirect('/semana')

  return (
    <main className={styles.container}>
      <CabecalhoPagina
        eyebrow="Antes de começar"
        titulo="Seu consentimento"
        subtitulo="Leia com calma — a entrevista só envia dados à IA depois do seu aceite explícito."
      />

      <section className={styles.cartao} aria-label="Termos do consentimento">
        <ul>
          <li>
            A entrevista usa IA para <strong>apoiar a organização da sua rotina</strong>. Ela não
            oferece diagnóstico, tratamento nem orientação profissional de saúde.
          </li>
          <li>
            Suas respostas são enviadas ao <strong>Gemini Developer API, no nível gratuito</strong>.
            Nessa modalidade, os dados enviados <strong>podem ser usados pelo provedor</strong> para
            melhorar o serviço.
          </li>
          <li>
            Nada é enviado antes deste consentimento. Se você anexar um documento depois, um
            consentimento específico será pedido na hora.
          </li>
          <li>
            Respostas, documentos e sugestões da IA não ficam salvos: ao concluir ou sair, eles são
            descartados. Só a proposta que você confirmar permanece.
          </li>
          <li>Você pode recusar e montar a rotina manualmente — o produto funciona igual.</li>
        </ul>

        <form action="/api/entrevista/consentimento" method="post" className={styles.acoes}>
          <button
            className={`${ui.botao} ${ui.botaoPrimario}`}
            type="submit"
            name="decisao"
            value="aceito"
          >
            Aceito e quero continuar
          </button>
          <Link className={`${ui.botao} ${ui.botaoSecundario}`} href="/configurar">
            Prefiro seguir sem a entrevista
          </Link>
        </form>
        <p className={styles.nota}>
          Ao recusar, você volta para a configuração manual. O convite continua disponível enquanto
          não houver uma semana confirmada.
        </p>
      </section>
    </main>
  )
}
