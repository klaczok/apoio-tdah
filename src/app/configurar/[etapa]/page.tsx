import Link from 'next/link'
import { notFound } from 'next/navigation'
import styles from '../configurar.module.css'
import { ehEtapa, ETAPAS, ROTULOS_ETAPA, type Etapa } from '../etapas'
import {
  resumoBlocoEstudo,
  resumoBlocoMusica,
  resumoCompromisso,
  resumoPeriodo,
  rotulosDias,
} from '../resumo'
import { getStateStore } from '@/server/persistence'
import { MENSAGENS_ERRO } from '@/server/persistence/mensagens'
import { dataCivilParaTexto } from '@/server/tempo'
import {
  CATEGORIAS,
  DIAS_SEMANA,
  REFEICAO_REFS,
  REFEICOES_PADRAO,
  ROTULOS_CATEGORIA,
  ROTULOS_DIA,
  ROTULOS_TIPO_DIA,
  ROTULOS_TIPO_ESTUDO,
  ROTULOS_TIPO_MUSICA,
  somatorioEstudo,
  TIPOS_DIA_ALIMENTAR,
  TIPOS_ESTUDO,
  TIPOS_MUSICA,
  tipoDiaAlimentar,
  rotinaVazia,
  type AlimentacaoConfig,
  type BlocoEstudo,
  type BlocoMusica,
  type DiaSemana,
  type RotinaRecorrente,
  type TipoDiaAlimentar,
} from '@/server/rotina/modelo'
import {
  referenciaAlimentar,
  VERSAO_REFERENCIA_ATUAL,
  type PlanoTipoDia,
} from '@/server/rotina/referencia-alimentar'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ etapa: string }>
  searchParams: Promise<{ salvo?: string; erro?: string }>
}

const ROTULOS_TIPO_PERIODO = {
  'cuidado-familiar': 'Cuidado familiar',
  indisponibilidade: 'Indisponibilidade',
} as const

function SelecaoDias({
  marcados,
  titulo = 'Dias da semana',
}: {
  marcados: readonly string[]
  titulo?: string
}) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{titulo}</legend>
      {DIAS_SEMANA.map((dia) => (
        <label key={dia} className={styles.opcao} htmlFor={`dia-${dia}`}>
          <input
            id={`dia-${dia}`}
            type="checkbox"
            name="dias"
            value={dia}
            defaultChecked={marcados.includes(dia)}
          />
          {ROTULOS_DIA[dia]}
        </label>
      ))}
    </fieldset>
  )
}

function FormTrabalho({ rotina }: { rotina: RotinaRecorrente }) {
  const t = rotina.trabalho
  return (
    <form className={styles.form} action="/api/rotina/trabalho" method="post">
      <SelecaoDias marcados={t?.diasSemana ?? []} />
      <label className={styles.label} htmlFor="horasPadrao">
        Horas por dia
      </label>
      <input
        className={styles.input}
        id="horasPadrao"
        name="horasPadrao"
        type="number"
        min={1}
        max={10}
        defaultValue={t?.horasPadrao ?? 8}
        required
      />
      <label className={styles.label} htmlFor="limiteExcepcional">
        Limite excepcional (horas)
      </label>
      <input
        className={styles.input}
        id="limiteExcepcional"
        name="limiteExcepcional"
        type="number"
        min={1}
        max={10}
        defaultValue={t?.limiteExcepcional ?? 10}
        required
      />
      <button className={styles.acao} type="submit">
        Salvar e continuar
      </button>
    </form>
  )
}

function FormPresencial({ rotina }: { rotina: RotinaRecorrente }) {
  const p = rotina.presencial
  return (
    <form className={styles.form} action="/api/rotina/presencial" method="post">
      <p className={styles.dica}>Campos vazios ficam a confirmar.</p>
      <SelecaoDias marcados={p?.diasSemana ?? []} />
      <label className={styles.label} htmlFor="chegadaLimite">
        Horário limite de chegada
      </label>
      <input
        className={styles.input}
        id="chegadaLimite"
        name="chegadaLimite"
        type="time"
        defaultValue={p?.chegadaLimite ?? ''}
      />
      <label className={styles.label} htmlFor="preparacaoMin">
        Preparação (min)
      </label>
      <input
        className={styles.input}
        id="preparacaoMin"
        name="preparacaoMin"
        type="number"
        min={0}
        defaultValue={p?.preparacaoMin ?? ''}
      />
      <label className={styles.label} htmlFor="deslocamentoMin">
        Deslocamento (min)
      </label>
      <input
        className={styles.input}
        id="deslocamentoMin"
        name="deslocamentoMin"
        type="number"
        min={0}
        defaultValue={p?.deslocamentoMin ?? ''}
      />
      <button className={styles.acao} type="submit">
        Salvar e continuar
      </button>
    </form>
  )
}

