/** @jest-environment node */

import { POST } from '@/app/api/dia/route'
import { getStateStore } from '@/server/persistence'
import { estadoVazio } from '@/server/persistence/estado'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import { confirmarProposta } from '@/server/proposta/modelo'
import { gerarInstanciaDiaria } from '@/server/dia/gerar'
import { dataCivilAmanha, dataCivilHoje, diaSemanaDe } from '@/server/tempo'
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

async function comDiaHoje() {
  const hoje = dataCivilHoje()
  await comSemanaConfirmada((r) =>
    acrescentarCompromisso(r, {
      titulo: 'Consulta',
      diaSemana: diaSemanaDe(hoje),
      inicio: '10:00',
      duracaoMin: 30,
      categoria: 'saude',
      tipo: 'fixo',
    })
  )
  const store = await getStateStore()
  const lido = await store.load()
  if (!lido.ok) throw new Error('store indisponível no teste')
  const instancia = gerarInstanciaDiaria(
    lido.value.dados.semanaAtiva!,
    lido.value.dados.rotina,
    hoje,
    lido.value.version
  )
  await store.save(
    { ...lido.value.dados, dias: { ...lido.value.dados.dias, [hoje]: instancia } },
    lido.value.version
  )
  return { hoje, instancia }
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

  it('cria, agenda e remove tarefa com confirmação', async () => {
    await comSemanaConfirmada()
    await requisicao({ acao: 'planejar' })
    const amanha = dataCivilAmanha()

    await requisicao({
      acao: 'tarefa-criar',
      data: amanha,
      titulo: 'Ligar para o banco',
      categoria: 'pessoal',
    })
    let instancia = (await estadoAtual()).dados.dias[amanha]
    const tarefa = instancia.tarefas.find((t) => t.titulo === 'Ligar para o banco')!
    expect(tarefa.inicio).toBeNull()

    await requisicao({
      acao: 'tarefa-editar',
      data: amanha,
      id: tarefa.id,
      inicio: '16:00',
      fim: '16:30',
    })
    instancia = (await estadoAtual()).dados.dias[amanha]
    expect(instancia.tarefas[0].inicio).toBe('16:00')

    const semConfirmar = await requisicao({ acao: 'tarefa-remover', data: amanha, id: tarefa.id })
    expect(semConfirmar.headers.get('location')).toMatch(/erro=confirmacao/)
    expect((await estadoAtual()).dados.dias[amanha].tarefas).toHaveLength(1)

    await requisicao({
      acao: 'tarefa-remover',
      data: amanha,
      id: tarefa.id,
      confirmar: 'on',
    })
    expect((await estadoAtual()).dados.dias[amanha].tarefas).toHaveLength(0)
  })

  it('divide tarefa em partes rastreáveis e registra nota do dia', async () => {
    await comSemanaConfirmada()
    await requisicao({ acao: 'planejar' })
    const amanha = dataCivilAmanha()
    await requisicao({
      acao: 'tarefa-criar',
      data: amanha,
      titulo: 'Arrumar quarto',
      categoria: 'pessoal',
    })
    const instancia = (await estadoAtual()).dados.dias[amanha]
    const tarefa = instancia.tarefas[0]

    await requisicao({
      acao: 'tarefa-dividir',
      data: amanha,
      id: tarefa.id,
      partes: 'Roupas\nLivros',
    })
    await requisicao({ acao: 'nota-dia', data: amanha, nota: 'Dia cheio' })

    const atual = (await estadoAtual()).dados.dias[amanha]
    expect(atual.tarefas).toHaveLength(3)
    expect(atual.tarefas.filter((t) => t.origemId === tarefa.id)).toHaveLength(2)
    expect(atual.notaDia).toBe('Dia cheio')
  })
})

describe('POST /api/dia — revisão', () => {
  it('registra estado factual de um item do dia', async () => {
    const { hoje, instancia } = await comDiaHoje()
    const item = instancia.itens[0]

    const resposta = await requisicao({
      acao: 'revisar-item',
      data: hoje,
      id: item.id,
      estado: 'parcial',
    })

    expect(resposta.headers.get('location')).toBe('/hoje?estado=1')
    const atual = (await estadoAtual()).dados.dias[hoje]
    expect(atual.revisao.estados[item.id]).toBe('parcial')
    expect(atual.itens.find((i) => i.id === item.id)!.inicio).toBe(item.inicio)
  })

  it('estado fora do conjunto devolve erro de entrada', async () => {
    const { hoje, instancia } = await comDiaHoje()

    const resposta = await requisicao({
      acao: 'revisar-item',
      data: hoje,
      id: instancia.itens[0].id,
      estado: 'pulado',
    })

    expect(resposta.headers.get('location')).toMatch(/erro=entrada|erro=dados/)
  })

  it('conclui a revisão sem campos reflexivos e persiste', async () => {
    const { hoje } = await comDiaHoje()

    const resposta = await requisicao({ acao: 'revisar-concluir', data: hoje })

    expect(resposta.headers.get('location')).toBe('/hoje?revisado=1')
    expect((await estadoAtual()).dados.dias[hoje].revisao.concluidaEm).not.toBeNull()
  })

  it('persiste energia, sobrecarga, motivo e nota opcionais', async () => {
    const { hoje } = await comDiaHoje()

    await requisicao({
      acao: 'revisar-concluir',
      data: hoje,
      energia: 'alta',
      sobrecarga: 'leve',
      motivo: 'chuva',
      nota: 'dia tranquilo',
    })

    const revisao = (await estadoAtual()).dados.dias[hoje].revisao
    expect(revisao.energia).toBe('alta')
    expect(revisao.sobrecarga).toBe('leve')
    expect(revisao.motivo).toBe('chuva')
    expect(revisao.nota).toBe('dia tranquilo')
  })
})

