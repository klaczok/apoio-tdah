import Link from 'next/link'
import styles from '../configurar/configurar.module.css'
import prop from './proposta.module.css'
import { Aviso, CabecalhoPagina, EstadoVazio } from '@/app/_components/ui'
import { redirect } from 'next/navigation'
import { storeDoUsuario } from '@/server/auth/contexto'
import { MENSAGENS_ERRO } from '@/server/persistence/mensagens'
import { dataHoraParaTexto } from '@/server/tempo'
import { ROTULOS_CATEGORIA, ROTULOS_DIA } from '@/server/rotina/modelo'
import type { DiaProposta, PropostaSemanal, Sugestao } from '@/server/proposta/modelo'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ gerada?: string; confirmada?: string; salvo?: string; erro?: string }>
}

function horario(s: Sugestao): string {
  return s.inicio && s.fim ? `${s.inicio}–${s.fim}` : 'a confirmar'
}

function ConfirmacaoProtegido({ id }: { id: string }) {
  return (
    <label className={styles.opcao} htmlFor={`confirmar-${id}`}>
      <input id={`confirmar-${id}`} type="checkbox" name="confirmar" />
      Confirmo a alteração deste item protegido
    </label>
  )
}

function AcaoSugestao({ sugestao }: { sugestao: Sugestao }) {
  const id = sugestao.id
  const protegido = sugestao.protecao === 'fixo'
  return (
    <div className={styles.acoesItem}>
      {!sugestao.aceita && (
        <form action="/api/proposta" method="post">
          <input type="hidden" name="acao" value="aceitar" />
          <input type="hidden" name="id" value={id} />
          <button className={styles.secundaria} type="submit">
            Aceitar
          </button>
        </form>
      )}
      <details className={styles.edicao}>
        <summary className={styles.secundaria}>Editar</summary>
        <form className={styles.form} action="/api/proposta" method="post">
          <input type="hidden" name="acao" value="editar" />
          <input type="hidden" name="id" value={id} />
          <label className={styles.label} htmlFor={`titulo-${id}`}>
            Título
          </label>
          <input
            className={styles.input}
            id={`titulo-${id}`}
            name="titulo"
            type="text"
            defaultValue={sugestao.titulo}
            required
          />
          <label className={styles.label} htmlFor={`inicio-${id}`}>
            Início
          </label>
          <input
            className={styles.input}
            id={`inicio-${id}`}
            name="inicio"
            type="time"
            defaultValue={sugestao.inicio ?? ''}
          />
          <label className={styles.label} htmlFor={`fim-${id}`}>
            Fim
          </label>
          <input
            className={styles.input}
            id={`fim-${id}`}
            name="fim"
            type="time"
            defaultValue={sugestao.fim ?? ''}
          />
          {protegido && <ConfirmacaoProtegido id={id} />}
          <button className={styles.acao} type="submit">
            Salvar alteração
          </button>
        </form>
      </details>
      <form action="/api/proposta" method="post">
        <input type="hidden" name="acao" value="remover" />
        <input type="hidden" name="id" value={id} />
        {protegido && <ConfirmacaoProtegido id={`rem-${id}`} />}
        <button className={styles.remover} type="submit">
          Remover
        </button>
      </form>
    </div>
  )
}

// Comparação factual entre a semana vigente e o rascunho: mesma
// sugestão com horário ou título diferente mostra "antes → proposta";
// id novo aparece como novo, sem inferir mais nada.
function comparacaoSugestao(sugestao: Sugestao, vigente: Map<string, Sugestao> | null) {
  if (!vigente) return null
  const anterior = vigente.get(sugestao.id)
  if (!anterior) return 'Novo nesta proposta.'
  if (anterior.titulo !== sugestao.titulo || horario(anterior) !== horario(sugestao)) {
    return `Antes: ${anterior.titulo}, ${horario(anterior)} → proposta: ${sugestao.titulo}, ${horario(sugestao)}`
  }
  return null
}

function ItemSugestao({
  sugestao,
  editavel,
  vigente,
}: {
  sugestao: Sugestao
  editavel: boolean
  vigente: Map<string, Sugestao> | null
}) {
  const comparacao = comparacaoSugestao(sugestao, vigente)
  const protegido = sugestao.protecao === 'fixo'
  return (
    <li className={`${prop.sugestao} ${protegido ? prop.sugestaoProtegida : ''}`}>
      <span className={prop.sugestaoCabeca}>
        <span className={prop.sugestaoTitulo}>{sugestao.titulo}</span>
        <span className={prop.sugestaoMeta}>
          {horario(sugestao)} · {ROTULOS_CATEGORIA[sugestao.categoria]}
        </span>
        <span className={`${prop.tag} ${sugestao.aceita ? prop.tagAceita : prop.tagPendente}`}>
          {sugestao.aceita ? 'Aceita' : 'Pendente'}
        </span>
        <span className={`${prop.tag} ${protegido ? prop.tagProtegido : ''}`}>
          {protegido ? '◈ Protegido' : '◇ Flexível'}
        </span>
      </span>
      <p className={prop.justificativa}>{sugestao.explicacao}</p>
      {comparacao && <p className={prop.comparacao}>{comparacao}</p>}
      {editavel && <AcaoSugestao sugestao={sugestao} />}
    </li>
  )
}

