/** @jest-environment node */

import { POST } from '@/app/api/dia/route'
import { getStateStore } from '@/server/persistence'
import { estadoVazio } from '@/server/persistence/estado'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import { confirmarProposta } from '@/server/proposta/modelo'
import { dataCivilAmanha, diaSemanaDe } from '@/server/tempo'
import {
  acrescentarCompromisso,
  definirSono,
  definirTrabalho,
  rotinaVazia,
  type RotinaRecorrente,
} from '@/server/rotina/modelo'

process.env.PERSISTENCE_DRIVER = 'memory'

function requisicao(campos: Record<string, string>) {
  const corpo = new URLSearchParams()
  for (const [chave, valor] of Object.entries(campos)) corpo.append(chave, valor)
  const req = new Request('http://localhost/api/dia', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: corpo,
  })
  return POST(req)
}

async function estadoAtual() {
  const lido = await (await getStateStore()).load()
  if (!lido.ok) throw new Error('store indisponível no teste')
  return lido.value
}

async function comSemanaConfirmada(extra?: (r: RotinaRecorrente) => RotinaRecorrente) {
  const store = await getStateStore()
  const lido = await store.load()
  if (!lido.ok) throw new Error('store indisponível no teste')
  let rotina = definirSono(rotinaVazia(), { dormir: '23:00', acordar: '07:00' })
  rotina = definirTrabalho(rotina, {
    diasSemana: [...new Set(['seg', 'ter', 'qua', 'qui', 'sex', diaSemanaDe(dataCivilAmanha())])],
    horasPadrao: 8,
    limiteExcepcional: 10,
  })
  rotina = acrescentarCompromisso(rotina, {
    titulo: 'Terapia',
    diaSemana: 'qui',
    inicio: '18:00',
    duracaoMin: 50,
    categoria: 'saude',
    tipo: 'fixo',
  })
  if (extra) rotina = extra(rotina)
  const semana = confirmarProposta(gerarPropostaSemanal(rotina), new Date('2026-10-12T12:00:00Z'))
  await store.save({ ...estadoVazio(), rotina, semanaAtiva: semana }, lido.value.version)
  return rotina
}

