import Link from 'next/link'
import { redirect } from 'next/navigation'
import ui from '@/app/_components/ui.module.css'
import { Aviso, CabecalhoPagina } from '@/app/_components/ui'
import { identidadeAutenticada, storeDoUsuario } from '@/server/auth/contexto'
import { sessaoDaEntrevista } from '@/server/entrevista/sessao'
import { obterDocumento } from '@/server/entrevista/documento'
import styles from '../entrevista.module.css'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ gerada?: string; erro?: string }> }

const ERROS: Record<string, string> = {
  indisponivel: 'A IA não está disponível agora. Você pode tentar de novo ou montar manualmente.',
  invalida: 'A resposta da IA não veio em formato utilizável. Tente de novo.',
  vazia: 'A IA não conseguiu interpretar suas respostas. Tente de novo ou monte manualmente.',
}

// Revisão da proposta gerada: dispara a geração via Gemini com o
// material consentido e, em caso de falha, oferece nova tentativa e o
// caminho manual — nunca bloqueia o produto.
export default async function RevisaoPage({ searchParams }: Props) {
  const params = await searchParams
  const store = await storeDoUsuario()
  if (!store) redirect('/login')
  const carregado = await store.load()
  if (!carregado.ok) redirect('/hoje?erro=indisponivel')
  if (carregado.value.dados.semanaAtiva) redirect('/semana')

  const sessao = await sessaoDaEntrevista()
  if (!sessao) redirect('/entrevista/consentimento')
  if (!sessao.respostas) redirect('/entrevista/etapas')

  const identidade = await identidadeAutenticada()
  const documento = identidade ? obterDocumento(identidade.usuarioId) : null
  const gerada = params.gerada === '1' && Boolean(carregado.value.dados.propostaSemanal)

  return (
    <main className={styles.container}>
      <CabecalhoPagina
        eyebrow="Entrevista concluída"
        titulo="Revisão da proposta"
        subtitulo={
          gerada
            ? 'Sua proposta foi montada — revise antes de confirmar.'
            : 'Suas respostas estão registradas nesta sessão — a proposta é montada a seguir.'
        }
      />

      {params.erro && ERROS[params.erro] && <Aviso tipo="erro">{ERROS[params.erro]}</Aviso>}

      {gerada ? (
        <section className={styles.cartao}>
          <p>
            A proposta foi gerada a partir do que você contou
            {documento ? `, incluindo o documento “${documento.nome}”` : ''}. Revise cada bloco
            antes de confirmar — nada entra no calendário sem o seu aceite.
          </p>
          <div className={styles.acoes}>
            <Link className={`${ui.botao} ${ui.botaoPrimario}`} href="/proposta">
              Revisar proposta
            </Link>
            <Link className={`${ui.botao} ${ui.botaoSecundario}`} href="/entrevista/etapas">
              Refazer a entrevista
            </Link>
          </div>
        </section>
      ) : (
        <section className={styles.cartao}>
          <p>
            A próxima etapa gera uma proposta de semana a partir do que você contou
            {documento ? `, incluindo o documento “${documento.nome}”` : ''}. Você vai revisar cada
            bloco antes de confirmar — nada entra no calendário sem o seu aceite.
          </p>
          <div className={styles.acoes}>
            <form action="/api/entrevista/gerar" method="post">
              <button className={`${ui.botao} ${ui.botaoPrimario}`} type="submit">
                {params.erro ? 'Tentar gerar de novo' : 'Gerar proposta com IA'}
              </button>
            </form>
            <Link className={`${ui.botao} ${ui.botaoSecundario}`} href="/configurar">
              Montar manualmente
            </Link>
          </div>
          <p className={styles.nota}>
            Refazer a entrevista descarta as respostas atuais — elas não ficam salvas.
          </p>
        </section>
      )}
    </main>
  )
}