describe('POST /api/dia — destino das pendências', () => {
  it('manter registra a decisão sem reagendar nada', async () => {
    const { hoje, instancia } = await comDiaHoje()
    const item = instancia.itens[0]

    const resposta = await requisicao({
      acao: 'pendencia-decidir',
      data: hoje,
      id: item.id,
      tipo: 'manter',
    })

    expect(resposta.headers.get('location')).toBe('/hoje?decisao=1')
    const estado = await estadoAtual()
    expect(estado.dados.dias[hoje].revisao.decisoes[item.id].tipo).toBe('manter')
    // Nenhuma outra instância foi criada e o item não foi movido.
    expect(Object.keys(estado.dados.dias)).toEqual([hoje])
    expect(estado.dados.dias[hoje].itens).toEqual(instancia.itens)
  })

  it('trocar de dia sem confirmação devolve pedido de confirmação', async () => {
    const { hoje, instancia } = await comDiaHoje()
    const amanha = dataCivilAmanha()

    const resposta = await requisicao({
      acao: 'pendencia-decidir',
      data: hoje,
      id: instancia.itens[0].id,
      tipo: 'trocar-dia',
      destino: amanha,
    })

    expect(resposta.headers.get('location')).toBe('/hoje?erro=confirmacao-destino')
    const estado = await estadoAtual()
    expect(estado.dados.dias[hoje].revisao.decisoes).toEqual({})
    expect(estado.dados.dias[amanha]).toBeUndefined()
  })

  it('prever destino não grava nada e rejeita data que não é futura', async () => {
    const { hoje, instancia } = await comDiaHoje()
    const amanha = dataCivilAmanha()

    const resposta = await requisicao({
      acao: 'pendencia-prever',
      data: hoje,
      id: instancia.itens[0].id,
      destino: amanha,
    })

    expect(resposta.headers.get('location')).toBe(
      `/hoje?prever=${instancia.itens[0].id}&destino=${amanha}`
    )
    const estado = await estadoAtual()
    expect(Object.keys(estado.dados.dias)).toEqual([hoje])
    expect(estado.dados.dias[hoje]).toEqual(instancia)

    const passada = await requisicao({
      acao: 'pendencia-prever',
      data: hoje,
      id: instancia.itens[0].id,
      destino: hoje,
    })
    expect(passada.headers.get('location')).toBe('/hoje?erro=entrada')
  })

  it('decidir destino de item já realizado é recusado', async () => {
    const { hoje, instancia } = await comDiaHoje()
    const item = instancia.itens[0]
    await requisicao({ acao: 'revisar-item', data: hoje, id: item.id, estado: 'realizado' })

    const resposta = await requisicao({
      acao: 'pendencia-decidir',
      data: hoje,
      id: item.id,
      tipo: 'manter',
    })

    expect(resposta.headers.get('location')).toBe('/hoje?erro=entrada')
    const estado = await estadoAtual()
    expect(estado.dados.dias[hoje].revisao.decisoes).toEqual({})
  })

  it('trocar de dia confirmado registra a decisão e cria tarefa rastreável no destino', async () => {
    const { hoje, instancia } = await comDiaHoje()
    const item = instancia.itens[0]
    const amanha = dataCivilAmanha()

    const resposta = await requisicao({
      acao: 'pendencia-decidir',
      data: hoje,
      id: item.id,
      tipo: 'trocar-dia',
      destino: amanha,
      confirmar: 'on',
    })

    expect(resposta.headers.get('location')).toBe('/hoje?decisao=1')
    const estado = await estadoAtual()
    expect(estado.dados.dias[hoje].revisao.decisoes[item.id]).toMatchObject({
      tipo: 'trocar-dia',
      destino: amanha,
    })
    const destino = estado.dados.dias[amanha]
    expect(destino).toBeDefined()
    const tarefa = destino.tarefas.find((t) => t.origemId === item.id)
    expect(tarefa?.titulo).toBe(item.titulo)
    // O item de origem fica no histórico do dia, sem alteração.
    expect(estado.dados.dias[hoje].itens.find((i) => i.id === item.id)).toEqual(item)
  })

  it('dividir pendência cria partes rastreáveis vinculadas à origem', async () => {
    const { hoje, instancia } = await comDiaHoje()
    const item = instancia.itens[0]

    await requisicao({
      acao: 'pendencia-decidir',
      data: hoje,
      id: item.id,
      tipo: 'dividir',
      partes: 'Metade A\nMetade B',
    })

    const atual = (await estadoAtual()).dados.dias[hoje]
    expect(atual.revisao.decisoes[item.id].tipo).toBe('dividir')
    expect(atual.tarefas.filter((t) => t.origemId === item.id)).toHaveLength(2)
  })

  it('concluir a revisão não decide nem reagenda pendências', async () => {
    const { hoje, instancia } = await comDiaHoje()
    await requisicao({
      acao: 'revisar-item',
      data: hoje,
      id: instancia.itens[0].id,
      estado: 'reprogramado',
    })

    await requisicao({ acao: 'revisar-concluir', data: hoje })

    const estado = await estadoAtual()
    expect(estado.dados.dias[hoje].revisao.concluidaEm).not.toBeNull()
    expect(estado.dados.dias[hoje].revisao.decisoes).toEqual({})
    expect(Object.keys(estado.dados.dias)).toEqual([hoje])
  })
})
