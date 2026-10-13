import { render, screen } from '@testing-library/react'
import CadastroPage from '@/app/cadastro/page'
import { SENHA_MINIMA } from '@/server/auth/cadastro'

function renderizar(params: { erro?: string; email?: string } = {}) {
  return CadastroPage({ searchParams: Promise.resolve(params) }).then(render)
}

describe('Página de cadastro', () => {
  it('solicita somente e-mail, senha e confirmação', async () => {
    await renderizar()

    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirmação/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument()
  })

  it('o formulário envia os dados para a rota de cadastro por POST', async () => {
    await renderizar()

    const formulario = screen.getByRole('button', { name: /criar conta/i }).closest('form')
    expect(formulario).toHaveAttribute('action', '/api/auth/cadastro')
    expect(formulario).toHaveAttribute('method', 'post')
  })

  it('apresenta os requisitos de senha antes do envio', async () => {
    await renderizar()

    expect(screen.getByText(new RegExp(`${SENHA_MINIMA} caracteres`))).toBeInTheDocument()
    expect(screen.getByLabelText(/^senha$/i)).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('requisitos-senha')
    )
  })

  it('associa erro de e-mail inválido ao campo de e-mail', async () => {
    await renderizar({ erro: 'email-invalido', email: 'ruim' })

    const campo = screen.getByLabelText(/e-mail/i)
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(campo).toHaveValue('ruim')
    expect(screen.getByRole('alert')).toHaveTextContent(/e-mail válido/i)
  })

  it('comunica e-mail já cadastrado apontando a entrada', async () => {
    await renderizar({ erro: 'email-em-uso', email: 'pessoa@exemplo.com' })

    expect(screen.getByRole('alert')).toHaveTextContent(/já tem uma conta/i)
    expect(screen.getByLabelText(/e-mail/i)).toHaveAttribute('aria-invalid', 'true')
  })

  it('associa confirmação divergente ao campo correto', async () => {
    await renderizar({ erro: 'confirmacao-divergente' })

    expect(screen.getByLabelText(/confirmação/i)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent(/não confere/i)
  })

  it('indisponibilidade gera aviso geral sem culpar a pessoa', async () => {
    await renderizar({ erro: 'indisponivel' })

    expect(screen.getByRole('alert')).toHaveTextContent(/tente de novo/i)
  })

  it('oferece caminho de volta ao login', async () => {
    await renderizar()

    expect(screen.getByRole('link', { name: /entrar/i })).toHaveAttribute('href', '/login')
  })

  it('não entrega segredos ao navegador', async () => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    await renderizar()

    const html = document.body.innerHTML
    expect(html).not.toContain(process.env.SESSION_SECRET)
    expect(html).not.toContain('scrypt')
  })
})
