import Link from 'next/link'
import { redirect } from 'next/navigation'
import ui from '@/app/_components/ui.module.css'
import { Aviso, CabecalhoPagina } from '@/app/_components/ui'
import { identidadeAutenticada, storeDoUsuario } from '@/server/auth/contexto'
import { sessaoDaEntrevista } from '@/server/entrevista/sessao'
import { obterDocumento } from '@/server/entrevista/documento'
import { obterRotinaInterpretada } from '@/server/entrevista/material'
import { ROTULOS_CATEGORIA, ROTULOS_DIA, type RotinaRecorrente } from '@/server/rotina/modelo'
import { horarioParaTexto } from '@/server/tempo'
import type { PropostaSemanal } from '@/server/proposta/modelo'
import styles from '../entrevista.module.css'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ gerada?: string; erro?: string }> }

const ERROS: Record<string, string> = {
  indisponivel: 'A IA não está disponível agora. Você pode tentar de novo ou montar manualmente.',
  invalida: 'A resposta da IA não veio em formato utilizável. Tente de novo.',
  vazia: 'A IA não conseguiu interpretar suas respostas. Tente de novo ou monte manualmente.',
  entrada: 'Algo nos dados não foi aceito. Revise a proposta e tente confirmar de novo.',
}

const ROTULOS_CARGA = { leve: 'leve', equilibrada: 'equilibrada', intensa: 'intensa' } as const

function ResumoRotina({
  rotina,
  documento,
}: {
  rotina: RotinaRecorrente
  documento: string | null
}) {
  const itens: string[] = []
  if (rotina.sono?.acordar || rotina.sono?.dormir) {
    itens.push(
      `Sono: acordar ${rotina.sono.acordar ?? 'a confirmar'}, dormir ${rotina.sono.dormir ?? 'a confirmar'}`
    )
  }
  if (rotina.trabalho) {
    itens.push(
      `Trabalho: ${rotina.trabalho.diasSemana.map((d) => ROTULOS_DIA[d]).join(', ')} — ${rotina.trabalho.horasPadrao}h por dia`
    )
  }
  if (rotina.compromissos?.length) {
    itens.push(`${rotina.compromissos.length} compromisso(s) com hora marcada`)
  }
  if (rotina.periodos?.length) {
    itens.push(`${rotina.periodos.length} período(s) reservado(s)`)
  }
  if (rotina.preferenciaCarga) {
    itens.push(`Carga preferida: ${ROTULOS_CARGA[rotina.preferenciaCarga]}`)
  }
  if (documento) itens.push(`Documento usado nesta entrevista: ${documento}`)

  return (
    <section className={styles.cartao} aria-label="Resumo da rotina compreendida">
      <h2 className={styles.etapaTitulo}>O que a entrevista entendeu</h2>
      {itens.length === 0 ? (
        <p className={styles.nota}>Poucos dados por enquanto — a proposta fica enxuta.</p>
      ) : (
        <ul>
          {itens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

function BlocosProposta({ proposta }: { proposta: PropostaSemanal }) {
  return (
    <section className={styles.cartao} aria-label="Proposta em blocos">
      <h2 className={styles.etapaTitulo}>Sua semana proposta</h2>
      <div className={styles.blocos}>
        {proposta.dias.map((dia) => (
          <div key={dia.diaSemana} className={styles.blocoDia}>
            <h3>{ROTULOS_DIA[dia.diaSemana]}</h3>
            {dia.sugestoes.length === 0 ? (
              <p className={styles.nota}>Sem itens sugeridos.</p>
            ) : (
              <ul>
                {dia.sugestoes.map((s) => (
                  <li key={s.id}>
                    <strong>{s.titulo}</strong>{' '}
                    <span className={styles.nota}>
                      {s.inicio && s.fim ? horarioParaTexto(s.inicio, s.fim) : 'a confirmar'} ·{' '}
                      {ROTULOS_CATEGORIA[s.categoria]} ·{' '}
                      {s.protecao === 'fixo' ? 'protegido' : 'flexível'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// Sugestões práticas não clínicas, derivadas do que a entrevista
// interpretou — genéricas só quando a rotina ainda é enxuta.
function sugestoesPraticas(rotina: RotinaRecorrente): string[] {
  const sugestoes: string[] = []
  const fixos = rotina.compromissos?.filter((c) => c.tipo === 'fixo').length ?? 0
  if (fixos > 0) {
    sugestoes.push(
      `Seus ${fixos} compromisso(s) com hora marcada entram como blocos protegidos — confira se batem com a semana real.`
    )
  }
  if (rotina.preferenciaCarga) {
    const rotulo = ROTULOS_CARGA[rotina.preferenciaCarga]
    sugestoes.push(
      `A carga preferida ficou "${rotulo}" — os blocos flexíveis foram distribuídos com ela em mente.`
    )
  }
  if (rotina.sono?.acordar && rotina.sono?.dormir) {
    sugestoes.push(
      `Sono e refeições viram margens do dia — se os horários não fecharem, ajuste antes de confirmar.`
    )
  }
  sugestoes.push(
    'Comece aceitando só o que faz sentido — você ajusta ou remove cada bloco antes de confirmar.',
    'Blocos protegidos são seus compromissos fixos; os flexíveis podem ser adaptados sem confirmação extra.',
    'Depois de confirmar, a semana continua editável manualmente, no seu ritmo.'
  )
  return sugestoes
}

// Revisão da proposta gerada: resumo compreendido, blocos do rascunho,
// sugestões práticas não clínicas e as saídas — editar nos fluxos
// existentes, refazer a entrevista ou confirmar (o que promove o
// rascunho a SemanaAtiva e descarta todo material transitório).
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
  const { rotina: rotinaManual, propostaSemanal } = carregado.value.dados
  // O resumo mostra o que a entrevista interpretou — ela ainda é
  // material transitório e não tocou a rotina manual do EstadoPrivado.
  const rotina = (identidade ? obterRotinaInterpretada(identidade.usuarioId) : null) ?? rotinaManual
  const gerada = Boolean(propostaSemanal)

  return (
    <main className={styles.container}>
      <CabecalhoPagina
        eyebrow="Entrevista concluída"
        titulo="Revisão da proposta"
        subtitulo={
          gerada
            ? 'Um ponto de partida, não uma decisão — nada entra no calendário sem a sua confirmação.'
            : 'Suas respostas estão registradas nesta sessão — a proposta é montada a seguir.'
        }
      />

      {params.erro && ERROS[params.erro] && <Aviso tipo="erro">{ERROS[params.erro]}</Aviso>}

      {gerada ? (
        <>
          <ResumoRotina rotina={rotina} documento={documento?.nome ?? null} />
          <BlocosProposta proposta={propostaSemanal!} />

          <section className={styles.cartao} aria-label="Sugestões práticas">
            <h2 className={styles.etapaTitulo}>Antes de confirmar</h2>
            <ul>
              {sugestoesPraticas(rotina).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <div className={styles.acoes}>
              <form action="/api/entrevista/confirmar" method="post">
                <button className={`${ui.botao} ${ui.botaoPrimario}`} type="submit">
                  Confirmar proposta
                </button>
              </form>
              <Link className={`${ui.botao} ${ui.botaoSecundario}`} href="/proposta">
                Editar na proposta
              </Link>
              <Link className={`${ui.botao} ${ui.botaoSecundario}`} href="/entrevista/etapas">
                Refazer a entrevista
              </Link>
            </div>
          </section>
        </>
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
