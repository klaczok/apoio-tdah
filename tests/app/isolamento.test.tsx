/** @jest-environment node */

process.env.PERSISTENCE_DRIVER = 'memory'
process.env.SESSION_SECRET = 'segredo-de-teste-com-entropia-suficiente'

import { POST as postNotas } from '@/app/api/notas/dia/route'
import { POST as postRotina } from '@/app/api/rotina/[etapa]/route'
import { POST as postProposta } from '@/app/api/proposta/route'
import { POST as postDia } from '@/app/api/dia/route'
import { getStateStore } from '@/server/persistence'
import { estadoVazio, type EstadoPrivado } from '@/server/persistence/estado'
import { gerarInstanciaDiaria } from '@/server/dia/gerar'
import { gerarPropostaSemanal } from '@/server/proposta/gerar'
import { confirmarProposta } from '@/server/proposta/modelo'
import {
  acrescentarCompromisso,
  definirTrabalho,
  rotinaVazia,
  type RotinaRecorrente,
} from '@/server/rotina/modelo'
import { dataCivilHoje, diaSemanaDe } from '@/server/tempo'
import { autenticarComo, autenticarComoLegado, limparSessao } from '../helpers/sessao'

const ALICE = 'u-alice'
const BOB = 'u-bob'

function formPost(url: string, campos: Record<string, string | string[]>) {
  const corpo = new URLSearchParams()
  for (const [chave, valor] of Object.entries(campos)) {
    for (const v of Array.isArray(valor) ? valor : [valor]) corpo.append(chave, v)
  }
  return new Request(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: corpo,
  })
}

const rotinaPost = (etapa: string, campos: Record<string, string | string[]>) =>
  postRotina(formPost(`/api/rotina/${etapa}`, campos), {
    params: Promise.resolve({ etapa }),
  })

async function estadoDe(usuarioId: string): Promise<EstadoPrivado> {
  const lido = await (await getStateStore(usuarioId)).load()
  if (!lido.ok) throw new Error(`store indisponível para ${usuarioId}`)
  return lido.value.dados
}

async function salvar(usuarioId: string, dados: EstadoPrivado): Promise<void> {
  const store = await getStateStore(usuarioId)
  const lido = await store.load()
  if (!lido.ok) throw new Error('store indisponível')
  const salvo = await store.save(dados, lido.value.version)
  if (!salvo.ok) throw new Error(`falha ao gravar: ${JSON.stringify(salvo.error)}`)
}

function rotinaComCompromisso(hoje: string): RotinaRecorrente {
  return acrescentarCompromisso(
    definirTrabalho(rotinaVazia(), {
      diasSemana: ['seg', 'ter', 'qua', 'qui', 'sex'],
      horasPadrao: 6,
      limiteExcepcional: 8,
    }),
    {
      titulo: 'Consulta',
      diaSemana: diaSemanaDe(hoje),
      inicio: '10:00',
      duracaoMin: 30,
      categoria: 'saude',
      tipo: 'fixo',
    }
  )
}

