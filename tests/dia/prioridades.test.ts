import { gerarInstanciaDiaria } from '@/server/dia/gerar'
import {
  LimitePrioridadesError,
  promoverPrioridade,
  removerPrioridade,
  substituirPrioridade,
} from '@/server/dia/modelo'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import { ItemNaoEncontradoError } from '@/server/rotina/modelo'
import {
  acrescentarCompromisso,
  definirSono,
  definirTrabalho,
  rotinaVazia,
} from '@/server/rotina/modelo'

const AGORA = new Date('2026-10-12T12:00:00Z')

function instanciaBase() {
  let r = definirTrabalho(definirSono(rotinaVazia(), { dormir: '23:00', acordar: '07:00' }), {
    diasSemana: ['ter'],
    horasPadrao: 8,
    limiteExcepcional: 10,
  })
  for (const [i, titulo] of ['Exame', 'Consulta', 'Reunião', 'Farmácia'].entries()) {
    r = acrescentarCompromisso(r, {
      titulo,
      diaSemana: 'ter',
      inicio: `${String(9 + i).padStart(2, '0')}:00`,
      duracaoMin: 30,
      categoria: 'saude',
      tipo: 'flexivel',
    })
  }
  return gerarInstanciaDiaria(gerarPropostaSemanal(r, AGORA), r, '2026-10-13', 1, AGORA)
}

describe('prioridades do dia', () => {
  it('aceita de zero a três prioridades', () => {
    let instancia = instanciaBase()
    const [a, b, c] = instancia.itens

    instancia = promoverPrioridade(instancia, a.id)
    instancia = promoverPrioridade(instancia, b.id)
    instancia = promoverPrioridade(instancia, c.id)

    expect(instancia.prioridades).toEqual([a.id, b.id, c.id])
  })

  it('a quarta prioridade exige decisão — nada é removido automaticamente', () => {
    let instancia = instanciaBase()
    const [a, b, c, d] = instancia.itens.length >= 4 ? instancia.itens : []
    void d
    const ids = instancia.itens.map((i) => i.id)
    for (const id of ids.slice(0, 3)) instancia = promoverPrioridade(instancia, id)

    const quarto = ids[3] ?? ids[0]

    if (ids.length > 3) {
      expect(() => promoverPrioridade(instancia, quarto)).toThrow(LimitePrioridadesError)
      expect(instancia.prioridades).toHaveLength(3)
      expect(instancia.prioridades).toEqual(ids.slice(0, 3))
    }
  })

  it('substituição troca a prioridade escolhida pelo usuário', () => {
    let instancia = instanciaBase()
    const ids = instancia.itens.map((i) => i.id)
    for (const id of ids.slice(0, 3)) instancia = promoverPrioridade(instancia, id)
    const quarto = ids[3]!

    const trocada = substituirPrioridade(instancia, ids[1], quarto)

    expect(trocada.prioridades).toEqual([ids[0], quarto, ids[2]])
  })

  it('substituição com id inexistente falha de forma factual', () => {
    let instancia = instanciaBase()
    const ids = instancia.itens.map((i) => i.id)
    instancia = promoverPrioridade(instancia, ids[0])

    expect(() => substituirPrioridade(instancia, 'nao-e-prioridade', ids[1])).toThrow(
      ItemNaoEncontradoError
    )
  })

  it('remover prioridade não exclui o item do dia', () => {
    let instancia = instanciaBase()
    const alvo = instancia.itens[0]
    instancia = promoverPrioridade(instancia, alvo.id)

    const atualizada = removerPrioridade(instancia, alvo.id)

    expect(atualizada.prioridades).toEqual([])
    expect(atualizada.itens.some((i) => i.id === alvo.id)).toBe(true)
  })

  it('promover o mesmo item duas vezes não duplica', () => {
    let instancia = instanciaBase()
    const alvo = instancia.itens[0]
    instancia = promoverPrioridade(instancia, alvo.id)
    instancia = promoverPrioridade(instancia, alvo.id)

    expect(instancia.prioridades).toEqual([alvo.id])
  })
})
