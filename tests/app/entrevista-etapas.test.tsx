import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { WizardEntrevista } from '@/app/_components/wizard-entrevista'
import { POST as postRespostas } from '@/app/api/entrevista/respostas/route'
import { ETAPAS_ENTREVISTA, normalizarRespostas } from '@/server/entrevista/etapas'
import { lerSessao, valorConsentimento } from '@/server/entrevista/sessao'
import { autenticarComo, consentirEntrevista } from '../helpers/sessao'

process.env.PERSISTENCE_DRIVER = 'memory'
process.env.SESSION_SECRET = 'segredo-de-teste-com-entropia-suficiente'

expect.extend(toHaveNoViolations)
const regras = { rules: { 'color-contrast': { enabled: false } } }

beforeEach(async () => {
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
    render(<WizardEntrevista />)

    for (let i = 0; i < ETAPAS_ENTREVISTA.length - 1; i++) {
      expect(screen.getByRole('status')).toHaveTextContent(`Etapa ${i + 1} de 5`)
      expect(
        screen.getByRole('heading', { name: ETAPAS_ENTREVISTA[i]!.titulo })
      ).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
    }
    expect(screen.getByRole('status')).toHaveTextContent('Etapa 5 de 5')
    expect(screen.getByRole('button', { name: /concluir entrevista/i })).toBeInTheDocument()
  })

  it('voltar preserva as respostas da sessão', () => {
    render(<WizardEntrevista />)
    fireEvent.click(screen.getByRole('radio', { name: /estudos/i }))
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: /trabalho/i }))
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(screen.getByRole('radio', { name: /estudos/i })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
    expect(screen.getByRole('checkbox', { name: /trabalho/i })).toBeChecked()
  })

  it('avança sem preencher o texto aberto e comunica a perda ao sair', () => {
    render(<WizardEntrevista />)
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
    expect(screen.getByRole('status')).toHaveTextContent('Etapa 2 de 5')
    expect(screen.getByRole('link', { name: /sair e perder o progresso/i })).toHaveAttribute(
      'href',
      '/hoje'
    )
    expect(screen.getByText(/recarregar ou fechar a página.*é perdido/i)).toBeInTheDocument()
  })

  it('texto aberto opcional pode ser escrito em qualquer etapa', () => {
    render(<WizardEntrevista />)
    const campo = screen.getByLabelText(/contar com suas palavras/i)
    fireEvent.change(campo, { target: { value: 'trabalho de manhã, estudo à noite' } })
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(screen.getByLabelText(/contar com suas palavras/i)).toHaveValue(
      'trabalho de manhã, estudo à noite'
    )
  })
})

describe('POST /api/entrevista/respostas', () => {
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
    const { container } = render(<WizardEntrevista />)
    expect(await axe(container, regras)).toHaveNoViolations()
  })
})
