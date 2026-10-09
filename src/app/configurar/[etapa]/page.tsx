import Link from 'next/link'
import { notFound } from 'next/navigation'
import styles from '../configurar.module.css'
import { ehEtapa, ETAPAS, ROTULOS_ETAPA, type Etapa } from '../etapas'
import { resumoCompromisso, resumoPeriodo } from '../resumo'
import { getStateStore } from '@/server/persistence'
import { MENSAGENS_ERRO } from '@/server/persistence/mensagens'
import {
  CATEGORIAS,
  DIAS_SEMANA,
  ROTULOS_CATEGORIA,
  ROTULOS_DIA,
  rotinaVazia,
  type RotinaRecorrente,
} from '@/server/rotina/modelo'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ etapa: string }>
  searchParams: Promise<{ salvo?: string; erro?: string }>
}

const ROTULOS_TIPO_PERIODO = {
  'cuidado-familiar': 'Cuidado familiar',
  indisponibilidade: 'Indisponibilidade',
} as const

function SelecaoDias({ marcados }: { marcados: readonly string[] }) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Dias da semana</legend>
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
              <form action="/api/rotina/compromissos" method="post" className={styles.form}>
                <input type="hidden" name="acao" value="remover" />
                <input type="hidden" name="id" value={c.id} />
                {c.tipo === 'fixo' && (
                  <label className={styles.opcao} htmlFor={`confirmar-${c.id}`}>
                    <input id={`confirmar-${c.id}`} type="checkbox" name="confirmarFixo" />
                    Confirmo a alteração deste compromisso fixo
                  </label>
                )}
                <button className={styles.remover} type="submit">
                  Remover
                </button>
              </form>
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
              <form action="/api/rotina/periodos" method="post" className={styles.form}>
                <input type="hidden" name="acao" value="remover" />
                <input type="hidden" name="id" value={p.id} />
                <button className={styles.remover} type="submit">
                  Remover
                </button>
              </form>
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

const FORMULARIOS: Record<Etapa, (rotina: RotinaRecorrente) => React.ReactNode> = {
  trabalho: (rotina) => <FormTrabalho rotina={rotina} />,
  presencial: (rotina) => <FormPresencial rotina={rotina} />,
  compromissos: (rotina) => <FormCompromissos rotina={rotina} />,
  periodos: (rotina) => <FormPeriodos rotina={rotina} />,
  sono: (rotina) => <FormSono rotina={rotina} />,
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
