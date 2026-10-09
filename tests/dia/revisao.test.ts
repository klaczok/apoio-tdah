import { gerarInstanciaDiaria } from '@/server/dia/gerar'
import {
  adicionarTarefa,
  concluirRevisao,
  registrarEstado,
  sinteseRevisao,
  validarInstancia,
} from '@/server/dia/modelo'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import { SchemaInvalidoError } from '@/server/persistence/schema-error'
import {
  ItemNaoEncontradoError,
  definirSono,
  definirTrabalho,
  rotinaVazia,
} from '@/server/rotina/modelo'

const AGORA = new Date('2026-10-12T12:00:00Z')

function instanciaBase() {
  const r = definirTrabalho(definirSono(rotinaVazia(), { dormir: '23:00', acordar: '07:00' }), {
    diasSemana: ['ter'],
    horasPadrao: 8,
    limiteExcepcional: 10,
  })
  return gerarInstanciaDiaria(gerarPropostaSemanal(r, AGORA), r, '2026-10-13', 1, AGORA)
}

describe('revisão do dia', () => {
  it('aceita exatamente realizado, parcial, reprogramado ou descartado', () => {
    const base = instanciaBase()
    const id = base.itens[0].id

    for (const estado of ['realizado', 'parcial', 'reprogramado', 'descartado'] as const) {
      expect(registrarEstado(base, id, estado).revisao.estados[id]).toBe(estado)
    }
    expect(() => registrarEstado(base, id, 'pulado' as never)).toThrow(SchemaInvalidoError)
  })

  it('mantém planejado e registrado como valores distintos', () => {
    const base = instanciaBase()
    const item = base.itens[0]
    const revisado = registrarEstado(base, item.id, 'parcial')

    expect(revisado.itens.find((i) => i.id === item.id)).toEqual(item)
    expect(revisado.revisao.estados[item.id]).toBe('parcial')
  })

  it('ausência de estado não vira falha — item fica sem registro', () => {
    const base = instanciaBase()
    const revisado = registrarEstado(base, base.itens[0].id, 'realizado')

    const sintese = sinteseRevisao(revisado)
    expect(sintese).toMatch(/sem registro/)
    expect(sintese).not.toMatch(/falh/i)
  })

  it('limpar o estado devolve o item ao grupo sem registro', () => {
    const base = instanciaBase()
    const id = base.itens[0].id
    const com = registrarEstado(base, id, 'realizado')
    const sem = registrarEstado(com, id, null)

    expect(sem.revisao.estados[id]).toBeUndefined()
  })

  it('conclui a revisão sem preencher campos reflexivos', () => {
    const base = instanciaBase()
    const concluida = concluirRevisao(base, {}, AGORA)

    expect(concluida.revisao.concluidaEm).toBe(AGORA.toISOString())
    expect(concluida.revisao.energia).toBeNull()
    expect(concluida.revisao.sobrecarga).toBeNull()
    expect(concluida.revisao.motivo).toBeNull()
    expect(concluida.revisao.nota).toBeNull()
  })

  it('energia e sobrecarga usam escalas curtas validadas', () => {
    const base = instanciaBase()
    const concluida = concluirRevisao(
      base,
      { energia: 'baixa', sobrecarga: 'pesada', motivo: 'imprevistos', nota: 'dia ok' },
      AGORA
    )
    expect(concluida.revisao.energia).toBe('baixa')
    expect(concluida.revisao.sobrecarga).toBe('pesada')
    expect(concluida.revisao.motivo).toBe('imprevistos')

    expect(() => concluirRevisao(base, { energia: 'exausto' as never }, AGORA)).toThrow(
      SchemaInvalidoError
    )
    expect(() => concluirRevisao(base, { sobrecarga: 'muita' as never }, AGORA)).toThrow(
      SchemaInvalidoError
    )
  })

  it('cobre tarefas do dia na revisão', () => {
    const base = instanciaBase()
    const comTarefa = adicionarTarefa(
      base,
      { titulo: 'Comprar remédio', categoria: 'saude' },
      AGORA
    )
    const tarefa = comTarefa.tarefas[0]

    expect(registrarEstado(comTarefa, tarefa.id, 'reprogramado').revisao.estados[tarefa.id]).toBe(
      'reprogramado'
    )
  })

  it('rejeita estado para item inexistente', () => {
    expect(() => registrarEstado(instanciaBase(), 'xyz', 'realizado')).toThrow(
      ItemNaoEncontradoError
    )
  })

  it('instâncias antigas sem revisão passam pela validação', () => {
    const base = instanciaBase()
    const antiga = { ...base } as Record<string, unknown>
    delete antiga.revisao
    expect(validarInstancia(antiga).revisao.estados).toEqual({})
  })

  it('revisão concluída não aceita novos estados nem reconclusão', () => {
    const base = instanciaBase()
    const concluida = concluirRevisao(base, { energia: 'ok' }, AGORA)

    expect(() => registrarEstado(concluida, concluida.itens[0].id, 'realizado')).toThrow(
      SchemaInvalidoError
    )
    expect(() => concluirRevisao(concluida, { energia: 'alta' }, AGORA)).toThrow(
      SchemaInvalidoError
    )
  })

  describe('síntese', () => {
    it('deriva dos estados com linguagem factual', () => {
      let dia = adicionarTarefa(
        instanciaBase(),
        { titulo: 'Ligar para o banco', categoria: 'pessoal' },
        AGORA
      )
      const a = dia.itens[0].id
      const tarefa = dia.tarefas[0].id
      for (const [id, est] of [
        [a, 'realizado'],
        [tarefa, 'descartado'],
      ] as const) {
        dia = registrarEstado(dia, id, est)
      }

      const s = sinteseRevisao(dia)
      expect(s).toMatch(/1 realizad/)
      expect(s).toMatch(/1 descartad/)
      expect(s).toMatch(/sem registro/)
    })

    it('não usa linguagem punitiva, nota, ranking ou sequência', () => {
      let dia = instanciaBase()
      for (const item of dia.itens) {
        dia = registrarEstado(dia, item.id, 'descartado')
      }
      const s = sinteseRevisao(dia)
      expect(s).not.toMatch(
        /falh|fracass|perdeu|pior|ruim|culpa|deveria|pontos|score|streak|ranking/i
      )
    })
  })
})
