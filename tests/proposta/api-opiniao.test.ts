/** @jest-environment node */

import { POST } from '@/app/api/proposta/opiniao/route'
import { getStateStore } from '@/server/persistence'
import { estadoVazio } from '@/server/persistence/estado'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import { definirSono, rotinaVazia } from '@/server/rotina/modelo'
import type { ResultadoConselho } from '@/server/ia'

import { autenticarComo, USUARIO_TESTE } from '../helpers/sessao'

process.env.PERSISTENCE_DRIVER = 'memory'
process.env.INTERPRETADOR_DRIVER = 'fake'

const globalIA = globalThis as {
  __respostaConselhoIA?: ResultadoConselho
  __entradaConselhoIA?: { resumoSemana: string; dor: string }
}

beforeEach(async () => {
  delete globalIA.__respostaConselhoIA
  delete globalIA.__entradaConselhoIA
  await autenticarComo()
  // Estado compartilhado entre testes do arquivo — recomeça sempre vazio.
  const store = await getStateStore(USUARIO_TESTE)
  const lido = await store.load()
  if (!lido.ok) throw new Error('store indisponível no teste')
  await store.save(estadoVazio(), lido.value.version)
})

function requisicao(campos: Record<string, string>) {
  const corpo = new URLSearchParams()
  for (const [chave, valor] of Object.entries(campos)) corpo.append(chave, valor)
  const req = new Request('http://localhost/api/proposta/opiniao', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: corpo,
  })
  return POST(req)
}

async function estadoAtual() {
  const lido = await (await getStateStore(USUARIO_TESTE)).load()
  if (!lido.ok) throw new Error('store indisponível no teste')
  return lido.value.dados
}

async function comSemanaGerada() {
  const store = await getStateStore(USUARIO_TESTE)
  const lido = await store.load()
  if (!lido.ok) throw new Error('store indisponível no teste')
  const rotina = definirSono(rotinaVazia(), { dormir: '23:00', acordar: '07:00' })
  const propostaSemanal = gerarPropostaSemanal(rotina)
  await store.save({ ...estadoVazio(), rotina, propostaSemanal }, lido.value.version)
}

describe('POST /api/proposta/opiniao', () => {
  it('persiste a opinião sem tocar a proposta', async () => {
    await comSemanaGerada()
    const antes = await estadoAtual()
    globalIA.__respostaConselhoIA = {
      ok: true,
      texto: 'Blocos protegidos primeiro.\n\nDescanso antes da sexta.',
    }

    const resposta = await requisicao({ dor: 'dias apertados demais' })

    expect(resposta.status).toBe(303)
    expect(resposta.headers.get('location')).toContain('/proposta?opiniao=1')
    const depois = await estadoAtual()
    expect(depois.opiniaoIA?.texto).toContain('Blocos protegidos primeiro.')
    expect(depois.opiniaoIA?.dor).toBe('dias apertados demais')
    expect(depois.propostaSemanal).toEqual(antes.propostaSemanal)
    expect(globalIA.__entradaConselhoIA?.resumoSemana).toContain('Seg')
    expect(globalIA.__entradaConselhoIA?.dor).toBe('dias apertados demais')
  })

  it('recusa quando não há semana montada', async () => {
    globalIA.__respostaConselhoIA = { ok: true, texto: 'qualquer' }

    const resposta = await requisicao({ dor: 'não sei por onde começar' })

    expect(resposta.headers.get('location')).toContain('/proposta?erro=entrada')
    expect((await estadoAtual()).opiniaoIA).toBeNull()
  })

  it('recusa dor vazia sem chamar a IA', async () => {
    await comSemanaGerada()

    const resposta = await requisicao({ dor: '   ' })

    expect(resposta.headers.get('location')).toContain('/proposta?erro=entrada')
    expect(globalIA.__entradaConselhoIA).toBeUndefined()
    expect((await estadoAtual()).opiniaoIA).toBeNull()
  })

  it('falha da IA não grava nada e avisa na página', async () => {
    await comSemanaGerada()
    globalIA.__respostaConselhoIA = { ok: false, motivo: 'indisponivel' }

    const resposta = await requisicao({ dor: 'falta pausa' })

    expect(resposta.headers.get('location')).toContain('/proposta?erro=ia')
    expect((await estadoAtual()).opiniaoIA).toBeNull()
  })
})
