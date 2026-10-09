import { gerarInstanciaDiaria } from '@/server/dia/gerar'
import {
  adicionarTarefa,
  concluirRevisao,
  ConfirmacaoDestinoError,
  decidirPendencia,
  incluirPendencia,
  registrarEstado,
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

// Destino só existe para pendência marcada — o helper deixa isso explícito.
function pendente(instancia: ReturnType<typeof instanciaBase>, id: string) {
  return registrarEstado(instancia, id, 'parcial')
}

function instanciaBase() {
  const r = definirTrabalho(definirSono(rotinaVazia(), { dormir: '23:00', acordar: '07:00' }), {
    diasSemana: ['ter'],
    horasPadrao: 8,
    limiteExcepcional: 10,
  })
  return gerarInstanciaDiaria(gerarPropostaSemanal(r, AGORA), r, '2026-10-13', 1, AGORA)
}

describe('destino das pendências', () => {
  it('oferece exatamente manter, reduzir, dividir, trocar de dia ou descartar', () => {
    const bruta = instanciaBase()
    const id = bruta.itens[0].id
    const base = pendente(bruta, id)

    expect(decidirPendencia(base, id, { tipo: 'manter' }, AGORA).revisao.decisoes[id].tipo).toBe(
      'manter'
    )
    expect(
      decidirPendencia(base, id, { tipo: 'reduzir', escopo: '30 min' }, AGORA).revisao.decisoes[id]
        .escopo
    ).toBe('30 min')
    expect(decidirPendencia(base, id, { tipo: 'descartar' }, AGORA).revisao.decisoes[id].tipo).toBe(
      'descartar'
    )
    expect(() => decidirPendencia(base, id, { tipo: 'ignorar' as never }, AGORA)).toThrow(
      SchemaInvalidoError
    )
  })

  it('manter preserva a pendência sem nova data e sem mexer no item', () => {
    const base = instanciaBase()
    const item = base.itens[0]
    const marcada = pendente(base, item.id)
    const decidido = decidirPendencia(marcada, item.id, { tipo: 'manter' }, AGORA)

    expect(decidido.revisao.decisoes[item.id].destino).toBeNull()
    expect(decidido.itens.find((i) => i.id === item.id)).toEqual(item)
  })

  it('reduzir exige novo escopo ou duração', () => {
    const bruta = instanciaBase()
    const id = bruta.itens[0].id
    const base = pendente(bruta, id)

    expect(() => decidirPendencia(base, id, { tipo: 'reduzir' }, AGORA)).toThrow(
      SchemaInvalidoError
    )
    expect(() => decidirPendencia(base, id, { tipo: 'reduzir', escopo: '  ' }, AGORA)).toThrow(
      SchemaInvalidoError
    )
  })

  it('dividir exige pelo menos duas partes e as cria rastreáveis', () => {
    const bruta = instanciaBase()
    const id = bruta.itens[0].id
    const base = pendente(bruta, id)

    expect(() =>
      decidirPendencia(base, id, { tipo: 'dividir', partes: ['só uma'] }, AGORA)
    ).toThrow(SchemaInvalidoError)

    const dividido = decidirPendencia(base, id, { tipo: 'dividir', partes: ['A', 'B'] }, AGORA)
    const partes = dividido.tarefas.filter((t) => t.origemId === id)
    expect(partes.map((p) => p.titulo)).toEqual(['A', 'B'])
    expect(dividido.revisao.decisoes[id].tipo).toBe('dividir')
    // O item de origem permanece no dia.
    expect(dividido.itens.some((i) => i.id === id)).toBe(true)
  })

  it('trocar de dia exige confirmação, destino válido e futuro', () => {
    const bruta = instanciaBase()
    const id = bruta.itens[0].id
    const base = pendente(bruta, id)

    // Sem confirmar a prévia do destino, a decisão não é registrada.
    expect(() =>
      decidirPendencia(base, id, { tipo: 'trocar-dia', destino: '2026-10-14' }, AGORA)
    ).toThrow(ConfirmacaoDestinoError)
    expect(() =>
      decidirPendencia(base, id, { tipo: 'trocar-dia', destino: '10/15', confirmar: true }, AGORA)
    ).toThrow(SchemaInvalidoError)
    expect(() =>
      decidirPendencia(base, id, { tipo: 'trocar-dia', destino: base.data, confirmar: true }, AGORA)
    ).toThrow(SchemaInvalidoError)
    // Dia que já passou não é destino planejável.
    expect(() =>
      decidirPendencia(
        base,
        id,
        { tipo: 'trocar-dia', destino: '2026-10-11', confirmar: true },
        AGORA
      )
    ).toThrow(SchemaInvalidoError)
    // Destino fora da janela de uma semana não é aceito — sem datas soltas.
    expect(() =>
      decidirPendencia(
        base,
        id,
        { tipo: 'trocar-dia', destino: '2026-10-25', confirmar: true },
        AGORA
      )
    ).toThrow(SchemaInvalidoError)

    const trocado = decidirPendencia(
      base,
      id,
      { tipo: 'trocar-dia', destino: '2026-10-14', confirmar: true },
      AGORA
    )
    expect(trocado.revisao.decisoes[id].destino).toBe('2026-10-14')
  })

  it('decisão não é sobrescrita — reenvio não duplica partes nem cópias', () => {
    const bruta = instanciaBase()
    const id = bruta.itens[0].id
    const base = pendente(bruta, id)
    const decidido = decidirPendencia(base, id, { tipo: 'dividir', partes: ['A', 'B'] }, AGORA)

    expect(() => decidirPendencia(decidido, id, { tipo: 'descartar' }, AGORA)).toThrow(
      SchemaInvalidoError
    )
    expect(decidido.tarefas.filter((t) => t.origemId === id)).toHaveLength(2)
  })

  it('item concluído (realizado ou descartado) não aceita destino', () => {
    let base = instanciaBase()
    const id = base.itens[0].id
    base = registrarEstado(base, id, 'descartado')
    expect(() => decidirPendencia(base, id, { tipo: 'manter' }, AGORA)).toThrow(SchemaInvalidoError)
  })

  it('repetir troca de dia é permitida e a inclusão no destino é idempotente', () => {
    const bruta = instanciaBase()
    const id = bruta.itens[0].id
    const base = pendente(bruta, id)
    const entrada = { tipo: 'trocar-dia' as const, destino: '2026-10-14', confirmar: true }
    const uma = decidirPendencia(base, id, entrada, AGORA)
    const duas = decidirPendencia(uma, id, entrada, AGORA)
    expect(duas.revisao.decisoes[id].destino).toBe('2026-10-14')
    // Outro destino não vale: uma cópia já pode ter chegado ao primeiro.
    expect(() =>
      decidirPendencia(
        uma,
        id,
        { tipo: 'trocar-dia', destino: '2026-10-15', confirmar: true },
        AGORA
      )
    ).toThrow(SchemaInvalidoError)

    // Se a gravação no destino rodar de novo, não cria tarefa duplicada.
    const destino = instanciaBase()
    const comTarefa = incluirPendencia(destino, base.itens[0], AGORA)
    const deNovo = incluirPendencia(comTarefa, base.itens[0], AGORA)
    expect(deNovo.tarefas.filter((t) => t.origemId === id)).toHaveLength(1)
  })

  it('descartar preserva o item e registra a decisão no histórico', () => {
    const bruta = instanciaBase()
    const id = bruta.itens[0].id
    const base = pendente(bruta, id)
    const decidido = decidirPendencia(base, id, { tipo: 'descartar' }, AGORA)

    expect(decidido.itens.some((i) => i.id === id)).toBe(true)
    expect(decidido.revisao.decisoes[id].tipo).toBe('descartar')
    expect(decidido.revisao.decisoes[id].registradaEm).toBe(AGORA.toISOString())
  })

  it('cobre tarefas além dos itens planejados', () => {
    let base = adicionarTarefa(instanciaBase(), { titulo: 'X', categoria: 'pessoal' }, AGORA)
    const tarefa = base.tarefas[0]
    base = registrarEstado(base, tarefa.id, 'reprogramado')
    const decidido = decidirPendencia(base, tarefa.id, { tipo: 'manter' }, AGORA)
    expect(decidido.revisao.decisoes[tarefa.id].tipo).toBe('manter')
  })

  it('rejeita decisão para item inexistente, sem marcação e revisão concluída', () => {
    const base = instanciaBase()
    expect(() => decidirPendencia(base, 'xyz', { tipo: 'manter' }, AGORA)).toThrow(
      ItemNaoEncontradoError
    )
    // Sem marcação não é pendência — é "sem registro".
    expect(() => decidirPendencia(base, base.itens[0].id, { tipo: 'manter' }, AGORA)).toThrow(
      SchemaInvalidoError
    )
    const marcada = pendente(base, base.itens[0].id)
    const concluida = concluirRevisao(marcada, {}, AGORA)
    expect(() => decidirPendencia(concluida, base.itens[0].id, { tipo: 'manter' }, AGORA)).toThrow(
      SchemaInvalidoError
    )
  })

  it('concluir a revisão não reagenda nada sozinho', () => {
    let dia = instanciaBase()
    dia = registrarEstado(dia, dia.itens[0].id, 'reprogramado')
    const concluida = concluirRevisao(dia, {}, AGORA)

    // Nenhuma decisão foi criada, nenhum item foi movido ou duplicado.
    expect(concluida.revisao.decisoes).toEqual({})
    expect(concluida.itens).toEqual(dia.itens)
    expect(concluida.tarefas).toEqual(dia.tarefas)
  })

  it('instâncias antigas sem decisões passam pela validação', () => {
    const base = instanciaBase()
    const antiga = { ...base, revisao: { ...base.revisao } } as Record<string, unknown>
    delete (antiga.revisao as Record<string, unknown>).decisoes
    expect(validarInstancia(antiga).revisao.decisoes).toEqual({})
  })
})
