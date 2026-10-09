import { render, screen } from '@testing-library/react'
import HojePage from '@/app/hoje/page'

describe('Área privada', () => {
  it('oferece ação para encerrar a sessão', () => {
    render(<HojePage />)

    const sair = screen.getByRole('button', { name: /sair/i })
    expect(sair.closest('form')).toHaveAttribute('action', '/api/auth/logout')
    expect(sair.closest('form')).toHaveAttribute('method', 'post')
  })
})
