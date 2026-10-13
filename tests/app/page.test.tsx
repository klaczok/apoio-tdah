import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

describe('Página inicial pública', () => {
  it('apresenta o produto, os benefícios e os caminhos de entrada', () => {
    render(<Home />)

    expect(
      screen.getByRole('heading', { level: 1, name: /sua semana.*seu ritmo/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /começar minha rotina/i })).toHaveAttribute(
      'href',
      '/cadastro'
    )
    expect(screen.getAllByRole('link', { name: /entrar/i })[0]).toHaveAttribute('href', '/login')
    expect(screen.getByText(/conversa que vira calendário/i)).toBeInTheDocument()
    expect(screen.getByText(/privado por padrão/i)).toBeInTheDocument()
  })
})
