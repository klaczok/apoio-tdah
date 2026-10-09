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
})
