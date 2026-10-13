import Link from 'next/link'
import { redirect } from 'next/navigation'
import ui from '@/app/_components/ui.module.css'
import { Aviso, CabecalhoPagina } from '@/app/_components/ui'
import { identidadeAutenticada, storeDoUsuario } from '@/server/auth/contexto'
import { sessaoDaEntrevista } from '@/server/entrevista/sessao'
import { obterDocumento } from '@/server/entrevista/documento'
import styles from '../entrevista.module.css'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ erro?: string; selecionado?: string }> }

const ERROS: Record<string, string> = {
  formato: 'Formato não aceito — envie um PDF, DOCX ou TXT. Imagens não são suportadas.',
  tamanho: 'O arquivo passa de 2 MB. Escolha um documento menor ou siga sem ele.',
  quantidade: 'Só é possível anexar um documento por entrevista.',
  consentimento: 'Para anexar, marque o consentimento específico do documento.',
  entrada: 'Nenhum arquivo foi recebido. Escolha um documento e tente de novo.',
  extracao:
    'Não conseguimos ler o texto deste arquivo. Você pode tentar outro ou seguir sem documento.',
}

function tamanhoParaTexto(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

// Documento opcional da entrevista: depois das cinco etapas, a pessoa
// segue sem anexo ou envia um único PDF/DOCX/TXT de até 2 MB — somente
// após consentimento específico. O arquivo vive na sessão efêmera e é
// descartado ao sair ou concluir.
export default async function DocumentoPage({ searchParams }: Props) {
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

  return (
    <main className={styles.container}>
      <CabecalhoPagina
        eyebrow="Passo opcional"
        titulo="Documento de apoio"
        subtitulo="Se quiser, anexe uma referência para a proposta — ou siga direto, funciona igual."
      />

      {params.erro && ERROS[params.erro] && <Aviso tipo="erro">{ERROS[params.erro]}</Aviso>}

      {documento ? (
        <section className={styles.cartao} aria-label="Documento selecionado">
          <h2 className={styles.etapaTitulo}>Documento selecionado</h2>
          <p>
            <strong>{documento.nome}</strong> — {documento.formato.toUpperCase()},{' '}
            {tamanhoParaTexto(documento.tamanho)}
          </p>
          <p className={styles.nota}>
            Será usado somente nesta entrevista e descartado ao concluir ou sair — não fica
            armazenado no produto.
          </p>
          <div className={styles.acoes}>
            <Link className={`${ui.botao} ${ui.botaoPrimario}`} href="/entrevista/revisao">
              Continuar para a revisão
            </Link>
            <form action="/api/entrevista/documento" method="post">
              <input type="hidden" name="acao" value="remover" />
              <button className={`${ui.botao} ${ui.botaoSecundario}`} type="submit">
                Remover ou trocar
              </button>
            </form>
          </div>
        </section>
      ) : (
        <section className={styles.cartao} aria-label="Anexar documento">
          <ul>
            <li>Um único documento por entrevista: PDF, DOCX ou TXT, de até 2 MB.</li>
            <li>Imagens não são aceitas.</li>
            <li>
              O documento só serve para compor esta entrevista — não fica armazenado no produto e é
              descartado ao concluir ou sair.
            </li>
            <li>
              Antes de ser usado, seu conteúdo vai ao Gemini no nível gratuito — onde os dados
              enviados podem ser usados pelo provedor para melhorar o serviço.
            </li>
          </ul>
          <form
            action="/api/entrevista/documento"
            method="post"
            encType="multipart/form-data"
            className={styles.formulario}
          >
            <label className={styles.textoLivre} htmlFor="arquivo">
              Arquivo (PDF, DOCX ou TXT, até 2 MB)
              <input id="arquivo" name="arquivo" type="file" accept=".pdf,.docx,.txt" required />
            </label>
            <label className={styles.opcao}>
              <input type="checkbox" name="consentimentoDocumento" value="aceito" required />
              Entendo e aceito que o conteúdo do documento seja enviado ao Gemini somente para esta
              entrevista.
            </label>
            <div className={styles.acoes}>
              <button className={`${ui.botao} ${ui.botaoPrimario}`} type="submit">
                Anexar documento
              </button>
              <Link className={`${ui.botao} ${ui.botaoSecundario}`} href="/entrevista/revisao">
                Seguir sem documento
              </Link>
            </div>
          </form>
        </section>
      )}
    </main>
  )
}
