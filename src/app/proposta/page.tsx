import Link from 'next/link'
import styles from '../configurar/configurar.module.css'
import { getStateStore } from '@/server/persistence'
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

function ItemSugestao({ sugestao, editavel }: { sugestao: Sugestao; editavel: boolean }) {
  return (
    <li className={styles.item}>
      <span className={styles.itemTexto}>
        {horario(sugestao)} · {sugestao.titulo} · {ROTULOS_CATEGORIA[sugestao.categoria]} ·{' '}
        {sugestao.protecao === 'fixo' ? 'Fixo' : 'Flexível'}
        {sugestao.aceita ? ' · aceita' : ''}
      </span>
      <p className={styles.dica}>{sugestao.explicacao}</p>
      {editavel && <AcaoSugestao sugestao={sugestao} />}
    </li>
  )
}

function DiaProposta({ dia, editavel }: { dia: DiaProposta; editavel: boolean }) {
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
            <ItemSugestao key={s.id} sugestao={s} editavel={editavel} />
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
  const carregado = await (await getStateStore()).load()

  const erroCarga = !carregado.ok
  const rascunho = carregado.ok ? carregado.value.dados.propostaSemanal : null
  const vigente = carregado.ok ? carregado.value.dados.semanaAtiva : null
  const mensagemErro = params.erro ? MENSAGENS_ERRO[params.erro] : undefined

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Proposta da semana</h1>

      {params.gerada === '1' && (
        <p role="status" className={styles.feedback}>
          Proposta gerada como rascunho — nada muda na semana vigente até você confirmar.
        </p>
      )}
      {params.confirmada === '1' && (
        <p role="status" className={styles.feedback}>
          Proposta confirmada.
        </p>
      )}
      {params.salvo === '1' && (
        <p role="status" className={styles.feedback}>
          Sugestão atualizada.
        </p>
      )}
      {(mensagemErro || erroCarga) && (
        <p role="alert" className={styles.erro}>
          {mensagemErro ?? 'Não foi possível carregar sua proposta agora. Tente recarregar.'}
        </p>
      )}

      {!rascunho && !vigente && !erroCarga && (
        <>
          <p className={styles.intro}>
            A proposta organiza sua semana a partir da configuração: primeiro compromissos fixos,
            cuidado familiar, sono e indisponibilidades; depois preparação, deslocamentos, refeições
            e margens; por fim trabalho e objetivos flexíveis conforme a capacidade. Ela fica em
            rascunho até você confirmar.
          </p>
          <FormGerar texto="Gerar proposta semanal" />
        </>
      )}

      {rascunho && (
        <>
          <p className={styles.dica}>
            Rascunho gerado em {dataHoraParaTexto(rascunho.geradaEm)}. Aceite, edite ou remova cada
            sugestão — a semana vigente só muda depois da confirmação.
          </p>
          {rascunho.dias.map((dia) => (
            <DiaProposta key={dia.diaSemana} dia={dia} editavel />
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
          <p role="status" className={styles.feedback}>
            Proposta confirmada em {dataHoraParaTexto(vigente.confirmadaEm!)}.
          </p>
          {vigente.dias.map((dia) => (
            <DiaProposta key={dia.diaSemana} dia={dia} editavel={false} />
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
