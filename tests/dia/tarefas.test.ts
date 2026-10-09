import { gerarInstanciaDiaria } from '@/server/dia/gerar'
import {
  adicionarTarefa,
  anotarDia,
  dividirTarefa,
  editarTarefa,
  promoverPrioridade,
  removerPrioridade,
  removerTarefa,
  validarInstancia,
} from '@/server/dia/modelo'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import { SchemaInvalidoError } from '@/server/persistence/schema-error'
import {
  ConfirmacaoFixoError,
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

describe('tarefas do dia', () => {
  it('cria tarefa com título e categoria; horário e nota são opcionais', () => {
    const instancia = adicionarTarefa(instanciaBase(), {
      titulo: 'Ligar para o dentista',
      categoria: 'saude',
    })

    const tarefa = instancia.tarefas.find((t) => t.titulo === 'Ligar para o dentista')
    expect(tarefa).toBeDefined()
    expect(tarefa!.inicio).toBeNull()
    expect(tarefa!.fim).toBeNull()
    expect(tarefa!.nota).toBeNull()
    expect(tarefa!.origemId).toBeNull()
  })

  it('cria tarefa agendada com início e fim', () => {
    const instancia = adicionarTarefa(instanciaBase(), {
      titulo: 'Arrumar a mochila',
      categoria: 'pessoal',
      inicio: '07:30',
      fim: '07:45',
      nota: 'Incluir lanche',
    })

    const tarefa = instancia.tarefas[0]
    expect(tarefa.inicio).toBe('07:30')
    expect(tarefa.fim).toBe('07:45')
    expect(tarefa.nota).toBe('Incluir lanche')
  })

  it('tarefa sem título ou categoria inválida falha factualmente', () => {
    const base = instanciaBase()
    expect(() => adicionarTarefa(base, { titulo: '', categoria: 'saude' })).toThrow(
      SchemaInvalidoError
    )
    expect(() => adicionarTarefa(base, { titulo: 'X', categoria: 'inexistente' as never })).toThrow(
      SchemaInvalidoError
    )
  })

  it('agenda e reposiciona tarefa sem horário na linha do tempo', () => {
    let instancia = adicionarTarefa(instanciaBase(), { titulo: 'Estudar', categoria: 'estudo' })
    const id = instancia.tarefas[0].id

    instancia = editarTarefa(instancia, id, { inicio: '20:00', fim: '21:00' })
    expect(instancia.tarefas[0].inicio).toBe('20:00')
    expect(instancia.tarefas[0].fim).toBe('21:00')

    instancia = editarTarefa(instancia, id, { inicio: '21:00', fim: '22:00' })
    expect(instancia.tarefas[0].inicio).toBe('21:00')

    instancia = editarTarefa(instancia, id, { inicio: null, fim: null })
    expect(instancia.tarefas[0].inicio).toBeNull()
  })

  it('tarefa pode ser promovida a prioridade respeitando o limite de três', () => {
    let instancia = instanciaBase()
    instancia = adicionarTarefa(instancia, { titulo: 'T1', categoria: 'pessoal' })
    instancia = adicionarTarefa(instancia, { titulo: 'T2', categoria: 'pessoal' })
    const [t1, t2] = instancia.tarefas
    const trabalho = instancia.itens[0]

    instancia = promoverPrioridade(instancia, t1.id)
    instancia = promoverPrioridade(instancia, t2.id)
    instancia = promoverPrioridade(instancia, trabalho.id)

    expect(instancia.prioridades).toEqual([t1.id, t2.id, trabalho.id])

    instancia = adicionarTarefa(instancia, { titulo: 'T4', categoria: 'pessoal' })
    const t4 = instancia.tarefas[2]
    expect(() => promoverPrioridade(instancia, t4.id)).toThrow()
    expect(instancia.prioridades).toEqual([t1.id, t2.id, trabalho.id])
  })

  it('remover exige confirmação e não registra estado de descarte', () => {
    let instancia = adicionarTarefa(instanciaBase(), { titulo: 'Engano', categoria: 'pessoal' })
    const id = instancia.tarefas[0].id

    expect(() => removerTarefa(instancia, id, false)).toThrow(ConfirmacaoFixoError)

    instancia = removerTarefa(instancia, id, true)
    expect(instancia.tarefas).toHaveLength(0)
    // a tarefa some por completo — não vira registro histórico "descartada"
    expect(JSON.stringify(instancia)).not.toContain('Engano')
  })

  it('remover tarefa que era prioridade limpa a lista', () => {
    let instancia = adicionarTarefa(instanciaBase(), { titulo: 'Temp', categoria: 'pessoal' })
    const id = instancia.tarefas[0].id
    instancia = promoverPrioridade(instancia, id)

    instancia = removerTarefa(instancia, id, true)
    expect(instancia.prioridades).toEqual([])
  })

  it('dividir cria partes relacionadas sem marcar a origem como realizada', () => {
    let instancia = adicionarTarefa(instanciaBase(), {
      titulo: 'Organizar armário',
      categoria: 'pessoal',
    })
    const origem = instancia.tarefas[0]

    instancia = dividirTarefa(instancia, origem.id, ['Separar roupas', 'Limpar prateleiras'])

    expect(instancia.tarefas).toHaveLength(3)
    const partes = instancia.tarefas.filter((t) => t.origemId === origem.id)
    expect(partes).toHaveLength(2)
    expect(partes.map((p) => p.titulo).sort()).toEqual(['Limpar prateleiras', 'Separar roupas'])
    // a tarefa original continua intacta, sem estado de realização
    expect(instancia.tarefas.find((t) => t.id === origem.id)).toEqual(origem)
  })

  it('dividir em menos de duas partes falha', () => {
    let instancia = adicionarTarefa(instanciaBase(), { titulo: 'X', categoria: 'pessoal' })
    expect(() => dividirTarefa(instancia, instancia.tarefas[0].id, ['só uma'])).toThrow(
      SchemaInvalidoError
    )
    expect(() => dividirTarefa(instancia, 'inexistente', ['a', 'b'])).toThrow(
      ItemNaoEncontradoError
    )
  })

  it('nota do dia é opcional e editável', () => {
    let instancia = instanciaBase()
    expect(instancia.notaDia).toBeNull()

    instancia = anotarDia(instancia, 'Dia corrido, ir devagar')
    expect(instancia.notaDia).toBe('Dia corrido, ir devagar')

    instancia = anotarDia(instancia, '')
    expect(instancia.notaDia).toBeNull()
  })

  it('instância validada aceita tarefas e tolera campo ausente (dados antigos)', () => {
    const instancia = adicionarTarefa(instanciaBase(), { titulo: 'X', categoria: 'estudo' })
    const validada = validarInstancia(JSON.parse(JSON.stringify(instancia)))
    expect(validada.tarefas).toHaveLength(1)

    const antiga = JSON.parse(JSON.stringify(instanciaBase()))
    delete antiga.tarefas
    delete antiga.notaDia
    const migrada = validarInstancia(antiga)
    expect(migrada.tarefas).toEqual([])
    expect(migrada.notaDia).toBeNull()
  })
})
