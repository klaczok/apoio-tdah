import { render, screen } from '@testing-library/react'
import SemanaPage from '@/app/semana/page'
import { getStateStore } from '@/server/persistence'
import { estadoVazio } from '@/server/persistence/estado'
import { gerarInstanciaDiaria } from '@/server/dia/gerar'
import { registrarEstado } from '@/server/dia/modelo'
import { diasDaSemana } from '@/server/dia/semana'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import { confirmarProposta } from '@/server/proposta/modelo'
import { acrescentarCompromisso, definirSono, rotinaVazia } from '@/server/rotina/modelo'
import { dataCivilHoje, dataCivilParaTexto, diaSemanaDe } from '@/server/tempo'

process.env.PERSISTENCE_DRIVER = 'memory'

function renderizar(params: Record<string, string> = {}) {
  return SemanaPage({ searchParams: Promise.resolve(params) }).then(render)
}

async function comSemana() {
  const hoje = dataCivilHoje()
  const store = await getStateStore()
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
    const store = await getStateStore()
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
