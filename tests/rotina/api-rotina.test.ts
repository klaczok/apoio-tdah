/** @jest-environment node */

import { POST } from '@/app/api/rotina/[etapa]/route'
import { getStateStore } from '@/server/persistence'
import { estadoVazio } from '@/server/persistence/estado'
import {
  acrescentarBlocoEstudo,
  acrescentarBlocoMusica,
  acrescentarCompromisso,
  rotinaVazia,
  type RotinaRecorrente,
} from '@/server/rotina/modelo'

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

  it('salva alimentação com horários editados e ocultação individual', async () => {
    const resposta = await requisicao('alimentacao', {
      'horario-cafe-da-manha': '08:45',
      'horario-almoco': '12:30',
      'horario-lanche-da-tarde': '16:00',
      'horario-jantar': '20:30',
      'oculta-lanche-da-tarde': 'on',
      dias: ['seg', 'qua', 'qui', 'sex'],
    })

    expect(resposta.status).toBe(303)
    expect(resposta.headers.get('location')).toBe('/configurar/estudo')
    const alimentacao = (await estadoAtual()).rotina.alimentacao
    expect(alimentacao?.refeicoes).toEqual([
      { ref: 'cafe-da-manha', horario: '08:45', oculta: false },
      { ref: 'almoco', horario: '12:30', oculta: false },
      { ref: 'lanche-da-tarde', horario: '16:00', oculta: true },
      { ref: 'jantar', horario: '20:30', oculta: false },
    ])
    expect(alimentacao?.diasTreino).toEqual(['seg', 'qua', 'qui', 'sex'])
  })

  it('dias de treino não informados permanecem a confirmar', async () => {
    await requisicao('alimentacao', {
      'horario-cafe-da-manha': '09:00',
      'horario-almoco': '12:30',
      'horario-lanche-da-tarde': '16:00',
      'horario-jantar': '20:30',
    })

    expect((await estadoAtual()).rotina.alimentacao?.diasTreino).toBeNull()
  })

  it('permite registrar explicitamente que não há dias de treino', async () => {
    await requisicao('alimentacao', {
      'horario-cafe-da-manha': '09:00',
      'horario-almoco': '12:30',
      'horario-lanche-da-tarde': '16:00',
      'horario-jantar': '20:30',
      semTreino: 'on',
    })

    expect((await estadoAtual()).rotina.alimentacao?.diasTreino).toEqual([])
  })

  it('define a meta semanal de estudo em horas convertidas', async () => {
    const resposta = await requisicao('estudo', { acao: 'meta', metaHoras: '4' })

    expect(resposta.headers.get('location')).toBe('/configurar/estudo?salvo=1')
    expect((await estadoAtual()).rotina.estudo?.metaSemanalMin).toBe(240)
  })

  it('adiciona bloco de estudo com planejado e realizado separados', async () => {
    const resposta = await requisicao('estudo', {
      acao: 'adicionar',
      tipo: 'laboratorio-case',
      diaSemana: 'sab',
      inicio: '10:00',
      planejadoMin: '90',
      realizadoMin: '45',
    })

    expect(resposta.headers.get('location')).toBe('/configurar/estudo?salvo=1')
    const bloco = (await estadoAtual()).rotina.estudo?.blocos[0]
    expect(bloco).toMatchObject({
      tipo: 'laboratorio-case',
      planejadoMin: 90,
      realizadoMin: 45,
    })
  })

  it('rejeita bloco de estudo fora das categorias previstas', async () => {
    const store = await getStateStore()
    const carregado = await store.load()
    if (!carregado.ok) throw new Error('store indisponível')
    await store.save(estadoVazio(), carregado.value.version)

    const resposta = await requisicao('estudo', {
      acao: 'adicionar',
      tipo: 'prova',
      diaSemana: 'seg',
      inicio: '19:00',
      planejadoMin: '60',
    })

    expect(resposta.headers.get('location')).toBe('/configurar/estudo?erro=entrada')
    expect((await estadoAtual()).rotina.estudo).toBeNull()
  })

  it('edita e remove bloco de estudo pela API', async () => {
    let rotina: RotinaRecorrente = acrescentarBlocoEstudo(rotinaVazia(), {
      tipo: 'teoria',
      diaSemana: 'seg',
      inicio: '19:00',
      planejadoMin: 60,
      realizadoMin: null,
    })
    const store = await getStateStore()
    const carregado = await store.load()
    if (!carregado.ok) throw new Error('store indisponível')
    await store.save({ ...estadoVazio(), rotina }, carregado.value.version)
    const id = rotina.estudo!.blocos[0].id

    const edicao = await requisicao('estudo', {
      acao: 'atualizar',
      id,
      tipo: 'revisao',
      diaSemana: 'ter',
      inicio: '20:00',
      planejadoMin: '45',
      realizadoMin: '45',
    })
    expect(edicao.headers.get('location')).toBe('/configurar/estudo?salvo=1')
    expect((await estadoAtual()).rotina.estudo?.blocos[0]).toMatchObject({
      id,
      tipo: 'revisao',
      realizadoMin: 45,
    })

    const remocao = await requisicao('estudo', { acao: 'remover', id })
    expect(remocao.headers.get('location')).toBe('/configurar/estudo?salvo=1')
    expect((await estadoAtual()).rotina.estudo?.blocos).toEqual([])
  })

  it('adiciona e remove bloco de música por tipo', async () => {
    const resposta = await requisicao('musica', {
      acao: 'adicionar',
      tipo: 'violino',
      diaSemana: 'dom',
      inicio: '11:00',
      duracaoMin: '45',
    })

    expect(resposta.headers.get('location')).toBe('/configurar/musica?salvo=1')
    const bloco = (await estadoAtual()).rotina.musica?.[0]
    expect(bloco).toMatchObject({ tipo: 'violino', duracaoMin: 45 })

    const remocao = await requisicao('musica', { acao: 'remover', id: bloco!.id })
    expect(remocao.headers.get('location')).toBe('/configurar/musica?salvo=1')
    expect((await estadoAtual()).rotina.musica).toEqual([])
  })

  it('rejeita bloco de música com tipo fora da lista', async () => {
    const resposta = await requisicao('musica', {
      acao: 'adicionar',
      tipo: 'show',
      diaSemana: 'dom',
      inicio: '11:00',
      duracaoMin: '45',
    })

    expect(resposta.headers.get('location')).toBe('/configurar/musica?erro=entrada')
  })

  it('remove bloco de música salvo sem exigir confirmação', async () => {
    const rotina = acrescentarBlocoMusica(rotinaVazia(), {
      tipo: 'composicao',
      diaSemana: 'sab',
      inicio: '15:00',
      duracaoMin: 60,
    })
    const store = await getStateStore()
    const carregado = await store.load()
    if (!carregado.ok) throw new Error('store indisponível')
    await store.save({ ...estadoVazio(), rotina }, carregado.value.version)
    const id = rotina.musica![0].id

    const resposta = await requisicao('musica', { acao: 'remover', id })
    expect(resposta.headers.get('location')).toBe('/configurar/musica?salvo=1')
    expect((await estadoAtual()).rotina.musica).toEqual([])
  })

  it('remoção de id inexistente informa ausência em vez de formato inválido', async () => {
    const resposta = await requisicao('periodos', { acao: 'remover', id: 'sumiu' })
    expect(resposta.headers.get('location')).toBe('/configurar/periodos?erro=ausente')
  })
})