describe('POST /api/dia', () => {
  it('planejar materializa amanhã a partir da semana ativa', async () => {
    const rotina = await comSemanaConfirmada()

    const resposta = await requisicao({ acao: 'planejar' })

    expect(resposta.status).toBe(303)
    expect(resposta.headers.get('location')).toBe('/amanha?planejado=1')
    const estado = await estadoAtual()
    const amanha = dataCivilAmanha()
    const instancia = estado.dados.dias[amanha]
    expect(instancia).toBeDefined()
    expect(instancia.confirmadaEm).toBeNull()
    expect(instancia.versaoBase).toBeGreaterThanOrEqual(0)
    expect(estado.dados.rotina).toEqual(rotina)
    expect(estado.dados.semanaAtiva).not.toBeNull()
  })

  it('planejar sem semana ativa devolve erro factual', async () => {
    const store = await getStateStore()
    const lido = await store.load()
    if (!lido.ok) throw new Error('store indisponível no teste')
    await store.save(estadoVazio(), lido.value.version)

    const resposta = await requisicao({ acao: 'planejar' })

    expect(resposta.headers.get('location')).toMatch(/\/amanha\?erro=/)
  })

  it('ajustar move um item flexível sem tocar a semana ativa', async () => {
    await comSemanaConfirmada()
    await requisicao({ acao: 'planejar' })
    const amanha = dataCivilAmanha()
    const instancia = (await estadoAtual()).dados.dias[amanha]
    const trabalho = instancia.itens.find((s) => s.origem === 'trabalho')!

    const resposta = await requisicao({
      acao: 'ajustar',
      data: amanha,
      id: trabalho.id,
      inicio: '10:00',
    })

    expect(resposta.headers.get('location')).toBe('/amanha?salvo=1')
    const estado = await estadoAtual()
    expect(estado.dados.dias[amanha].itens.find((s) => s.id === trabalho.id)!.inicio).toBe('10:00')
    const diaSemana = estado.dados.semanaAtiva!.dias.find(
      (d) => d.diaSemana === instancia.diaSemana
    )!
    expect(diaSemana.sugestoes.find((s) => s.origem === 'trabalho')!.inicio).not.toBe('10:00')
  })

  it('ajustar item fixo sem confirmação devolve pedido de confirmação', async () => {
    const amanha = dataCivilAmanha()
    await comSemanaConfirmada((r) =>
      acrescentarCompromisso(r, {
        titulo: 'Plantão',
        diaSemana: diaSemanaDe(amanha),
        inicio: '14:00',
        duracaoMin: 60,
        categoria: 'trabalho',
        tipo: 'fixo',
      })
    )
    await requisicao({ acao: 'planejar' })
    const instancia = (await estadoAtual()).dados.dias[amanha]
    const fixo = instancia.itens.find((s) => s.protecao === 'fixo')!

    const resposta = await requisicao({
      acao: 'ajustar',
      data: amanha,
      id: fixo.id,
      inicio: '06:00',
    })

    expect(resposta.headers.get('location')).toBe('/amanha?erro=confirmacao')
    expect(
      (await estadoAtual()).dados.dias[amanha].itens.find((s) => s.id === fixo.id)!.inicio
    ).toBe('14:00')
  })

  it('confirmar persiste a instância com a versão dos dados usada', async () => {
    await comSemanaConfirmada()
    await requisicao({ acao: 'planejar' })
    const amanha = dataCivilAmanha()
    const rascunho = (await estadoAtual()).dados.dias[amanha]

    const resposta = await requisicao({ acao: 'confirmar', data: amanha })

    expect(resposta.headers.get('location')).toBe('/amanha?confirmado=1')
    const instancia = (await estadoAtual()).dados.dias[amanha]
    expect(instancia.confirmadaEm).not.toBeNull()
    expect(instancia.versaoBase).toBe(rascunho.versaoBase)
  })

  it('ajustar depois de confirmado devolve erro e não altera o dia', async () => {
    await comSemanaConfirmada()
    await requisicao({ acao: 'planejar' })
    const amanha = dataCivilAmanha()
    await requisicao({ acao: 'confirmar', data: amanha })
    const instancia = (await estadoAtual()).dados.dias[amanha]
    const item = instancia.itens.find((s) => s.inicio !== null)!

    const resposta = await requisicao({
      acao: 'ajustar',
      data: amanha,
      id: item.id,
      inicio: '05:00',
    })

    expect(resposta.headers.get('location')).toMatch(/\/amanha\?erro=/)
    expect(
      (await estadoAtual()).dados.dias[amanha].itens.find((s) => s.id === item.id)!.inicio
    ).toBe(item.inicio)
  })

  it('promover persiste prioridade; a quarta pede substituição sem alterar nada', async () => {
    const amanha = dataCivilAmanha()
    const diaAmanha = diaSemanaDe(amanha)
    await comSemanaConfirmada((r) => {
      let rr = r
      for (const [i, titulo] of ['Exame', 'Consulta', 'Reunião'].entries()) {
        rr = acrescentarCompromisso(rr, {
          titulo,
          diaSemana: diaAmanha,
          inicio: `${String(9 + i).padStart(2, '0')}:00`,
          duracaoMin: 30,
          categoria: 'saude',
          tipo: i === 0 ? 'fixo' : 'flexivel',
        })
      }
      return rr
    })
    await requisicao({ acao: 'planejar' })
    const itens = (await estadoAtual()).dados.dias[amanha].itens

    await requisicao({ acao: 'promover', data: amanha, id: itens[0].id })
    expect((await estadoAtual()).dados.dias[amanha].prioridades).toEqual([itens[0].id])

    for (const item of itens.slice(1, 3)) {
      await requisicao({ acao: 'promover', data: amanha, id: item.id })
    }
    const resposta = await requisicao({ acao: 'promover', data: amanha, id: itens[3].id })

    expect(resposta.headers.get('location')).toBe(`/amanha?substituir=${itens[3].id}`)
    expect((await estadoAtual()).dados.dias[amanha].prioridades).toHaveLength(3)
  })

  it('substituir troca a prioridade escolhida', async () => {
    const amanha = dataCivilAmanha()
    const diaAmanha = diaSemanaDe(amanha)
    await comSemanaConfirmada((r) => {
      let rr = r
      for (const [i, titulo] of ['Exame', 'Consulta', 'Reunião'].entries()) {
        rr = acrescentarCompromisso(rr, {
          titulo,
          diaSemana: diaAmanha,
          inicio: `${String(9 + i).padStart(2, '0')}:00`,
          duracaoMin: 30,
          categoria: 'saude',
          tipo: 'flexivel',
        })
      }
      return rr
    })
    await requisicao({ acao: 'planejar' })
    const itens = (await estadoAtual()).dados.dias[amanha].itens
    for (const item of itens.slice(0, 3)) {
      await requisicao({ acao: 'promover', data: amanha, id: item.id })
    }

    const resposta = await requisicao({
      acao: 'substituir',
      data: amanha,
      novo: itens[3].id,
      antigo: itens[1].id,
    })

    expect(resposta.headers.get('location')).toBe('/amanha?salvo=1')
    const instancia = (await estadoAtual()).dados.dias[amanha]
    expect(instancia.prioridades).toEqual([itens[0].id, itens[3].id, itens[2].id])
  })

  it('despromover remove a marca sem apagar o item', async () => {
    await comSemanaConfirmada()
    await requisicao({ acao: 'planejar' })
    const amanha = dataCivilAmanha()
    const itens = (await estadoAtual()).dados.dias[amanha].itens
    await requisicao({ acao: 'promover', data: amanha, id: itens[0].id })

    await requisicao({ acao: 'despromover', data: amanha, id: itens[0].id })

    const instancia = (await estadoAtual()).dados.dias[amanha]
    expect(instancia.prioridades).toEqual([])
    expect(instancia.itens.some((i) => i.id === itens[0].id)).toBe(true)
  })

  it('confirmar com alertas exige reconhecimento consciente', async () => {
    const amanha = dataCivilAmanha()
    await comSemanaConfirmada((r) =>
      acrescentarCompromisso(r, {
        titulo: 'Exame',
        diaSemana: diaSemanaDe(amanha),
        inicio: '09:00',
        duracaoMin: 60,
        categoria: 'saude',
        tipo: 'fixo',
      })
    )
    await requisicao({ acao: 'planejar' })
    // provoca sobreposição movendo o item flexível para cima do fixo
    const instancia = (await estadoAtual()).dados.dias[amanha]
    const flexivel = instancia.itens.find(
      (i) => i.protecao === 'flexivel' && i.inicio !== null && i.titulo === 'Trabalho'
    )!
    const fixo = instancia.itens.find((i) => i.protecao === 'fixo' && i.inicio !== null)!
    await requisicao({
      acao: 'ajustar',
      data: amanha,
      id: flexivel.id,
      inicio: fixo.inicio!,
    })

    const bloqueado = await requisicao({ acao: 'confirmar', data: amanha })
    expect(bloqueado.headers.get('location')).toMatch(/erro=/)
    expect((await estadoAtual()).dados.dias[amanha].confirmadaEm).toBeNull()

    const confirmado = await requisicao({ acao: 'confirmar', data: amanha, ciente: 'on' })
    expect(confirmado.headers.get('location')).toBe('/amanha?confirmado=1')
    expect((await estadoAtual()).dados.dias[amanha].confirmadaEm).not.toBeNull()
  })
})
