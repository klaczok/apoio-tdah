import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { WizardEntrevista } from '@/app/_components/wizard-entrevista'
import { POST as postRespostas } from '@/app/api/entrevista/respostas/route'
import { GET as getPerguntas } from '@/app/api/entrevista/perguntas/route'
import { PERGUNTAS_PADRAO, normalizarRespostas } from '@/entrevista/etapas'
import { lerSessao, valorConsentimento } from '@/server/entrevista/sessao'
import {
  guardarPerguntas,
  obterPerguntas as obterPerguntasGuardadas,
  descartarPerguntas,
} from '@/server/entrevista/material'
import type { ResultadoPerguntas } from '@/server/ia/entrevistador'
import { autenticarComo, consentirEntrevista, USUARIO_TESTE } from '../helpers/sessao'

process.env.PERSISTENCE_DRIVER = 'memory'
process.env.SESSION_SECRET = 'segredo-de-teste-com-entropia-suficiente'
process.env.INTERPRETADOR_DRIVER = 'fake'

expect.extend(toHaveNoViolations)
const regras = { rules: { 'color-contrast': { enabled: false } } }

const globalState = globalThis as { __perguntasIA?: ResultadoPerguntas }

beforeEach(async () => {
  delete globalState.__perguntasIA
  descartarPerguntas(USUARIO_TESTE)
  await autenticarComo()
  consentirEntrevista(await valorConsentimento(process.env.SESSION_SECRET!))
})

function postJson(corpo: unknown) {
  return {
    url: 'http://localhost/api/entrevista/respostas',
    headers: { get: () => null },
    json: async () => corpo,
  } as unknown as Request
}

describe('wizard das cinco etapas', () => {
  it('percorre as cinco etapas na ordem, com progresso textual e visual', () => {
    render(<WizardEntrevista perguntas={PERGUNTAS_PADRAO} />)

    for (let i = 0; i < PERGUNTAS_PADRAO.length - 1; i++) {
      expect(screen.getByRole('status')).toHaveTextContent(`Etapa ${i + 1} de 5`)
      expect(screen.getByRole('heading', { name: PERGUNTAS_PADRAO[i]!.titulo })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
    }
    expect(screen.getByRole('status')).toHaveTextContent('Etapa 5 de 5')
    expect(screen.getByRole('button', { name: /concluir entrevista/i })).toBeInTheDocument()
  })

  it('voltar preserva as respostas da sessão', () => {
    render(<WizardEntrevista perguntas={PERGUNTAS_PADRAO} />)
    fireEvent.click(screen.getByRole('radio', { name: /estudos/i }))
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: /trabalho/i }))
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(screen.getByRole('radio', { name: /estudos/i })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
    expect(screen.getByRole('checkbox', { name: /trabalho/i })).toBeChecked()
  })

  it('avança sem preencher o texto aberto e comunica a perda ao sair', () => {
    render(<WizardEntrevista perguntas={PERGUNTAS_PADRAO} />)
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
    expect(screen.getByRole('status')).toHaveTextContent('Etapa 2 de 5')
    expect(screen.getByRole('link', { name: /sair e perder o progresso/i })).toHaveAttribute(
      'href',
      '/api/entrevista/sair'
    )
    expect(screen.getByText(/recarregar ou fechar a página.*é perdido/i)).toBeInTheDocument()
  })

  it('refazer uma etapa preserva as respostas já registradas na sessão', () => {
    render(
      <WizardEntrevista
        perguntas={PERGUNTAS_PADRAO}
        respostasIniciais={{
          objetivo: { selecionadas: ['estudos'], texto: 'faculdade' },
          'horarios-fixos': { selecionadas: ['trabalho'], texto: '' },
        }}
      />
    )
    // Etapa 1 já respondida — basta navegar até a etapa a refazer.
    expect(screen.getByRole('radio', { name: /estudos/i })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
    expect(screen.getByRole('checkbox', { name: /trabalho/i })).toBeChecked()
  })

  it('texto aberto opcional pode ser escrito em qualquer etapa', () => {
    render(<WizardEntrevista perguntas={PERGUNTAS_PADRAO} />)
    const campo = screen.getByLabelText(/contar com suas palavras/i)
    fireEvent.change(campo, { target: { value: 'trabalho de manhã, estudo à noite' } })
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(screen.getByLabelText(/contar com suas palavras/i)).toHaveValue(
      'trabalho de manhã, estudo à noite'
    )
  })

  it('busca as perguntas formuladas pela IA e as apresenta em texto livre', async () => {
    const perguntasIA = [
      { id: 'p1', titulo: 'O que importa agora', pergunta: 'Como anda a sua semana?' },
      { id: 'p2', titulo: 'Horários', pergunta: 'Que compromissos têm hora marcada?' },
    ]
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ perguntas: perguntasIA }),
    })) as unknown as typeof fetch

    render(<WizardEntrevista />)
    expect(await screen.findByText('Como anda a sua semana?')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Etapa 1 de 2')
    // Pergunta da IA sem opções: a resposta é sempre o campo livre.
    const campo = screen.getByLabelText(/conte com suas palavras/i)
    fireEvent.change(campo, { target: { value: 'trabalho seg a sex 9h às 17h' } })
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
    expect(screen.getByText('Que compromissos têm hora marcada?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(screen.getByLabelText(/conte com suas palavras/i)).toHaveValue(
      'trabalho seg a sex 9h às 17h'
    )
  })

  it('falha ao carregar as perguntas mostra retentativa e saída manual', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      json: async () => ({ erro: 'x' }),
    })) as unknown as typeof fetch

    render(<WizardEntrevista />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/tentar de novo/i)
    expect(screen.getByRole('link', { name: /montar manualmente/i })).toHaveAttribute(
      'href',
      '/configurar'
    )
  })
})

