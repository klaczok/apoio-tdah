import {
  aceitarSugestao,
  confirmarProposta,
  editarSugestao,
  removerSugestao,
  validarProposta,
} from '@/server/proposta/modelo'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import { SchemaInvalidoError } from '@/server/persistence/schema-error'
import {
  acrescentarCompromisso,
  ConfirmacaoFixoError,
  definirSono,
  definirTrabalho,
  ItemNaoEncontradoError,
  rotinaVazia,
} from '@/server/rotina/modelo'

const AGORA = new Date('2026-10-12T12:00:00Z')

function propostaBase() {
  let r = rotinaVazia()
  r = definirSono(r, { dormir: '23:00', acordar: '07:00' })
  r = definirTrabalho(r, { diasSemana: ['seg'], horasPadrao: 8, limiteExcepcional: 10 })
  r = acrescentarCompromisso(r, {
    titulo: 'Terapia',
    diaSemana: 'qui',
    inicio: '18:00',
    duracaoMin: 50,
    categoria: 'saude',
    tipo: 'fixo',
  })
  return gerarPropostaSemanal(r, AGORA)
}

describe('proposta semanal — rascunho', () => {
  it('aceitar marca a sugestão sem tocar nas demais', () => {
    const proposta = propostaBase()
    const alvo = proposta.dias[0].sugestoes[0]

    const atualizada = aceitarSugestao(proposta, alvo.id)

    const seg = atualizada.dias[0].sugestoes
    expect(seg.find((s) => s.id === alvo.id)?.aceita).toBe(true)
    expect(seg.filter((s) => s.id !== alvo.id).every((s) => !s.aceita)).toBe(true)
  })

  it('editar ajusta horário e título mantendo a sugestão como rascunho', () => {
    const proposta = propostaBase()
    const alvo = proposta.dias[0].sugestoes.find((s) => s.origem === 'trabalho')!

    const atualizada = editarSugestao(proposta, alvo.id, {
      titulo: 'Trabalho focado',
      inicio: '09:00',
      fim: '17:00',
    })

    const editada = atualizada.dias[0].sugestoes.find((s) => s.id === alvo.id)
    expect(editada).toMatchObject({
      titulo: 'Trabalho focado',
      inicio: '09:00',
      fim: '17:00',
    })
  })

  it('editar permite esvaziar o horário de volta para a confirmar', () => {
    const proposta = propostaBase()
    const alvo = proposta.dias[0].sugestoes.find((s) => s.origem === 'trabalho')!

    const atualizada = editarSugestao(proposta, alvo.id, { inicio: null, fim: null })

    const editada = atualizada.dias[0].sugestoes.find((s) => s.id === alvo.id)
    expect(editada).toMatchObject({ inicio: null, fim: null })
  })

  it('rejeita edição com fim anterior ao início', () => {
    const proposta = propostaBase()
    const alvo = proposta.dias[0].sugestoes[0]

    expect(() => editarSugestao(proposta, alvo.id, { inicio: '15:00', fim: '09:00' })).toThrow(
      SchemaInvalidoError
    )
  })

  it('remover retira a sugestão do rascunho', () => {
    const proposta = propostaBase()
    const alvo = proposta.dias[0].sugestoes[0]
    const total = proposta.dias[0].sugestoes.length

    const atualizada = removerSugestao(proposta, alvo.id)

    expect(atualizada.dias[0].sugestoes).toHaveLength(total - 1)
    expect(atualizada.dias[0].sugestoes.some((s) => s.id === alvo.id)).toBe(false)
  })

  it('editar ou remover item fixo exige confirmação explícita', () => {
    const proposta = propostaBase()
    const terapia = proposta.dias.flatMap((d) => d.sugestoes).find((s) => s.titulo === 'Terapia')!

    expect(() => removerSugestao(proposta, terapia.id)).toThrow(ConfirmacaoFixoError)
    expect(() => editarSugestao(proposta, terapia.id, { inicio: '19:00' })).toThrow(
      ConfirmacaoFixoError
    )

    const removida = removerSugestao(proposta, terapia.id, true)
    expect(removida.dias.flatMap((d) => d.sugestoes).some((s) => s.id === terapia.id)).toBe(false)
  })

  it('editar substitui a explicação por nota de edição manual', () => {
    const proposta = propostaBase()
    const alvo = proposta.dias[0].sugestoes.find((s) => s.origem === 'trabalho')!

    const atualizada = editarSugestao(proposta, alvo.id, { inicio: '09:00' })

    const editada = atualizada.dias[0].sugestoes.find((s) => s.id === alvo.id)
    expect(editada!.explicacao).toMatch(/editada manualmente/i)
  })

  it('operar em sugestão inexistente devolve erro de item ausente', () => {
    const proposta = propostaBase()

    expect(() => removerSugestao(proposta, 'nao-existe')).toThrow(ItemNaoEncontradoError)
    expect(() => aceitarSugestao(proposta, 'nao-existe')).toThrow(ItemNaoEncontradoError)
  })

  it('confirmar registra a data de aprovação', () => {
    const proposta = propostaBase()
    const confirmacao = new Date('2026-10-12T20:00:00Z')

    const aprovada = confirmarProposta(proposta, confirmacao)

    expect(aprovada.confirmadaEm).toBe(confirmacao.toISOString())
    for (const d of aprovada.dias) {
      expect(d.sugestoes.every((s) => s.aceita)).toBe(true)
    }
  })

  it('sobrevive a serialização e validação como estado persistido', () => {
    const proposta = propostaBase()
    const serializada = JSON.parse(JSON.stringify(proposta))

    expect(validarProposta(serializada)).toEqual(proposta)
  })
})
