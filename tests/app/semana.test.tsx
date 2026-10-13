import { render, screen } from '@testing-library/react'
import SemanaPage from '@/app/(area)/semana/page'
import { getStateStore } from '@/server/persistence'
import { estadoVazio } from '@/server/persistence/estado'
import { gerarInstanciaDiaria } from '@/server/dia/gerar'
import { registrarEstado } from '@/server/dia/modelo'
import { diasDaSemana } from '@/server/dia/semana'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import { confirmarProposta } from '@/server/proposta/modelo'
import { acrescentarCompromisso, definirSono, rotinaVazia } from '@/server/rotina/modelo'
import { dataCivilHoje, dataCivilParaTexto, diaSemanaDe } from '@/server/tempo'

import { autenticarComo, USUARIO_TESTE } from '../helpers/sessao'

process.env.PERSISTENCE_DRIVER = 'memory'

beforeEach(() => autenticarComo())

function renderizar(params: Record<string, string> = {}) {
  return SemanaPage({ searchParams: Promise.resolve(params) }).then(render)
}

async function comSemana() {
  const hoje = dataCivilHoje()
  const store = await getStateStore(USUARIO_TESTE)
  const lido = await store.load()
  if (!lido.ok) throw new Error('store indisponível no teste')
  let rotina = definirSono(rotinaVazia(), { dormir: '23:00', acordar: '07:00' })
  rotina = acrescentarCompromisso(rotina, {
    titulo: 'Consulta',
    diaSemana: diaSemanaDe(hoje),
    inicio: '10:00',
    duracaoMin: 30,
    categoria: 'saude',
    tipo: 'fixo',
  })
  rotina = acrescentarCompromisso(rotina, {
    titulo: 'Violino',
    diaSemana: diaSemanaDe(hoje),
    inicio: '18:00',
    duracaoMin: 45,
    categoria: 'musica',
    tipo: 'flexivel',
  })
  const semana = confirmarProposta(gerarPropostaSemanal(rotina), new Date('2026-10-12T12:00:00Z'))
  const instancia = gerarInstanciaDiaria(semana, rotina, hoje, lido.value.version)
  await store.save(
    { ...estadoVazio(), rotina, semanaAtiva: semana, dias: { [hoje]: instancia } },
    lido.value.version
  )
  return { hoje, instancia, rotina }
}

describe('/semana — equilíbrio semanal', () => {
  it('mostra os sete dias da semana com carga por categoria', async () => {
    await comSemana()

    await renderizar()

    expect(screen.getByRole('heading', { level: 1, name: 'Semana' })).toBeInTheDocument()
    for (const data of diasDaSemana(dataCivilHoje())) {
      expect(screen.getAllByText(new RegExp(dataCivilParaTexto(data))).length).toBeGreaterThan(0)
    }
    expect(screen.getAllByText(/saúde/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/música/i).length).toBeGreaterThan(0)
  })

  it('distingue fixo de flexível e mantém planejado/registrado separados', async () => {
    const { instancia, hoje } = await comSemana()
    const flexivel = instancia.itens.find((i) => i.protecao === 'flexivel')
    let dia = instancia
    if (flexivel) dia = registrarEstado(instancia, flexivel.id, 'realizado')
    const store = await getStateStore(USUARIO_TESTE)
    const lido = await store.load()
    if (!lido.ok) throw new Error('store indisponível no teste')
    await store.save(
      { ...lido.value.dados, dias: { ...lido.value.dados.dias, [hoje]: dia } },
      lido.value.version
    )

    await renderizar()

    expect(screen.getAllByText(/fixo/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/flexível/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/planejado/i).length).toBeGreaterThan(0)
    if (flexivel) expect(screen.getAllByText(/registrado/i).length).toBeGreaterThan(0)
  })

  it('ajuste volta para /semana e o form de fixo carrega confirmação', async () => {
    const { instancia } = await comSemana()
    const flexivel = instancia.itens.find((i) => i.protecao === 'flexivel')!
    const fixo = instancia.itens.find((i) => i.protecao === 'fixo')!

    await renderizar()

    const forms = screen
      .getAllByRole('button', { name: /salvar ajuste/i })
      .map((b) => b.closest('form')!)
    const formDo = (id: string) =>
      forms.find((f) => (f.querySelector('input[name="id"]') as HTMLInputElement).value === id)!
    const formFixo = formDo(fixo.id)
    const formFlex = formDo(flexivel.id)

    // Ambos voltam para /semana; só o fixo exige a confirmação específica.
    expect(formFixo.querySelector('input[name="volta"]')).toHaveValue('semana')
    expect(formFlex.querySelector('input[name="volta"]')).toHaveValue('semana')
    expect(formFixo.querySelector('input[name="confirmar"]')).not.toBeNull()
    expect(formFlex.querySelector('input[name="confirmar"]')).toBeNull()
  })

  it('mostra feedback de ajuste salvo', async () => {
    await comSemana()

    await renderizar({ salvo: '1' })
    expect(screen.getByRole('status')).toHaveTextContent(/ajuste salvo/i)
  })

  it('não usa pontuação, ranking ou linguagem de avaliação', async () => {
    await comSemana()

    const { container } = await renderizar()

    expect(container.textContent).not.toMatch(/pontos|ranking|streak|sequência de dias/i)
    expect(container.textContent).not.toMatch(/parabéns|você falhou|produtividade/i)
  })
})

