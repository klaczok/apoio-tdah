import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import DocumentoPage from '@/app/(area)/entrevista/documento/page'
import { POST as postDocumento } from '@/app/api/entrevista/documento/route'
import {
  descartarDocumento,
  formatoDoNome,
  LIMITE_DOCUMENTO_BYTES,
  obterDocumento,
} from '@/server/entrevista/documento'
import { valorConsentimento, valorSessao } from '@/server/entrevista/sessao'
import { autenticarComo, consentirEntrevista, USUARIO_TESTE } from '../helpers/sessao'

process.env.PERSISTENCE_DRIVER = 'memory'
process.env.SESSION_SECRET = 'segredo-de-teste-com-entropia-suficiente'

expect.extend(toHaveNoViolations)
const regras = { rules: { 'color-contrast': { enabled: false } } }

function arquivo(nome: string, tamanho = 1000, conteudo = 'texto do documento') {
  const bytes = new TextEncoder().encode(conteudo)
  return {
    name: nome,
    size: tamanho,
    type: 'application/octet-stream',
    arrayBuffer: async () => bytes.buffer,
  } as unknown as File
}

function postCom(form: Record<string, unknown>) {
  const dados = new Map(Object.entries(form))
  return {
    url: 'http://localhost/api/entrevista/documento',
    headers: { get: () => null },
    formData: async () => ({
      get: (k: string) => dados.get(k) ?? null,
      getAll: (k: string) => {
        const v = dados.get(k)
        return v === undefined ? [] : Array.isArray(v) ? v : [v]
      },
    }),
  } as unknown as Request
}

async function sessaoComRespostas() {
  await autenticarComo()
  consentirEntrevista(
    await valorSessao(process.env.SESSION_SECRET!, {
      consentimento: 'geral',
      respostas: { objetivo: { selecionadas: ['estudos'], texto: '' } },
    })
  )
}

beforeEach(() => descartarDocumento(USUARIO_TESTE))

describe('anexo do documento efêmero', () => {
  it('a tela informa formatos, limite, exclusividade e ausência de armazenamento', async () => {
    await sessaoComRespostas()
    render(await DocumentoPage({ searchParams: Promise.resolve({}) }))
    expect(screen.getAllByText(/PDF, DOCX ou TXT.*2 MB/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/imagens não são aceitas/i)).toBeInTheDocument()
    expect(screen.getByText(/um único documento/i)).toBeInTheDocument()
    expect(screen.getByText(/não fica armazenado/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /seguir sem documento/i })).toHaveAttribute(
      'href',
      '/entrevista/revisao'
    )
    // Consentimento específico é exigido antes do envio.
    expect(screen.getByRole('checkbox', { name: /enviado ao Gemini/i })).toBeRequired()
  })

  it('anexa um TXT válido com consentimento e extrai o texto na sessão', async () => {
    await sessaoComRespostas()
    const resposta = await postDocumento(
      postCom({ consentimentoDocumento: 'aceito', arquivo: arquivo('rotina.txt') })
    )
    expect(resposta.status).toBe(303)
    expect(resposta.headers.get('location')).toBe('/entrevista/documento?selecionado=1')
    const doc = obterDocumento(USUARIO_TESTE)
    expect(doc?.nome).toBe('rotina.txt')
    expect(doc?.texto).toBe('texto do documento')
  })

  it('recusa imagem, formato inválido, múltiplos e acima do limite — antes de qualquer uso', async () => {
    await sessaoComRespostas()
    const casos: [Record<string, unknown>, string][] = [
      [{ consentimentoDocumento: 'aceito', arquivo: arquivo('foto.png') }, 'formato'],
      [{ consentimentoDocumento: 'aceito', arquivo: arquivo('planilha.xlsx') }, 'formato'],
      [
        {
          consentimentoDocumento: 'aceito',
          arquivo: arquivo('grande.pdf', LIMITE_DOCUMENTO_BYTES + 1),
        },
        'tamanho',
      ],
      [
        {
          consentimentoDocumento: 'aceito',
          arquivo: [arquivo('a.txt'), arquivo('b.txt')],
        },
        'quantidade',
      ],
      [{ arquivo: arquivo('ok.txt') }, 'consentimento'],
    ]
    for (const [form, erro] of casos) {
      const resposta = await postDocumento(postCom(form))
      expect(resposta.headers.get('location')).toBe(`/entrevista/documento?erro=${erro}`)
      expect(obterDocumento(USUARIO_TESTE)).toBeNull()
    }
  })

  it('remove o documento e permite seguir sem ele', async () => {
    await sessaoComRespostas()
    await postDocumento(
      postCom({ consentimentoDocumento: 'aceito', arquivo: arquivo('apoio.docx', 500) })
    )
    expect(obterDocumento(USUARIO_TESTE)?.nome).toBe('apoio.docx')

    const remocao = await postDocumento(postCom({ acao: 'remover' }))
    expect(remocao.headers.get('location')).toBe('/entrevista/documento')
    expect(obterDocumento(USUARIO_TESTE)).toBeNull()
  })

  it('mostra o estado de documento selecionado com opção de remover', async () => {
    await sessaoComRespostas()
    await postDocumento(
      postCom({ consentimentoDocumento: 'aceito', arquivo: arquivo('apoio.pdf', 900) })
    )
    render(await DocumentoPage({ searchParams: Promise.resolve({ selecionado: '1' }) }))
    expect(screen.getByText('apoio.pdf')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remover ou trocar/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /continuar para a revisão/i })).toBeInTheDocument()
  })

  it('falha de formato expõe erro factual e o formulário continua aberto', async () => {
    await sessaoComRespostas()
    render(await DocumentoPage({ searchParams: Promise.resolve({ erro: 'formato' }) }))
    expect(screen.getByRole('alert')).toHaveTextContent(/formato não aceito/i)
    expect(screen.getByRole('link', { name: /seguir sem documento/i })).toBeInTheDocument()
  })
})

describe('formatoDoNome', () => {
  it('reconhece só pdf, docx e txt', () => {
    expect(formatoDoNome('a.PDF')).toBe('pdf')
    expect(formatoDoNome('b.docx')).toBe('docx')
    expect(formatoDoNome('c.txt')).toBe('txt')
    expect(formatoDoNome('d.png')).toBeNull()
    expect(formatoDoNome('sem-extensao')).toBeNull()
  })
})

describe('acessibilidade do passo de documento', () => {
  it('formulário e estado selecionado não têm violações', async () => {
    await sessaoComRespostas()
    const form = render(await DocumentoPage({ searchParams: Promise.resolve({}) }))
    expect(await axe(form.container, regras)).toHaveNoViolations()
    form.unmount()

    await postDocumento(
      postCom({ consentimentoDocumento: 'aceito', arquivo: arquivo('apoio.txt') })
    )
    const sel = render(await DocumentoPage({ searchParams: Promise.resolve({}) }))
    expect(await axe(sel.container, regras)).toHaveNoViolations()
  })
})
