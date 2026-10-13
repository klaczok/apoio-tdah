/** @jest-environment node */

import { POST as postGerar } from '@/app/api/entrevista/gerar/route'
import { interpretarEntrevista, normalizarInterpretacao } from '@/server/entrevista/interpretar'
import { getStateStore } from '@/server/persistence'
import { estadoVazio } from '@/server/persistence/estado'
import { ehDiaSemana } from '@/server/rotina/modelo'
import { valorSessao } from '@/server/entrevista/sessao'
import { guardarDocumento, obterDocumento, descartarDocumento } from '@/server/entrevista/documento'
import { obterRotinaInterpretada, descartarRotinaInterpretada } from '@/server/entrevista/material'
import type { ResultadoInterpretacao } from '@/server/ia/interpretador'
import { autenticarComo, consentirEntrevista, USUARIO_TESTE } from '../helpers/sessao'

process.env.PERSISTENCE_DRIVER = 'memory'
process.env.SESSION_SECRET = 'segredo-de-teste-com-entropia-suficiente'
process.env.INTERPRETADOR_DRIVER = 'fake'

const globalState = globalThis as {
  __respostaIA?: ResultadoInterpretacao
  __entradaIA?: { respostas: Record<string, unknown>; documentoTexto: string | null }
}

function respostaIA(interpretacao: Record<string, unknown>): ResultadoInterpretacao {
  return { ok: true, interpretacao }
}

async function sessaoComRespostas() {
  await autenticarComo()
  consentirEntrevista(
    await valorSessao(process.env.SESSION_SECRET!, {
      consentimento: 'geral',
      respostas: { objetivo: { selecionadas: ['estudos'], texto: 'faculdade' } },
    })
  )
  const store = await getStateStore(USUARIO_TESTE)
  const lido = await store.load()
  if (lido.ok) await store.save(estadoVazio(), lido.value.version)
}

async function estado() {
  const lido = await (await getStateStore(USUARIO_TESTE)).load()
  if (!lido.ok) throw new Error('store indisponível')
  return lido.value.dados
}

beforeEach(() => {
  delete globalState.__respostaIA
  delete globalState.__entradaIA
  delete (globalThis as { __entrevistaTeste?: string }).__entrevistaTeste
  descartarDocumento(USUARIO_TESTE)
  descartarRotinaInterpretada(USUARIO_TESTE)
})

describe('normalizarInterpretacao', () => {
  it('monta a rotina pelos validadores do domínio e converte fim em duração', () => {
    const rotina = normalizarInterpretacao({
      sono: { dormir: '23:00', acordar: '07:00' },
      trabalho: { diasSemana: ['seg', 'qua'], horasPadrao: 6, limiteExcepcional: 8 },
      compromissos: [
        {
          titulo: 'Consulta',
          diaSemana: 'ter',
          inicio: '10:00',
          fim: '10:30',
          categoria: 'saude',
          tipo: 'fixo',
        },
      ],
      preferenciaCarga: 'leve',
    })
    expect(rotina?.sono).toEqual({ dormir: '23:00', acordar: '07:00' })
    expect(rotina?.trabalho?.diasSemana).toEqual(['seg', 'qua'])
    expect(rotina?.compromissos?.[0]).toMatchObject({ duracaoMin: 30, tipo: 'fixo' })
    expect(rotina?.preferenciaCarga).toBe('leve')
  })

  it('descarta seções inválidas sem inventar dados', () => {
    const rotina = normalizarInterpretacao({
      sono: { dormir: 'hora errada', acordar: '07:00' },
      compromissos: [
        { titulo: 'Sem horário', diaSemana: 'xxx', inicio: '99:99', categoria: 'saude' },
        {
          titulo: 'Estudo',
          diaSemana: 'qui',
          inicio: '19:00',
          duracaoMin: 60,
          categoria: 'estudo',
          tipo: 'flexivel',
        },
      ],
    })
    expect(rotina?.sono).toBeNull()
    expect(rotina?.compromissos).toHaveLength(1)
    expect(rotina?.compromissos?.[0]?.titulo).toBe('Estudo')
  })

  it('interpretação sem nada utilizável retorna null', () => {
    expect(normalizarInterpretacao({})).toBeNull()
    expect(normalizarInterpretacao({ sono: { dormir: 'x', acordar: 'y' } })).toBeNull()
  })
})