describe('isolamento do EstadoPrivado por usuário autenticado', () => {
  beforeEach(() => limparSessao())

  it('primeira leitura de cada conta retorna estado vazio independente', async () => {
    expect(await estadoDe(ALICE)).toEqual(estadoVazio())
    expect(await estadoDe(BOB)).toEqual(estadoVazio())
  })

  it('rotina recorrente gravada por uma conta não aparece na outra', async () => {
    await autenticarComo(ALICE)
    const resposta = await rotinaPost('trabalho', {
      dias: ['seg', 'qua'],
      horasPadrao: '6',
      limiteExcepcional: '8',
    })
    expect(resposta.status).toBe(303)

    const alice = await estadoDe(ALICE)
    expect(alice.rotina.trabalho?.diasSemana).toEqual(['seg', 'qua'])
    expect((await estadoDe(BOB)).rotina.trabalho).toBeNull()
  })

  it('proposta semanal e semana ativa são independentes por conta', async () => {
    const hoje = dataCivilHoje()
    const rotina = rotinaComCompromisso(hoje)
    await salvar(ALICE, { ...estadoVazio(), rotina })

    await autenticarComo(ALICE)
    expect((await postProposta(formPost('/api/proposta', { acao: 'gerar' }))).status).toBe(303)
    expect((await estadoDe(ALICE)).propostaSemanal).not.toBeNull()
    expect((await estadoDe(BOB)).propostaSemanal).toBeNull()

    expect((await postProposta(formPost('/api/proposta', { acao: 'confirmar' }))).status).toBe(303)
    expect((await estadoDe(ALICE)).semanaAtiva).not.toBeNull()
    expect((await estadoDe(BOB)).semanaAtiva).toBeNull()
  })

  it('instância diária e revisão de uma conta não vazam para outra', async () => {
    const hoje = dataCivilHoje()
    const rotina = rotinaComCompromisso(hoje)
    const proposta = gerarPropostaSemanal(rotina)
    const semana = confirmarProposta(proposta, new Date())
    const instancia = gerarInstanciaDiaria(semana, rotina, hoje, 1)
    await salvar(ALICE, {
      ...estadoVazio(),
      rotina,
      semanaAtiva: semana,
      dias: { [hoje]: instancia },
    })
    if (!instancia.itens.length) throw new Error('fixture sem itens')

    await autenticarComo(ALICE)
    const revisao = await postDia(
      formPost('/api/dia', {
        acao: 'revisar-item',
        data: hoje,
        id: instancia.itens[0]!.id,
        estado: 'realizado',
      })
    )
    expect(revisao.status).toBe(303)

    const alice = await estadoDe(ALICE)
    expect(alice.dias[hoje]!.revisao.estados[instancia.itens[0]!.id]).toBe('realizado')
    expect((await estadoDe(BOB)).dias[hoje]).toBeUndefined()
  })

  it('nota do dia de uma conta não aparece na outra', async () => {
    await autenticarComo(ALICE)
    await postNotas(formPost('/api/notas/dia', { data: '2026-10-09', nota: 'só da alice' }))

    expect((await estadoDe(ALICE)).notasPorDia['2026-10-09']).toBe('só da alice')
    expect((await estadoDe(BOB)).notasPorDia['2026-10-09']).toBeUndefined()
  })

  it('userId enviado pelo cliente nunca é fonte de autoridade', async () => {
    await autenticarComo(ALICE)
    await postNotas(
      formPost('/api/notas/dia', { data: '2026-10-09', nota: 'tentativa', userId: BOB })
    )

    expect((await estadoDe(ALICE)).notasPorDia['2026-10-09']).toBe('tentativa')
    expect((await estadoDe(BOB)).notasPorDia['2026-10-09']).toBeUndefined()
  })

  it('sessão ausente não cai em usuário padrão nem grava no registro legado', async () => {
    limparSessao()

    const resposta = await postNotas(
      formPost('/api/notas/dia', { data: '2026-10-12', nota: 'sem sessão' })
    )

    expect(resposta.status).toBe(303)
    expect(resposta.headers.get('location')).toBe('/login')
    for (const conta of [ALICE, BOB]) {
      expect((await estadoDe(conta)).notasPorDia['2026-10-12']).toBeUndefined()
    }
  })

  it('a conta legada continua no registro único durante a transição', async () => {
    await autenticarComoLegado()
    await postNotas(formPost('/api/notas/dia', { data: '2026-10-09', nota: 'do legado' }))

    // O legado compartilha a linha histórica 'usuario' — mapeada em
    // proprietarioDoEstado — até a migração explícita do spec seção 8.
    const legado = await estadoDe('usuario-unico')
    expect(legado.notasPorDia['2026-10-09']).toBe('do legado')
  })
})
