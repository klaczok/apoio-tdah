import { render, screen } from '@testing-library/react'
import LoginPage from '@/app/login/page'

function renderizar(erro?: string) {
  return LoginPage({ searchParams: Promise.resolve(erro ? { erro } : {}) }).then(render)
}

describe('Página de login', () => {
  it('apresenta formulário com e-mail, senha e ação de entrada', async () => {
    await renderizar()

    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('o formulário envia as credenciais para a rota de login', async () => {
    await renderizar()

    const formulario = screen.getByRole('button', { name: /entrar/i }).closest('form')
    expect(formulario).toHaveAttribute('action', '/api/auth/login')
    expect(formulario).toHaveAttribute('method', 'post')
  })

  it('exibe erro factual sem indicar qual campo falhou', async () => {
    await renderizar('credencial')

    expect(screen.getByRole('alert')).toHaveTextContent(/e-mail ou senha/i)
  })

  it('não exibe erro sem credencial inválida', async () => {
    await renderizar()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('não entrega dados sensíveis ao navegador', async () => {
    process.env.AUTH_PASSWORD_HASH = 'scrypt:16384:8:1:aabbccddeeff:00112233'
    process.env.SESSION_SECRET = 'segredo-de-teste'
    await renderizar()

    const html = document.body.innerHTML
    expect(html).not.toContain('scrypt')
    expect(html).not.toContain(process.env.AUTH_PASSWORD_HASH)
    expect(html).not.toContain(process.env.SESSION_SECRET)
  })
})