function FormRemover({ etapa, id, protegido }: { etapa: Etapa; id: string; protegido: boolean }) {
  return (
    <form action={`/api/rotina/${etapa}`} method="post" className={styles.form}>
      <input type="hidden" name="acao" value="remover" />
      <input type="hidden" name="id" value={id} />
      {protegido && (
        <label className={styles.opcao} htmlFor={`confirmar-${id}`}>
          <input id={`confirmar-${id}`} type="checkbox" name="confirmar" />
          Confirmo a alteração deste item protegido
        </label>
      )}
      <button className={styles.remover} type="submit">
        Remover
      </button>
    </form>
  )
}

function FormCompromissos({ rotina }: { rotina: RotinaRecorrente }) {
  const lista = rotina.compromissos
  return (
    <>
      {lista === null && <p className={styles.dica}>A confirmar — adicione o primeiro.</p>}
      {lista && lista.length > 0 && (
        <ul className={styles.lista}>
          {lista.map((c) => (
            <li key={c.id} className={styles.item}>
              <span className={styles.itemTexto}>{resumoCompromisso(c)}</span>
              <FormRemover etapa="compromissos" id={c.id} protegido={c.tipo === 'fixo'} />
            </li>
          ))}
        </ul>
      )}
      {lista && lista.length === 0 && <p className={styles.dica}>Nenhum registrado.</p>}
      <form className={styles.form} action="/api/rotina/compromissos" method="post">
        <input type="hidden" name="acao" value="adicionar" />
        <p className={styles.dica}>
          Para corrigir um compromisso fixo, remova-o com confirmação e adicione novamente.
        </p>
        <label className={styles.label} htmlFor="titulo">
          Título
        </label>
        <input className={styles.input} id="titulo" name="titulo" type="text" required />
        <label className={styles.label} htmlFor="diaSemana">
          Dia da semana
        </label>
        <select className={styles.input} id="diaSemana" name="diaSemana" required>
          {DIAS_SEMANA.map((dia) => (
            <option key={dia} value={dia}>
              {ROTULOS_DIA[dia]}
            </option>
          ))}
        </select>
        <label className={styles.label} htmlFor="inicio">
          Horário de início
        </label>
        <input className={styles.input} id="inicio" name="inicio" type="time" required />
        <label className={styles.label} htmlFor="duracaoMin">
          Duração (min)
        </label>
        <input
          className={styles.input}
          id="duracaoMin"
          name="duracaoMin"
          type="number"
          min={5}
          step={5}
          required
        />
        <label className={styles.label} htmlFor="categoria">
          Categoria
        </label>
        <select className={styles.input} id="categoria" name="categoria" required>
          {CATEGORIAS.map((categoria) => (
            <option key={categoria} value={categoria}>
              {ROTULOS_CATEGORIA[categoria]}
            </option>
          ))}
        </select>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Tipo</legend>
          <label className={styles.opcao} htmlFor="tipo-fixo">
            <input id="tipo-fixo" type="radio" name="tipo" value="fixo" required />
            Compromisso fixo
          </label>
          <label className={styles.opcao} htmlFor="tipo-flexivel">
            <input id="tipo-flexivel" type="radio" name="tipo" value="flexivel" required />
            Bloco flexível
          </label>
        </fieldset>
        <button className={styles.acao} type="submit">
          Adicionar compromisso
        </button>
      </form>
    </>
  )
}

