import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

describe('Página inicial pública', () => {
  it('identifica o produto sem expor dados privados', () => {
    render(<Home />)

    expect(screen.getByRole('heading', { level: 1, name: /Apoio à Rotina/i })).toBeInTheDocument()
  })
})
