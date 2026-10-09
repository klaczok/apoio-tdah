/** @jest-environment node */

import { POST } from '@/app/api/rotina/[etapa]/route'
import { getStateStore } from '@/server/persistence'
import { estadoVazio } from '@/server/persistence/estado'
import { acrescentarCompromisso, rotinaVazia } from '@/server/rotina/modelo'

process.env.PERSISTENCE_DRIVER = 'memory'

function requisicao(etapa: string, campos: Record<string, string | string[]>) {
  const corpo = new URLSearchParams()
  for (const [chave, valor] of Object.entries(campos)) {
    if (Array.isArray(valor)) valor.forEach((v) => corpo.append(chave, v))
    else corpo.append(chave, valor)
  }
  const req = new Request(`http://localhost/api/rotina/${etapa}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: corpo,
  })
  return POST(req, { params: Promise.resolve({ etapa }) })
}

async function estadoAtual() {
  const lido = await (await getStateStore()).load()
  if (!lido.ok) throw new Error('store indisponível no teste')
  return lido.value.dados
}

describe('POST /api/rotina/:etapa', () => {
  it('salva a etapa trabalho e avança para a próxima', async () => {
    const resposta = await requisicao('trabalho', {
      dias: ['seg', 'ter', 'qua', 'qui', 'sex'],
      horasPadrao: '8',
      limiteExcepcional: '10',
    })

    expect(resposta.status).toBe(303)
    expect(resposta.headers.get('location')).toBe('/configurar/presencial')
    const rotina = (await estadoAtual()).rotina
    expect(rotina.trabalho?.horasPadrao).toBe(8)
  })

  it('mantém a configuração salva após nova leitura, como em recarregar', async () => {
    await requisicao('sono', { dormir: '23:00', acordar: '07:00' })

    const rotina = (await estadoAtual()).rotina
    expect(rotina.sono).toEqual({ dormir: '23:00', acordar: '07:00' })
  })

  it('campos vazios ficam a confirmar em vez de inventados', async () => {
    await requisicao('presencial', { dias: 'qua' })

    const presencial = (await estadoAtual()).rotina.presencial
    expect(presencial?.diasSemana).toEqual(['qua'])
    expect(presencial?.chegadaLimite).toBeNull()
    expect(presencial?.deslocamentoMin).toBeNull()
  })

  it('adiciona compromisso flexível e permanece na etapa', async () => {
    const resposta = await requisicao('compromissos', {
      acao: 'adicionar',
      titulo: 'Violão',
      diaSemana: 'sab',
      inicio: '10:00',
      duracaoMin: '40',
      categoria: 'musica',
      tipo: 'flexivel',
    })

    expect(resposta.headers.get('location')).toBe('/configurar/compromissos?salvo=1')
    expect((await estadoAtual()).rotina.compromissos?.[0]).toMatchObject({
      titulo: 'Violão',
      tipo: 'flexivel',
    })
  })

  it('recusa remoção de compromisso fixo sem confirmação', async () => {
    const rotina = acrescentarCompromisso(rotinaVazia(), {
      titulo: 'Terapia',
      diaSemana: 'qui',
      inicio: '18:30',
      duracaoMin: 50,
      categoria: 'saude',
      tipo: 'fixo',
    })
    const store = await getStateStore()
    const carregado = await store.load()
    if (!carregado.ok) throw new Error('store indisponível')
    await store.save({ ...estadoVazio(), rotina }, carregado.value.version)
    const id = rotina.compromissos![0].id

    const resposta = await requisicao('compromissos', { acao: 'remover', id })

    expect(resposta.headers.get('location')).toBe('/configurar/compromissos?erro=confirmacao')
    expect((await estadoAtual()).rotina.compromissos).toHaveLength(1)
  })

  it('remove compromisso fixo com confirmação explícita', async () => {
    const rotina = acrescentarCompromisso(rotinaVazia(), {
      titulo: 'Terapia',
      diaSemana: 'qui',
      inicio: '18:30',
      duracaoMin: 50,
      categoria: 'saude',
      tipo: 'fixo',
    })
    const store = await getStateStore()
    const carregado = await store.load()
    if (!carregado.ok) throw new Error('store indisponível')
    await store.save({ ...estadoVazio(), rotina }, carregado.value.version)
    const id = rotina.compromissos![0].id

    const resposta = await requisicao('compromissos', {
      acao: 'remover',
      id,
      confirmar: 'on',
    })

    expect(resposta.headers.get('location')).toBe('/configurar/compromissos?salvo=1')
    expect((await estadoAtual()).rotina.compromissos).toEqual([])
  })

  it('entrada inválida retorna erro factual na etapa', async () => {
    const resposta = await requisicao('trabalho', {
      horasPadrao: '8',
      limiteExcepcional: '99',
    })

    expect(resposta.headers.get('location')).toBe('/configurar/trabalho?erro=entrada')
  })

  it('etapa desconhecida responde 404 sem gravar nada', async () => {
    const resposta = await requisicao('nada', { campo: 'x' })
    expect(resposta.status).toBe(404)
  })

  it('remoção de id inexistente informa ausência em vez de formato inválido', async () => {
    const resposta = await requisicao('periodos', { acao: 'remover', id: 'sumiu' })
    expect(resposta.headers.get('location')).toBe('/configurar/periodos?erro=ausente')
  })
})