describe('POST /api/entrevista/gerar', () => {
  it('gera rotina normalizada e proposta em rascunho — nunca semana ativa', async () => {
    await sessaoComRespostas()
    globalState.__respostaIA = respostaIA({
      sono: { dormir: '23:00', acordar: '07:00' },
      trabalho: {
        diasSemana: ['seg', 'ter', 'qua', 'qui', 'sex'],
        horasPadrao: 6,
        limiteExcepcional: 8,
      },
    })

    const resposta = await postGerar()
    expect(resposta.headers.get('location')).toBe('/entrevista/revisao?gerada=1')

    const dados = await estado()
    expect(dados.propostaSemanal).not.toBeNull()
    expect(dados.semanaAtiva).toBeNull()
    // A rotina interpretada fica em material transitório — a rotina do
    // EstadoPrivado só é tocada pela confirmação.
    expect(obterRotinaInterpretada(USUARIO_TESTE)?.trabalho?.horasPadrao).toBe(6)
    expect(dados.rotina.trabalho).toBeNull()
    // Material transitório nunca entra no EstadoPrivado.
    expect(JSON.stringify(dados)).not.toContain('faculdade')
    expect('respostas' in dados).toBe(false)
  })

  it('gerar não sobrescreve uma rotina montada manualmente — só a confirmação promove', async () => {
    await sessaoComRespostas()
    const manual = normalizarInterpretacao({
      sono: { dormir: '22:00', acordar: '06:00' },
    })!
    const store = await getStateStore(USUARIO_TESTE)
    const lido = await store.load()
    if (!lido.ok) throw new Error('store indisponível')
    await store.save({ ...estadoVazio(), rotina: manual }, lido.value.version)

    globalState.__respostaIA = respostaIA({ sono: { dormir: '23:30', acordar: '07:30' } })
    expect((await postGerar()).headers.get('location')).toBe('/entrevista/revisao?gerada=1')

    // A rotina manual permanece intacta; a interpretada espera o aceite.
    expect((await estado()).rotina.sono?.dormir).toBe('22:00')
    expect(obterRotinaInterpretada(USUARIO_TESTE)?.sono?.dormir).toBe('23:30')
  })

  it('resposta inválida ou indisponível devolve erro com caminho de retentativa', async () => {
    await sessaoComRespostas()
    globalState.__respostaIA = { ok: false, motivo: 'indisponivel' }
    expect((await postGerar()).headers.get('location')).toBe(
      '/entrevista/revisao?erro=indisponivel'
    )

    globalState.__respostaIA = respostaIA({ nada: 'utilizavel' })
    expect((await postGerar()).headers.get('location')).toBe('/entrevista/revisao?erro=vazia')

    // Nada foi gravado nas falhas.
    expect((await estado()).propostaSemanal).toBeNull()
  })

  it('usa o texto extraído do documento consentido como contexto da IA', async () => {
    await sessaoComRespostas()
    guardarDocumento(USUARIO_TESTE, {
      nome: 'rotina.txt',
      formato: 'txt',
      tamanho: 30,
      consentidoEm: new Date().toISOString(),
      texto: 'trabalho seg a sex das 9h às 15h',
    })
    globalState.__respostaIA = respostaIA({ sono: { dormir: '23:30', acordar: '07:30' } })

    const resposta = await postGerar()
    expect(resposta.headers.get('location')).toBe('/entrevista/revisao?gerada=1')
    expect(globalState.__entradaIA?.documentoTexto).toBe('trabalho seg a sex das 9h às 15h')
    expect(globalState.__entradaIA?.respostas).toEqual({
      objetivo: { selecionadas: ['estudos'], texto: 'faculdade' },
    })
    expect(obterRotinaInterpretada(USUARIO_TESTE)?.sono?.acordar).toBe('07:30')
    // Documento transitório descartado após a geração.
    expect(obterDocumento(USUARIO_TESTE)).toBeNull()
  })

  it('funciona sem documento — contexto vai como null', async () => {
    await sessaoComRespostas()
    globalState.__respostaIA = respostaIA({ sono: { dormir: '22:00', acordar: '06:00' } })
    const resposta = await postGerar()
    expect(resposta.headers.get('location')).toBe('/entrevista/revisao?gerada=1')
    expect(globalState.__entradaIA?.documentoTexto).toBeNull()
  })

  it('sem respostas na sessão, volta para as etapas', async () => {
    await autenticarComo()
    consentirEntrevista(await valorSessao(process.env.SESSION_SECRET!, { consentimento: 'geral' }))
    expect((await postGerar()).headers.get('location')).toBe('/entrevista/etapas')
  })

  it('sem consentimento, volta para o consentimento', async () => {
    await autenticarComo()
    expect((await postGerar()).headers.get('location')).toBe('/entrevista/consentimento')
  })
})

describe('interpretarEntrevista', () => {
  it('propaga motivo de falha do adaptador', async () => {
    const resultado = await interpretarEntrevista(
      { interpretar: async () => ({ ok: false, motivo: 'invalida' }) },
      { respostas: {}, documentoTexto: null }
    )
    expect(resultado).toEqual({ ok: false, motivo: 'invalida' })
  })
})

// ehDiaSemana permanece referenciado para o leitor do teste: dias
// aceitos pela interpretação são os mesmos do domínio.
void ehDiaSemana