function DiaProposta({
  dia,
  editavel,
  vigente,
}: {
  dia: DiaProposta
  editavel: boolean
  vigente: Map<string, Sugestao> | null
}) {
  return (
    <section className={styles.form} aria-label={ROTULOS_DIA[dia.diaSemana]}>
      <h2 className={styles.subtitulo}>{ROTULOS_DIA[dia.diaSemana]}</h2>
      <p className={styles.dica}>
        {dia.acordar ? `acordar ${dia.acordar}` : 'acordar a confirmar'} ·{' '}
        {dia.dormir ? `dormir ${dia.dormir}` : 'dormir a confirmar'}
      </p>
      {dia.sugestoes.length === 0 ? (
        <p className={styles.dica}>Sem itens sugeridos.</p>
      ) : (
        <ul className={styles.lista}>
          {dia.sugestoes.map((s) => (
            <ItemSugestao key={s.id} sugestao={s} editavel={editavel} vigente={vigente} />
          ))}
        </ul>
      )}
    </section>
  )
}

function FormGerar({ texto }: { texto: string }) {
  return (
    <form action="/api/proposta" method="post">
      <input type="hidden" name="acao" value="gerar" />
      <button className={styles.acao} type="submit">
        {texto}
      </button>
    </form>
  )
}

export default async function PropostaPage({ searchParams }: Props) {
  const params = await searchParams
  const store = await storeDoUsuario()
  if (!store) redirect('/login')
  const carregado = await store.load()

  const erroCarga = !carregado.ok
  const rascunho = carregado.ok ? carregado.value.dados.propostaSemanal : null
  const vigente = carregado.ok ? carregado.value.dados.semanaAtiva : null
  const mensagemErro = params.erro ? MENSAGENS_ERRO[params.erro] : undefined

  // Mapa da semana ativa por id: base da comparação antes → proposta.
  const vigenteMap = vigente
    ? new Map(vigente.dias.flatMap((d) => d.sugestoes.map((sug) => [sug.id, sug])))
    : null

  const estado = rascunho
    ? { rotulo: 'Rascunho em edição', classe: prop.estadoRascunho }
    : vigente
      ? { rotulo: 'Semana ativa', classe: prop.estadoVigente }
      : null

  return (
    <main className={styles.container}>
      <CabecalhoPagina
        eyebrow="Planejamento assistido"
        titulo="Proposta da semana"
        subtitulo={
          rascunho
            ? 'Revise cada sugestão — a semana vigente só muda depois da confirmação.'
            : vigente
              ? 'A semana confirmada que orienta seus dias.'
              : 'A proposta organiza sua semana a partir da configuração.'
        }
        acoes={estado && <span className={estado.classe}>{estado.rotulo}</span>}
      />

      {params.gerada === '1' && (
        <Aviso tipo="sucesso">
          Proposta gerada como rascunho — nada muda na semana vigente até você confirmar.
        </Aviso>
      )}
      {params.confirmada === '1' && <Aviso tipo="sucesso">Proposta confirmada.</Aviso>}
      {params.salvo === '1' && <Aviso tipo="sucesso">Sugestão atualizada.</Aviso>}
      {(mensagemErro || erroCarga) && (
        <Aviso tipo="erro">
          {mensagemErro ?? 'Não foi possível carregar sua proposta agora. Tente recarregar.'}
        </Aviso>
      )}

      {!rascunho && !vigente && !erroCarga && (
        <EstadoVazio titulo="Nenhuma proposta ainda">
          <p>
            A proposta organiza sua semana a partir da configuração: primeiro compromissos fixos,
            cuidado familiar, sono e indisponibilidades; depois preparação, deslocamentos, refeições
            e margens; por fim trabalho e objetivos flexíveis conforme a capacidade. Ela fica em
            rascunho até você confirmar.
          </p>
          <FormGerar texto="Gerar proposta semanal" />
        </EstadoVazio>
      )}

      {rascunho && (
        <>
          <p className={styles.dica}>
            Rascunho gerado em {dataHoraParaTexto(rascunho.geradaEm)}. Aceite, edite ou remova cada
            sugestão — a semana vigente só muda depois da confirmação.
          </p>
          {rascunho.dias.map((dia) => (
            <DiaProposta key={dia.diaSemana} dia={dia} editavel vigente={vigenteMap} />
          ))}
          <form action="/api/proposta" method="post">
            <input type="hidden" name="acao" value="confirmar" />
            <button className={styles.acao} type="submit">
              Confirmar proposta semanal
            </button>
          </form>
          <FormGerar texto="Gerar novamente" />
        </>
      )}

      {!rascunho && vigente && (
        <>
          <Aviso tipo="info">
            Proposta confirmada em {dataHoraParaTexto(vigente.confirmadaEm!)}.
          </Aviso>
          {vigente.dias.map((dia) => (
            <DiaProposta key={dia.diaSemana} dia={dia} editavel={false} vigente={vigenteMap} />
          ))}
          <FormGerar texto="Gerar nova proposta" />
        </>
      )}

      <Link className={styles.voltar} href="/hoje">
        Voltar para hoje
      </Link>
    </main>
  )
}
