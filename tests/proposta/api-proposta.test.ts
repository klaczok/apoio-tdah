/** @jest-environment node */

import { POST } from '@/app/api/proposta/route'
import { getStateStore } from '@/server/persistence'
import { estadoVazio } from '@/server/persistence/estado'
import {
  acrescentarCompromisso,
  definirSono,
  definirTrabalho,
  rotinaVazia,
} from '@/server/rotina/modelo'

process.env.PERSISTENCE_DRIVER = 'memory'

function requisicao(campos: Record<string, string>) {
  const corpo = new URLSearchParams()
  for (const [chave, valor] of Object.entries(campos)) corpo.append(chave, valor)
  const req = new Request('http://localhost/api/proposta', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: corpo,
  })
  return POST(req)
}

async function estadoAtual() {
  const lido = await (await getStateStore()).load()
  if (!lido.ok) throw new Error('store indisponível no teste')
  return lido.value.dados
}

async function comRotinaConfigurada() {
  const store = await getStateStore()
  const lido = await store.load()
  if (!lido.ok) throw new Error('store indisponível no teste')
  let rotina = definirSono(rotinaVazia(), { dormir: '23:00', acordar: '07:00' })
  rotina = definirTrabalho(rotina, {
    diasSemana: ['seg', 'ter', 'qua', 'qui', 'sex'],
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
  await store.save({ ...estadoVazio(), rotina }, lido.value.version)
  return rotina
}

describe('POST /api/proposta', () => {
  it('gera um rascunho a partir da rotina persistida', async () => {
    await comRotinaConfigurada()

    const resposta = await requisicao({ acao: 'gerar' })

    expect(resposta.status).toBe(303)
    expect(resposta.headers.get('location')).toBe('/proposta?gerada=1')
    const estado = await estadoAtual()
    expect(estado.propostaSemanal).not.toBeNull()
    expect(estado.propostaSemanal!.confirmadaEm).toBeNull()
    expect(estado.propostaSemanal!.dias).toHaveLength(7)
  })

  it('aceitar, editar e remover sugestões não toca na rotina recorrente', async () => {
    const rotina = await comRotinaConfigurada()
    await requisicao({ acao: 'gerar' })
    const rascunho = (await estadoAtual()).propostaSemanal!
    const alvo = rascunho.dias[0].sugestoes[0]

    await requisicao({ acao: 'aceitar', id: alvo.id })
    await requisicao({ acao: 'editar', id: alvo.id, inicio: '09:30', fim: '17:30' })
    const outra = (await estadoAtual()).propostaSemanal!.dias[1].sugestoes[0]
    await requisicao({ acao: 'remover', id: outra.id })

    const estado = await estadoAtual()
    const editada = estado.propostaSemanal!.dias[0].sugestoes.find((s) => s.id === alvo.id)
    expect(editada).toMatchObject({ aceita: true, inicio: '09:30', fim: '17:30' })
    expect(estado.propostaSemanal!.dias[1].sugestoes.some((s) => s.id === outra.id)).toBe(false)
    expect(estado.rotina).toEqual(rotina)
    expect(estado.semanaAtiva).toBeNull()
  })

  it('confirmação publica a versão aprovada sem mudar a rotina recorrente', async () => {
    const rotina = await comRotinaConfigurada()
    await requisicao({ acao: 'gerar' })

    const resposta = await requisicao({ acao: 'confirmar' })

    expect(resposta.headers.get('location')).toBe('/proposta?confirmada=1')
    const estado = await estadoAtual()
    expect(estado.semanaAtiva).not.toBeNull()
    expect(estado.semanaAtiva!.confirmadaEm).not.toBeNull()
    expect(estado.propostaSemanal).toBeNull()
    expect(estado.rotina).toEqual(rotina)
  })

  it('gerar de novo preserva a semana ativa até nova confirmação', async () => {
    await comRotinaConfigurada()
    await requisicao({ acao: 'gerar' })
    await requisicao({ acao: 'confirmar' })
    const vigente = (await estadoAtual()).semanaAtiva!

    await requisicao({ acao: 'gerar' })

    const estado = await estadoAtual()
    expect(estado.propostaSemanal).not.toBeNull()
    expect(estado.propostaSemanal!.confirmadaEm).toBeNull()
    expect(estado.semanaAtiva).toEqual(vigente)
  })

  it('remover item fixo sem confirmação devolve pedido de confirmação', async () => {
    await comRotinaConfigurada()
    await requisicao({ acao: 'gerar' })
    const terapia = (await estadoAtual())
      .propostaSemanal!.dias.flatMap((d) => d.sugestoes)
      .find((s) => s.titulo === 'Terapia')!

    const resposta = await requisicao({ acao: 'remover', id: terapia.id })

    expect(resposta.headers.get('location')).toBe('/proposta?erro=confirmacao')
    const permanece = (await estadoAtual())
      .propostaSemanal!.dias.flatMap((d) => d.sugestoes)
      .some((s) => s.id === terapia.id)
    expect(permanece).toBe(true)
  })

  it('confirmar sem rascunho devolve erro factual', async () => {
    await comRotinaConfigurada()

    const resposta = await requisicao({ acao: 'confirmar' })

    expect(resposta.status).toBe(303)
    expect(resposta.headers.get('location')).toMatch(/\/proposta\?erro=/)
    expect((await estadoAtual()).semanaAtiva).toBeNull()
  })
})