describe('/semana — grade temporal', () => {
  it('apresenta a agenda como grade com os sete dias e eixo de horas', async () => {
    await comSemana()

    await renderizar()

    const grade = screen.getByRole('grid', { name: /agenda da semana/i })
    expect(grade).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).toHaveLength(8) // eixo + 7 dias
    expect(screen.getAllByRole('gridcell')).toHaveLength(7)
  })

  it('blocos carregam rótulo textual com horário, categoria e proteção', async () => {
    await comSemana()

    await renderizar()

    expect(
      screen.getAllByRole('group', { name: /consulta.*10:00–10:30.*saúde.*fixo/i }).length
    ).toBeGreaterThan(0)
    expect(screen.getAllByRole('group', { name: /violino.*flexível/i }).length).toBeGreaterThan(0)
  })

  it('navega entre semana anterior, atual e próxima preservando a data na rota', async () => {
    await comSemana()
    const hoje = dataCivilHoje()
    const segunda = diasDaSemana(hoje)[0]!
    const anterior = new Date(new Date(`${segunda}T12:00:00Z`).getTime() - 7 * 86400000)
      .toISOString()
      .slice(0, 10)
    const proxima = new Date(new Date(`${segunda}T12:00:00Z`).getTime() + 7 * 86400000)
      .toISOString()
      .slice(0, 10)

    await renderizar()

    expect(screen.getByRole('link', { name: /semana anterior/i })).toHaveAttribute(
      'href',
      `/semana?semana=${anterior}`
    )
    expect(screen.getByRole('link', { name: /próxima semana/i })).toHaveAttribute(
      'href',
      `/semana?semana=${proxima}`
    )
    // Na semana corrente o atalho "Esta semana" não precisa aparecer.
    expect(screen.queryByRole('link', { name: /esta semana/i })).not.toBeInTheDocument()
  })

  it('outra semana mostra os dias dela e oferece voltar à corrente', async () => {
    await comSemana()
    const hoje = dataCivilHoje()
    const outra = new Date(new Date(`${hoje}T12:00:00Z`).getTime() + 14 * 86400000)
      .toISOString()
      .slice(0, 10)

    await renderizar({ semana: outra })

    for (const data of diasDaSemana(outra)) {
      expect(screen.getAllByText(new RegExp(dataCivilParaTexto(data))).length).toBeGreaterThan(0)
    }
    expect(screen.getByRole('link', { name: /esta semana/i })).toHaveAttribute('href', '/semana')
  })

  it('o dia atual é identificado na grade sem depender só de cor', async () => {
    await comSemana()

    await renderizar()

    const hoje = dataCivilParaTexto(dataCivilHoje())
    const coluna = screen.getByRole('gridcell', { name: new RegExp(`${hoje}.*hoje`, 'i') })
    expect(coluna).toBeInTheDocument()
  })

  it('espaços livres aparecem como respiro com equivalente textual', async () => {
    await comSemana()

    await renderizar()

    expect(screen.getAllByText(/espaço livre/i).length).toBeGreaterThan(0)
  })

  it('leitura da semana identifica maior carga e margens com dados reais', async () => {
    await comSemana()

    await renderizar()

    expect(screen.getByText(/maior carga/i)).toBeInTheDocument()
  })
})

