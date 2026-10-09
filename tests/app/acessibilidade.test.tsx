import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import AmanhaPage from '@/app/amanha/page'
import ConfigurarPage from '@/app/configurar/page'
import HistoricoPage from '@/app/historico/page'
import HistoricoDiaPage from '@/app/historico/[data]/page'
import HojePage from '@/app/hoje/page'
import LoginPage from '@/app/login/page'
import PropostaPage from '@/app/proposta/page'
import SemanaPage from '@/app/semana/page'
import { getStateStore } from '@/server/persistence'
import { estadoVazio } from '@/server/persistence/estado'
import { gerarInstanciaDiaria } from '@/server/dia/gerar'
import { concluirRevisao, registrarEstado } from '@/server/dia/modelo'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import { confirmarProposta } from '@/server/proposta/modelo'
import {
  acrescentarCompromisso,
  definirSono,
  definirTrabalho,
  rotinaVazia,
  type RotinaRecorrente,
} from '@/server/rotina/modelo'
import { dataCivilAmanha, dataCivilHoje, diaSemanaDe, somarDiasCivil } from '@/server/tempo'

expect.extend(toHaveNoViolations)

process.env.PERSISTENCE_DRIVER = 'memory'

// jsdom não implementa leiaute — as regras de contraste de cor do axe
// dependem de estilos computados e são verificadas na revisão manual.
const regras = { rules: { 'color-contrast': { enabled: false } } }

async function salvar(dados: ReturnType<typeof estadoVazio>) {
  const store = await getStateStore()
  const lido = await store.load()
  if (!lido.ok) throw new Error('store indisponível no teste')
  await store.save(dados, lido.value.version)
}

function rotinaBase(): RotinaRecorrente {
  const hoje = dataCivilHoje()
  let r = definirSono(rotinaVazia(), { dormir: '23:00', acordar: '07:00' })
  r = definirTrabalho(r, {
    diasSemana: [
      ...new Set([
        'seg',
        'ter',
        'qua',
        'qui',
        'sex',
        diaSemanaDe(hoje),
        diaSemanaDe(dataCivilAmanha()),
      ]),
    ],
    horasPadrao: 8,
    limiteExcepcional: 10,
  })
  return acrescentarCompromisso(r, {
    titulo: 'Consulta',
    diaSemana: diaSemanaDe(hoje),
    inicio: '10:00',
    duracaoMin: 30,
    categoria: 'saude',
    tipo: 'fixo',
  })
}

async function comSemanaAtiva() {
  const rotina = rotinaBase()
  const semana = confirmarProposta(gerarPropostaSemanal(rotina), new Date('2026-10-12T12:00:00Z'))
  const hoje = dataCivilHoje()
  const instancia = gerarInstanciaDiaria(semana, rotina, hoje, 1)
  await salvar({ ...estadoVazio(), rotina, semanaAtiva: semana, dias: { [hoje]: instancia } })
  return { rotina, semana, hoje, instancia }
}

describe('acessibilidade automatizada das jornadas', () => {
  it('login não tem violações', async () => {
    const { container } = render(await LoginPage({ searchParams: Promise.resolve({}) }))
    expect(await axe(container, regras)).toHaveNoViolations()
  })

  it('onboarding não tem violações', async () => {
    await salvar({ ...estadoVazio(), rotina: rotinaBase() })
    const { container } = render(await ConfigurarPage({ searchParams: Promise.resolve({}) }))
    expect(await axe(container, regras)).toHaveNoViolations()
  })

  it('planejamento de amanhã não tem violações', async () => {
    await comSemanaAtiva()
    const { container } = render(await AmanhaPage({ searchParams: Promise.resolve({}) }))
    expect(await axe(container, regras)).toHaveNoViolations()
  })

  it('revisão do dia não tem violações', async () => {
    await comSemanaAtiva()
    const { container } = render(await HojePage({ searchParams: Promise.resolve({}) }))
    expect(await axe(container, regras)).toHaveNoViolations()
  })

  it('visão semanal não tem violações', async () => {
    await comSemanaAtiva()
    const { container } = render(await SemanaPage({ searchParams: Promise.resolve({}) }))
    expect(await axe(container, regras)).toHaveNoViolations()
  })

  it('proposta semanal não tem violações', async () => {
    const rotina = rotinaBase()
    await salvar({
      ...estadoVazio(),
      rotina,
      propostaSemanal: gerarPropostaSemanal(rotina, new Date('2026-10-12T12:00:00Z')),
    })
    const { container } = render(await PropostaPage({ searchParams: Promise.resolve({}) }))
    expect(await axe(container, regras)).toHaveNoViolations()
  })

  it('histórico (lista e detalhe) não tem violações', async () => {
    const { rotina, semana } = await comSemanaAtiva()
    const ontem = somarDiasCivil(dataCivilHoje(), -1)
    let passado = gerarInstanciaDiaria(semana, rotina, ontem, 1)
    passado = registrarEstado(passado, passado.itens[0].id, 'realizado')
    passado = concluirRevisao(passado, {}, new Date('2026-10-12T21:00:00Z'))
    const store = await getStateStore()
    const lido = await store.load()
    if (!lido.ok) throw new Error('store indisponível no teste')
    await store.save(
      { ...lido.value.dados, dias: { ...lido.value.dados.dias, [ontem]: passado } },
      lido.value.version
    )

    const lista = render(await HistoricoPage({ searchParams: Promise.resolve({}) }))
    expect(await axe(lista.container, regras)).toHaveNoViolations()
    lista.unmount()

    const detalhe = render(
      await HistoricoDiaPage({
        params: Promise.resolve({ data: ontem }),
        searchParams: Promise.resolve({}),
      })
    )
    expect(await axe(detalhe.container, regras)).toHaveNoViolations()
  })
})

describe('garantias estruturais de CSS', () => {
  const globals = require('node:fs').readFileSync(
    require('node:path').join(__dirname, '../../src/app/globals.css'),
    'utf8'
  )

  it('respeita prefers-reduced-motion', () => {
    expect(globals).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('foco é sempre visível', () => {
    expect(globals).toContain(':focus-visible')
    expect(globals).toMatch(/outline:\s*[^;]+/)
  })
})