describe('GET /api/entrevista/perguntas', () => {
  it('devolve as perguntas formuladas pela IA e as guarda no material transitório', async () => {
    globalState.__perguntasIA = {
      ok: true,
      perguntas: [
        { id: 'p1', titulo: 'O que importa agora', pergunta: 'Como anda a sua semana?' },
        { id: 'p2', titulo: 'Horários', pergunta: 'Que compromissos têm hora marcada?' },
      ],
    }
    const resposta = await getPerguntas()
    expect(resposta.status).toBe(200)
    const corpo = (await resposta.json()) as { perguntas: { id: string; pergunta: string }[] }
    expect(corpo.perguntas[0]?.pergunta).toBe('Como anda a sua semana?')
    expect(obterPerguntasGuardadas(USUARIO_TESTE)?.length).toBe(2)
  })

  it('reencontra as perguntas já formuladas — refazer não gera de novo', async () => {
    guardarPerguntas(USUARIO_TESTE, [{ id: 'p1', titulo: 'T', pergunta: 'Pergunta guardada?' }])
    // A IA não é chamada: fake ficaria indisponível.
    const corpo = (await (await getPerguntas()).json()) as {
      perguntas: { pergunta: string }[]
    }
    expect(corpo.perguntas[0]?.pergunta).toBe('Pergunta guardada?')
  })

  it('IA indisponível cai no banco de reserva — a entrevista não trava', async () => {
    globalState.__perguntasIA = { ok: false, motivo: 'indisponivel' }
    const corpo = (await (await getPerguntas()).json()) as { perguntas: unknown[] }
    expect(corpo.perguntas).toHaveLength(5)
  })

  it('sem consentimento, não devolve perguntas', async () => {
    ;(globalThis as { __entrevistaTeste?: string }).__entrevistaTeste = undefined
    const resposta = await getPerguntas()
    expect(resposta.status).toBe(403)
  })
})

describe('POST /api/entrevista/respostas', () => {
  it('valida contra as perguntas geradas pela IA, não o banco fixo', async () => {
    guardarPerguntas(USUARIO_TESTE, [
      { id: 'p1', titulo: 'T1', pergunta: 'P1?' },
      { id: 'p2', titulo: 'T2', pergunta: 'P2?' },
    ])
    const resposta = await postRespostas(
      postJson({
        respostas: {
          p1: { selecionadas: [], texto: 'resposta livre da p1' },
          objetivo: { selecionadas: ['estudos'], texto: 'não faz parte desta entrevista' },
        },
      })
    )
    expect(resposta.status).toBe(200)
    const cookie = resposta.headers.get('set-cookie') ?? ''
    const valor = cookie.split('apoio_entrevista=')[1]?.split(';')[0] ?? ''
    const sessao = await lerSessao(process.env.SESSION_SECRET!, decodeURIComponent(valor))
    expect(sessao?.respostas?.p1?.texto).toBe('resposta livre da p1')
    expect(sessao?.respostas?.objetivo).toBeUndefined()
  })

  it('grava as respostas na sessão efêmera, fora do EstadoPrivado', async () => {
    const resposta = await postRespostas(
      postJson({
        respostas: {
          objetivo: { selecionadas: ['estudos'], texto: 'focar na faculdade' },
          'horarios-fixos': { selecionadas: ['trabalho', 'codigo-invalido'], texto: '' },
          inventada: { selecionadas: ['x'], texto: 'y' },
        },
      })
    )
    expect(resposta.status).toBe(200)

    const cookie = resposta.headers.get('set-cookie') ?? ''
    const valor = cookie.split('apoio_entrevista=')[1]?.split(';')[0] ?? ''
    const sessao = await lerSessao(process.env.SESSION_SECRET!, decodeURIComponent(valor))
    expect(sessao?.respostas?.objetivo).toEqual({
      selecionadas: ['estudos'],
      texto: 'focar na faculdade',
    })
    // Códigos desconhecidos e etapas inventadas são descartados.
    expect(sessao?.respostas?.['horarios-fixos']).toEqual({
      selecionadas: ['trabalho'],
      texto: '',
    })
    expect(sessao?.respostas?.inventada).toBeUndefined()
  })

  it('sem consentimento prévio, rejeita as respostas', async () => {
    ;(globalThis as { __entrevistaTeste?: string }).__entrevistaTeste = undefined
    const resposta = await postRespostas(postJson({ respostas: {} }))
    expect(resposta.status).toBe(403)
  })
})

describe('normalizarRespostas', () => {
  it('corta seleção única, apara texto e ignora vazias', () => {
    const respostas = normalizarRespostas({
      objetivo: { selecionadas: ['trabalho', 'estudos'], texto: '  ' + 'x'.repeat(500) },
      'preferencias-energia': { selecionadas: [], texto: '' },
    })
    expect(respostas.objetivo?.selecionadas).toEqual(['trabalho'])
    expect(respostas.objetivo?.texto.length).toBeLessThanOrEqual(400)
    expect(respostas['preferencias-energia']).toBeUndefined()
  })
})

describe('acessibilidade das etapas', () => {
  it('wizard não tem violações', async () => {
    const { container } = render(<WizardEntrevista perguntas={PERGUNTAS_PADRAO} />)
    expect(await axe(container, regras)).toHaveNoViolations()
  })
})