function FormPeriodos({ rotina }: { rotina: RotinaRecorrente }) {
  const lista = rotina.periodos
  return (
    <>
      {lista === null && <p className={styles.dica}>A confirmar — adicione o primeiro.</p>}
      {lista && lista.length > 0 && (
        <ul className={styles.lista}>
          {lista.map((p) => (
            <li key={p.id} className={styles.item}>
              <span className={styles.itemTexto}>{resumoPeriodo(p)}</span>
              <FormRemover etapa="periodos" id={p.id} protegido={p.tipo === 'cuidado-familiar'} />
            </li>
          ))}
        </ul>
      )}
      {lista && lista.length === 0 && <p className={styles.dica}>Nenhum registrado.</p>}
      <form className={styles.form} action="/api/rotina/periodos" method="post">
        <input type="hidden" name="acao" value="adicionar" />
        <label className={styles.label} htmlFor="tipo">
          Tipo de período
        </label>
        <select className={styles.input} id="tipo" name="tipo" required>
          {(['cuidado-familiar', 'indisponibilidade'] as const).map((tipo) => (
            <option key={tipo} value={tipo}>
              {ROTULOS_TIPO_PERIODO[tipo]}
            </option>
          ))}
        </select>
        <label className={styles.label} htmlFor="diaSemana">
          Dia da semana
        </label>
        <select className={styles.input} id="diaSemana" name="diaSemana" required>
          {DIAS_SEMANA.map((dia) => (
            <option key={dia} value={dia}>
              {ROTULOS_DIA[dia]}
            </option>
          ))}
        </select>
        <label className={styles.label} htmlFor="inicio">
          Início
        </label>
        <input className={styles.input} id="inicio" name="inicio" type="time" required />
        <label className={styles.label} htmlFor="fim">
          Fim
        </label>
        <input className={styles.input} id="fim" name="fim" type="time" required />
        <button className={styles.acao} type="submit">
          Adicionar período
        </button>
      </form>
    </>
  )
}

function FormSono({ rotina }: { rotina: RotinaRecorrente }) {
  const s = rotina.sono
  return (
    <form className={styles.form} action="/api/rotina/sono" method="post">
      <p className={styles.dica}>Campos vazios ficam a confirmar.</p>
      <label className={styles.label} htmlFor="dormir">
        Dormir
      </label>
      <input
        className={styles.input}
        id="dormir"
        name="dormir"
        type="time"
        defaultValue={s?.dormir ?? ''}
      />
      <label className={styles.label} htmlFor="acordar">
        Acordar
      </label>
      <input
        className={styles.input}
        id="acordar"
        name="acordar"
        type="time"
        defaultValue={s?.acordar ?? ''}
      />
      <button className={styles.acao} type="submit">
        Salvar e continuar
      </button>
    </form>
  )
}

function FormPreferencias({ rotina }: { rotina: RotinaRecorrente }) {
  return (
    <form className={styles.form} action="/api/rotina/preferencias" method="post">
      <p className={styles.dica}>O que ficar sem escolha permanece a confirmar.</p>
      <label className={styles.label} htmlFor="transicaoMin">
        Margem entre atividades (min)
      </label>
      <input
        className={styles.input}
        id="transicaoMin"
        name="transicaoMin"
        type="number"
        min={0}
        defaultValue={rotina.margens?.transicaoMin ?? ''}
      />
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Preferência de carga</legend>
        {(
          [
            ['leve', 'Leve'],
            ['equilibrada', 'Equilibrada'],
            ['intensa', 'Intensa'],
          ] as const
        ).map(([valor, rotulo]) => (
          <label key={valor} className={styles.opcao} htmlFor={`carga-${valor}`}>
            <input
              id={`carga-${valor}`}
              type="radio"
              name="preferenciaCarga"
              value={valor}
              defaultChecked={rotina.preferenciaCarga === valor}
            />
            {rotulo}
          </label>
        ))}
      </fieldset>
      <button className={styles.acao} type="submit">
        Concluir
      </button>
    </form>
  )
}

function diasDoTipoDia(alimentacao: AlimentacaoConfig | null, tipo: TipoDiaAlimentar): string {
  if (!alimentacao || alimentacao.diasTreino === null) return 'a confirmar'
  const dias = DIAS_SEMANA.filter((d) => tipoDiaAlimentar(alimentacao, d) === tipo)
  return dias.length ? rotulosDias(dias) : 'nenhum dia'
}