describe('/semana — foco diário no celular', () => {
  it('oferece seletor dos sete dias com o dia atual marcado', async () => {
    await comSemana()

    await renderizar()

    const seletor = screen.getByRole('navigation', { name: /escolher dia/i })
    const links = seletor.querySelectorAll('a')
    expect(links).toHaveLength(7)
    const hoje = dataCivilHoje()
    const chip = seletor.querySelector(`a[aria-current="date"]`)!
    expect(chip).toHaveAttribute('href', `/semana?semana=${diasDaSemana(hoje)[0]}&dia=${hoje}`)
    // Contexto disponível sem depender de gesto.
    expect(seletor).toHaveTextContent(/7 dias/i)
  })

  it('mostra um só dia por vez com conteúdo equivalente à grade', async () => {
    const { hoje } = await comSemana()

    await renderizar()

    const agenda = screen.getByRole('region', { name: /agenda do dia selecionado/i })
    // Apenas um título de dia dentro da leitura móvel.
    expect(agenda.querySelectorAll('h2')).toHaveLength(1)
    expect(agenda).toHaveTextContent(new RegExp(dataCivilParaTexto(hoje)))
    // Mesmos itens da grade: horário, categoria e proteção no rótulo.
    expect(agenda.textContent).toMatch(/consulta/i)
    expect(agenda.textContent).toMatch(/violino/i)
    expect(agenda).toHaveTextContent(/ocupadas|livre/i)
  })

  it('selecionar outro dia troca a data exibida sem perder a semana', async () => {
    await comSemana()
    const segunda = diasDaSemana(dataCivilHoje())[0]!
    const quarta = diasDaSemana(dataCivilHoje())[2]!

    await renderizar({ semana: segunda, dia: quarta })

    const agenda = screen.getByRole('region', { name: /agenda do dia selecionado/i })
    expect(agenda).toHaveTextContent(new RegExp(dataCivilParaTexto(quarta)))
    // A semana segue na rota — os chips continuam apontando para ela.
    const seletor = screen.getByRole('navigation', { name: /escolher dia/i })
    expect(seletor.querySelector(`a[aria-current="date"]`)).toHaveAttribute(
      'href',
      `/semana?semana=${segunda}&dia=${quarta}`
    )
  })

  it('controles explícitos de dia anterior e próximo são operáveis por link', async () => {
    await comSemana()
    const dias = diasDaSemana(dataCivilHoje())

    await renderizar({ semana: dias[0], dia: dias[3] })

    const nav = screen.getByRole('navigation', { name: /mudar de dia/i })
    expect(screen.getByRole('link', { name: /dia anterior/i })).toHaveAttribute(
      'href',
      `/semana?semana=${dias[0]}&dia=${dias[2]}`
    )
    expect(screen.getByRole('link', { name: /próximo dia/i })).toHaveAttribute(
      'href',
      `/semana?semana=${dias[0]}&dia=${dias[4]}`
    )
    expect(nav).toBeInTheDocument()
  })

  it('bloco selecionado comunica data, duração e proteção no painel', async () => {
    const { hoje } = await comSemana()

    await renderizar()

    const consulta = screen
      .getAllByRole('group', { name: /consulta.*saúde.*fixo/i })
      .map((g) => g.closest('details')!)[0]
    expect(consulta).toHaveTextContent(new RegExp(dataCivilParaTexto(hoje)))
    expect(consulta).toHaveTextContent(/30min/i)
    expect(consulta).toHaveTextContent(/protegido.*confirmação/i)
  })

  it('criação rápida usa o contrato da rotina e devolve à agenda', async () => {
    await comSemana()
    const hoje = dataCivilHoje()

    await renderizar()

    const criar = screen.getAllByRole('button', { name: /criar compromisso/i })[0]
    const form = criar.closest('form')!
    expect(form).toHaveAttribute('action', '/api/rotina/compromissos')
    // Campos do domínio: nome, dia, início, fim, categoria, proteção.
    for (const nome of ['titulo', 'diaSemana', 'inicio', 'fim', 'categoria', 'tipo']) {
      expect(form.querySelector(`[name="${nome}"]`)).not.toBeNull()
    }
    expect(form.querySelector('input[name="volta"]')).toHaveValue('semana')
    expect(form.querySelector('select[name="diaSemana"]')).toHaveValue(diaSemanaDe(hoje))
  })

  it('criação concluída mostra feedback na agenda', async () => {
    await comSemana()

    await renderizar({ criado: '1' })

    expect(screen.getByRole('status')).toHaveTextContent(/compromisso criado/i)
  })

  it('dia fora da semana cai para hoje ou segunda sem quebrar', async () => {
    await comSemana()
    const dias = diasDaSemana(dataCivilHoje())

    await renderizar({ dia: '1999-01-01' })

    const agenda = screen.getByRole('region', { name: /agenda do dia selecionado/i })
    const esperado = dias.includes(dataCivilHoje()) ? dataCivilHoje() : dias[0]!
    expect(agenda).toHaveTextContent(new RegExp(dataCivilParaTexto(esperado)))
  })
})
