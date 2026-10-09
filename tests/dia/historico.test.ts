import { gerarInstanciaDiaria } from '@/server/dia/gerar'
import {
  ConfirmacaoCorrecaoError,
  concluirRevisao,
  corrigirEstadoRevisao,
  registrarEstado,
  validarInstancia,
} from '@/server/dia/modelo'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import { SchemaInvalidoError } from '@/server/persistence/schema-error'
import {
  ItemNaoEncontradoError,
  acrescentarCompromisso,
  definirSono,
  definirTrabalho,
  rotinaVazia,
} from '@/server/rotina/modelo'

const AGORA = new Date('2026-10-12T12:00:00Z')

function instanciaBase() {
  let r = definirSono(rotinaVazia(), { dormir: '23:00', acordar: '07:00' })
  r = definirTrabalho(r, { diasSemana: ['ter'], horasPadrao: 8, limiteExcepcional: 10 })
  r = acrescentarCompromisso(r, {
    titulo: 'Consulta',
    diaSemana: 'ter',
    inicio: '10:00',
    duracaoMin: 30,
    categoria: 'saude',
    tipo: 'fixo',
  })
  return gerarInstanciaDiaria(gerarPropostaSemanal(r, AGORA), r, '2026-10-13', 1, AGORA)
}

function revisaoConcluida() {
  let dia = instanciaBase()
  dia = registrarEstado(dia, dia.itens[0].id, 'parcial')
  return concluirRevisao(dia, {}, AGORA)
}

describe('correção de revisão concluída', () => {
  it('corrige o estado e preserva a trilha anterior → corrigido', () => {
    const dia = revisaoConcluida()
    const id = dia.itens[0].id

    const corrigido = corrigirEstadoRevisao(
      dia,
      id,
      'realizado',
      true,
      new Date('2026-10-14T10:00:00Z')
    )

    expect(corrigido.revisao.estados[id]).toBe('realizado')
    expect(corrigido.revisao.correcoes).toEqual([
      {
        itemId: id,
        anterior: 'parcial',
        corrigido: 'realizado',
        registradaEm: '2026-10-14T10:00:00.000Z',
      },
    ])
    // A conclusão original continua registrada — correção não reabre a revisão.
    expect(corrigido.revisao.concluidaEm).toBe(dia.revisao.concluidaEm)
  })

  it('registra "sem registro" como anterior quando o item não tinha estado', () => {
    const dia = revisaoConcluida()
    // Só itens[0] foi marcado na fixture — itens[1] é o "sem registro".
    const semMarca = dia.itens.find((i) => dia.revisao.estados[i.id] === undefined)
    if (!semMarca) throw new Error('fixture precisa de item sem estado marcado')

    const corrigido = corrigirEstadoRevisao(dia, semMarca.id, 'descartado', true, AGORA)

    const ultima = corrigido.revisao.correcoes.at(-1)!
    expect(ultima.anterior).toBeNull()
    expect(ultima.corrigido).toBe('descartado')
  })

  it('exige revisão concluída, estado válido e confirmação explícita', () => {
    const base = instanciaBase()
    const id = base.itens[0].id
    const aberta = registrarEstado(base, id, 'parcial')
    const concluida = concluirRevisao(aberta, {}, AGORA)

    // Revisão ainda aberta se corrige pelo fluxo normal — correção é do histórico.
    expect(() => corrigirEstadoRevisao(aberta, id, 'realizado', true, AGORA)).toThrow(
      SchemaInvalidoError
    )
    expect(() => corrigirEstadoRevisao(concluida, id, 'realizado', false, AGORA)).toThrow(
      ConfirmacaoCorrecaoError
    )
    expect(() => corrigirEstadoRevisao(concluida, id, 'invalido' as never, true, AGORA)).toThrow(
      SchemaInvalidoError
    )
    expect(() => corrigirEstadoRevisao(concluida, 'xyz', 'realizado', true, AGORA)).toThrow(
      ItemNaoEncontradoError
    )
    // Corrigir para o mesmo estado não acrescenta nada ao histórico.
    expect(() => corrigirEstadoRevisao(concluida, id, 'parcial', true, AGORA)).toThrow(
      SchemaInvalidoError
    )
  })

  it('não toca a rotina nem materializa nada — só devolve a instância corrigida', () => {
    const dia = revisaoConcluida()
    const corrigido = corrigirEstadoRevisao(dia, dia.itens[0].id, 'realizado', true, AGORA)

    expect(corrigido.itens).toEqual(dia.itens)
    expect(corrigido.tarefas).toEqual(dia.tarefas)
    expect(corrigido.revisao.decisoes).toEqual(dia.revisao.decisoes)
  })

  it('instâncias antigas sem correcoes passam pela validação', () => {
    const dia = revisaoConcluida()
    const antiga = JSON.parse(JSON.stringify(dia)) as Record<string, unknown>
    delete (antiga.revisao as Record<string, unknown>).correcoes

    const validada = validarInstancia(antiga)
    expect(validada.revisao.correcoes).toEqual([])
  })
})