function PlanoPrescrito({
  tipo,
  plano,
  alimentacao,
}: {
  tipo: TipoDiaAlimentar
  plano: PlanoTipoDia
  alimentacao: AlimentacaoConfig | null
}) {
  return (
    <details className={styles.edicao}>
      <summary className={styles.label}>
        {ROTULOS_TIPO_DIA[tipo]} — {diasDoTipoDia(alimentacao, tipo)}
      </summary>
      {plano.refeicoes.map((refeicao) => (
        <div key={refeicao.ref} className={styles.refeicao}>
          <p className={styles.label}>{refeicao.titulo}</p>
          <ul className={styles.lista}>
            {refeicao.itens.map((item) => (
              <li key={item} className={styles.itemTexto}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {plano.notas.map((nota) => (
        <p key={nota} className={styles.dica}>
          {nota}
        </p>
      ))}
    </details>
  )
}

function FormAlimentacao({ rotina }: { rotina: RotinaRecorrente }) {
  const a = rotina.alimentacao
  const porRef = new Map((a?.refeicoes ?? []).map((r) => [r.ref, r]))
  const referencia = referenciaAlimentar(a?.referenciaVersao ?? VERSAO_REFERENCIA_ATUAL)
  return (
    <>
      <form className={styles.form} action="/api/rotina/alimentacao" method="post">
        <p className={styles.dica}>
          Os horários prescritos aparecem como ponto de partida e podem ser editados ou ocultados.
          Sem dias de treino marcados, a escolha do cardápio fica a confirmar.
        </p>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Lembretes de refeição</legend>
          {REFEICAO_REFS.map((ref) => {
            const padrao = REFEICOES_PADRAO[ref]
            const salvo = porRef.get(ref)
            return (
              <div key={ref} className={styles.refeicao}>
                <label className={styles.label} htmlFor={`horario-${ref}`}>
                  {padrao.titulo}
                </label>
                <input
                  className={styles.input}
                  id={`horario-${ref}`}
                  name={`horario-${ref}`}
                  type="time"
                  defaultValue={salvo?.horario ?? padrao.horario}
                />
                <label className={styles.opcao} htmlFor={`oculta-${ref}`}>
                  <input
                    id={`oculta-${ref}`}
                    type="checkbox"
                    name={`oculta-${ref}`}
                    defaultChecked={salvo?.oculta ?? false}
                  />
                  Ocultar {padrao.titulo}
                </label>
              </div>
            )
          })}
        </fieldset>
        <SelecaoDias marcados={a?.diasTreino ?? []} titulo="Dias com treino" />
        <label className={styles.opcao} htmlFor="semTreino">
          <input
            id="semTreino"
            type="checkbox"
            name="semTreino"
            defaultChecked={a?.diasTreino?.length === 0}
          />
          Sem dias de treino — todos os dias usam o cardápio sem treino
        </label>
        <button className={styles.acao} type="submit">
          Salvar e continuar
        </button>
      </form>
      {referencia && (
        <section className={styles.form} aria-label="Referência alimentar prescrita">
          <h2 className={styles.subtitulo}>Referência prescrita</h2>
          <p className={styles.dica}>
            Fonte: {referencia.fonte} · referência de{' '}
            {dataCivilParaTexto(referencia.dataReferencia)}
          </p>
          <p className={styles.dica}>
            Conteúdo transcrito da prescrição, sem cálculo de porções ou calorias.
          </p>
          {TIPOS_DIA_ALIMENTAR.map((tipo) => (
            <PlanoPrescrito
              key={tipo}
              tipo={tipo}
              plano={referencia.porTipoDia[tipo]}
              alimentacao={a}
            />
          ))}
        </section>
      )}
    </>
  )
}

function FormBloco<T extends string>({
  etapa,
  tipos,
  rotulos,
  sufixo,
  bloco,
  campoMinutos,
  comRealizado,
}: {
  etapa: 'estudo' | 'musica'
  tipos: readonly T[]
  rotulos: Record<T, string>
  sufixo: string
  bloco?: {
    id: string
    tipo: T
    diaSemana: DiaSemana
    inicio: string
    planejadoMin?: number
    duracaoMin?: number
    realizadoMin?: number | null
  }
  campoMinutos: 'planejadoMin' | 'duracaoMin'
  comRealizado: boolean
}) {
  const campo = (nome: string) => `${nome}-${sufixo}`
  return (
    <form className={styles.form} action={`/api/rotina/${etapa}`} method="post">
      <input type="hidden" name="acao" value={bloco ? 'atualizar' : 'adicionar'} />
      {bloco && <input type="hidden" name="id" value={bloco.id} />}
      <label className={styles.label} htmlFor={campo('tipo')}>
        Tipo
      </label>
      <select
        className={styles.input}
        id={campo('tipo')}
        name="tipo"
        defaultValue={bloco?.tipo}
        required
      >
        {tipos.map((tipo) => (
          <option key={tipo} value={tipo}>
            {rotulos[tipo]}
          </option>
        ))}
      </select>
      <label className={styles.label} htmlFor={campo('diaSemana')}>
        Dia da semana
      </label>
      <select
        className={styles.input}
        id={campo('diaSemana')}
        name="diaSemana"
        defaultValue={bloco?.diaSemana}
        required
      >
        {DIAS_SEMANA.map((dia) => (
          <option key={dia} value={dia}>
            {ROTULOS_DIA[dia]}
          </option>
        ))}
      </select>
      <label className={styles.label} htmlFor={campo('inicio')}>
        Horário de início
      </label>
      <input
        className={styles.input}
        id={campo('inicio')}
        name="inicio"
        type="time"
        defaultValue={bloco?.inicio ?? ''}
        required
      />
      <label className={styles.label} htmlFor={campo(campoMinutos)}>
        {comRealizado ? 'Tempo planejado (min)' : 'Duração (min)'}
      </label>
      <input
        className={styles.input}
        id={campo(campoMinutos)}
        name={campoMinutos}
        type="number"
        min={5}
        step={5}
        defaultValue={bloco?.[campoMinutos] ?? ''}
        required
      />
      {comRealizado && (
        <>
          <label className={styles.label} htmlFor={campo('realizadoMin')}>
            Tempo realizado (min)
          </label>
          <input
            className={styles.input}
            id={campo('realizadoMin')}
            name="realizadoMin"
            type="number"
            min={0}
            step={5}
            defaultValue={bloco?.realizadoMin ?? ''}
          />
        </>
      )}
      <button className={styles.acao} type="submit">
        {bloco ? 'Salvar alterações' : 'Adicionar bloco'}
      </button>
    </form>
  )
}

function FormEstudo({ rotina }: { rotina: RotinaRecorrente }) {
  const e = rotina.estudo
  const totais = somatorioEstudo(e)
  const comTempo = TIPOS_ESTUDO.filter(
    (tipo) => totais[tipo].planejadoMin > 0 || totais[tipo].realizadoMin > 0
  )
  return (
    <>
      <form className={styles.form} action="/api/rotina/estudo" method="post">
        <input type="hidden" name="acao" value="meta" />
        <p className={styles.dica}>
          Meta ajustável e de adoção gradual — a referência externa de 10h semanais não é imposta.
          Vazia fica a confirmar.
        </p>
        <label className={styles.label} htmlFor="metaHoras">
          Meta semanal de estudo (horas)
        </label>
        <input
          className={styles.input}
          id="metaHoras"
          name="metaHoras"
          type="number"
          min={0.5}
          step={0.5}
          defaultValue={e?.metaSemanalMin != null ? e.metaSemanalMin / 60 : ''}
        />
        <button className={styles.acao} type="submit">
          Salvar meta
        </button>
      </form>
      {e === null && <p className={styles.dica}>A confirmar — adicione o primeiro bloco.</p>}
      {e && e.blocos.length === 0 && <p className={styles.dica}>Nenhum registrado.</p>}
      {e && comTempo.length > 0 && (
        <ul className={styles.lista} aria-label="Tempo de estudo por tipo">
          {comTempo.map((tipo) => (
            <li key={tipo} className={styles.item}>
              <span className={styles.itemTexto}>
                {ROTULOS_TIPO_ESTUDO[tipo]}: {totais[tipo].planejadoMin} min planejados ·{' '}
                {totais[tipo].realizadoMin} min realizados
              </span>
            </li>
          ))}
        </ul>
      )}
      {e && e.blocos.length > 0 && (
        <ul className={styles.lista}>
          {e.blocos.map((b: BlocoEstudo) => (
            <li key={b.id} className={styles.item}>
              <span className={styles.itemTexto}>{resumoBlocoEstudo(b)}</span>
              <details className={styles.edicao}>
                <summary className={styles.label}>Editar</summary>
                <FormBloco
                  etapa="estudo"
                  tipos={TIPOS_ESTUDO}
                  rotulos={ROTULOS_TIPO_ESTUDO}
                  sufixo={b.id}
                  bloco={b}
                  campoMinutos="planejadoMin"
                  comRealizado
                />
              </details>
              <FormRemover etapa="estudo" id={b.id} protegido={false} />
            </li>
          ))}
        </ul>
      )}
      <h2 className={styles.subtitulo}>Adicionar bloco de estudo</h2>
      <p className={styles.dica}>Blocos de estudo são flexíveis — não viram obrigação semanal.</p>
      <FormBloco
        etapa="estudo"
        tipos={TIPOS_ESTUDO}
        rotulos={ROTULOS_TIPO_ESTUDO}
        sufixo="novo"
        campoMinutos="planejadoMin"
        comRealizado
      />
    </>
  )
}

function FormMusica({ rotina }: { rotina: RotinaRecorrente }) {
  const lista = rotina.musica
  return (
    <>
      <p className={styles.dica}>
        Blocos de música são objetivos flexíveis — não viram obrigação semanal.
      </p>
      {lista === null && <p className={styles.dica}>A confirmar — adicione o primeiro.</p>}
      {lista && lista.length === 0 && <p className={styles.dica}>Nenhum registrado.</p>}
      {lista && lista.length > 0 && (
        <ul className={styles.lista}>
          {lista.map((b: BlocoMusica) => (
            <li key={b.id} className={styles.item}>
              <span className={styles.itemTexto}>{resumoBlocoMusica(b)}</span>
              <details className={styles.edicao}>
                <summary className={styles.label}>Editar</summary>
                <FormBloco
                  etapa="musica"
                  tipos={TIPOS_MUSICA}
                  rotulos={ROTULOS_TIPO_MUSICA}
                  sufixo={b.id}
                  bloco={b}
                  campoMinutos="duracaoMin"
                  comRealizado={false}
                />
              </details>
              <FormRemover etapa="musica" id={b.id} protegido={false} />
            </li>
          ))}
        </ul>
      )}
      <h2 className={styles.subtitulo}>Adicionar bloco de música</h2>
      <FormBloco
        etapa="musica"
        tipos={TIPOS_MUSICA}
        rotulos={ROTULOS_TIPO_MUSICA}
        sufixo="novo"
        campoMinutos="duracaoMin"
        comRealizado={false}
      />
    </>
  )
}

const FORMULARIOS: Record<Etapa, (rotina: RotinaRecorrente) => React.ReactNode> = {
  trabalho: (rotina) => <FormTrabalho rotina={rotina} />,
  presencial: (rotina) => <FormPresencial rotina={rotina} />,
  compromissos: (rotina) => <FormCompromissos rotina={rotina} />,
  periodos: (rotina) => <FormPeriodos rotina={rotina} />,
  sono: (rotina) => <FormSono rotina={rotina} />,
  alimentacao: (rotina) => <FormAlimentacao rotina={rotina} />,
  estudo: (rotina) => <FormEstudo rotina={rotina} />,
  musica: (rotina) => <FormMusica rotina={rotina} />,
  preferencias: (rotina) => <FormPreferencias rotina={rotina} />,
}

export default async function EtapaPage({ params, searchParams }: Props) {
  const { etapa } = await params
  if (!ehEtapa(etapa)) notFound()
  const query = await searchParams

  const carregado = await (await getStateStore()).load()
  const erroCarga = !carregado.ok
  const rotina = carregado.ok ? carregado.value.dados.rotina : rotinaVazia()
  const mensagemErro = query.erro ? MENSAGENS_ERRO[query.erro] : undefined
  const indice = ETAPAS.indexOf(etapa)

  return (
    <main className={styles.container}>
      <p className={styles.progresso}>
        Etapa {indice + 1} de {ETAPAS.length}
      </p>
      <h1 className={styles.title}>{ROTULOS_ETAPA[etapa]}</h1>

      {query.salvo === '1' && (
        <p role="status" className={styles.feedback}>
          Salvo.
        </p>
      )}
      {(mensagemErro || erroCarga) && (
        <p role="alert" className={styles.erro}>
          {mensagemErro ?? 'Não foi possível carregar sua rotina agora. Tente recarregar.'}
        </p>
      )}

      {FORMULARIOS[etapa](rotina)}

      <Link className={styles.voltar} href="/configurar">
        Voltar ao resumo
      </Link>
    </main>
  )
}
