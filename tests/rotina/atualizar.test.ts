import { MemoryStateStore, type CelulaMemoria } from '@/server/persistence/memory'
import { estadoVazio, type EstadoPrivado } from '@/server/persistence/estado'
import {
  acrescentarCompromisso,
  definirSono,
  definirTrabalho,
  removerCompromisso,
  rotinaVazia,
} from '@/server/rotina/modelo'
import { atualizarRotina } from '@/server/usecases/rotina'

function storeComEstado(dados: EstadoPrivado = estadoVazio()) {
  const celula: CelulaMemoria = { dados, version: 1, indisponivel: false }
  return { store: new MemoryStateStore(celula), celula }
}

describe('atualizarRotina', () => {
  it('persiste uma etapa sem tocar nas demais seções', async () => {
    const rotina = definirSono(rotinaVazia(), { dormir: '23:30', acordar: '07:00' })
    const { store, celula } = storeComEstado({ ...estadoVazio(), rotina })

    const resultado = await atualizarRotina(store, (r) =>
      definirTrabalho(r, { diasSemana: ['seg', 'ter'], horasPadrao: 8, limiteExcepcional: 10 })
    )

    expect(resultado).toEqual({ ok: true, value: 2 })
    const persistido = celula.dados as EstadoPrivado
    expect(persistido.rotina.trabalho?.horasPadrao).toBe(8)
    expect(persistido.rotina.sono).toEqual({ dormir: '23:30', acordar: '07:00' })
    expect(persistido.notasPorDia).toEqual({})
  })

  it('mantém persistida a configuração salva em leitura posterior', async () => {
    const { store } = storeComEstado()
    await atualizarRotina(store, (r) =>
      definirTrabalho(r, { diasSemana: ['seg'], horasPadrao: 8, limiteExcepcional: 10 })
    )

    const lido = await store.load()
    expect(lido.ok && lido.value.dados.rotina.trabalho?.diasSemana).toEqual(['seg'])
  })

  it('devolve entrada-invalida quando a etapa rejeita os dados', async () => {
    const { store, celula } = storeComEstado()

    const resultado = await atualizarRotina(store, (r) =>
      definirTrabalho(r, { diasSemana: ['seg'], horasPadrao: 8, limiteExcepcional: 99 })
    )

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.error.kind).toBe('entrada-invalida')
    expect((celula.dados as EstadoPrivado).rotina.trabalho).toBeNull()
  })

  it('devolve confirmacao-necessaria ao remover fixo sem confirmação', async () => {
    const rotina = acrescentarCompromisso(rotinaVazia(), {
      titulo: 'Terapia',
      diaSemana: 'qui',
      inicio: '18:30',
      duracaoMin: 50,
      categoria: 'saude',
      tipo: 'fixo',
    })
    const { store } = storeComEstado({ ...estadoVazio(), rotina })
    const id = rotina.compromissos![0].id

    const resultado = await atualizarRotina(store, (r) => removerCompromisso(r, id, false))

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.error.kind).toBe('confirmacao-necessaria')
  })

  it('propaga conflito de versão e indisponibilidade do armazenamento', async () => {
    const { store, celula } = storeComEstado()
    const concorrente = new MemoryStateStore(celula)
    await atualizarRotina(concorrente, (r) =>
      definirTrabalho(r, { diasSemana: ['seg'], horasPadrao: 8, limiteExcepcional: 10 })
    )
    celula.indisponivel = true

    const resultado = await atualizarRotina(store, (r) => r)
    expect(resultado).toEqual({ ok: false, error: { kind: 'armazenamento-indisponivel' } })
  })
})
