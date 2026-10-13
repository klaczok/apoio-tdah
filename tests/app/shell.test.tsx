import { render, screen, within } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ShellPrivado, ShellPublico } from '@/app/_components/shell'
import { iniciaisDoEmail } from '@/app/_components/identidade'

expect.extend(toHaveNoViolations)

// jsdom não implementa leiaute — contraste é conferido na revisão visual.
const regras = { rules: { 'color-contrast': { enabled: false } } }

const globalState = globalThis as { __rotaTeste?: string }

function definirRota(caminho: string) {
  globalState.__rotaTeste = caminho
}

beforeEach(() => definirRota('/'))

describe('identidade visual da conta', () => {
  it('deriva iniciais do e-mail, sem criar campo de nome', () => {
    expect(iniciaisDoEmail('maria.clara@exemplo.com')).toBe('MC')
    expect(iniciaisDoEmail('marina@exemplo.com')).toBe('M')
    expect(iniciaisDoEmail('joao-pedro.silva@exemplo.com')).toBe('JP')
    expect(iniciaisDoEmail('sem-partes')).toBe('SP')
  })
})

describe('shell autenticado', () => {
  it('oferece navegação principal com os destinos da área', () => {
    render(<ShellPrivado email="maria.clara@exemplo.com">conteúdo</ShellPrivado>)

    const nav = screen.getByRole('navigation', { name: /principal/i })
    for (const destino of ['Semana', 'Hoje', 'Proposta', 'Histórico']) {
      expect(within(nav).getByRole('link', { name: destino })).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: /configuração/i })).toBeInTheDocument()
  })

  it('marca a localização atual com aria-current e não repete nos demais', () => {
    definirRota('/hoje')
    render(<ShellPrivado email="maria.clara@exemplo.com">conteúdo</ShellPrivado>)

    const nav = screen.getByRole('navigation', { name: /principal/i })
    const atual = within(nav).getByRole('link', { name: 'Hoje' })
    expect(atual).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Semana' })).not.toHaveAttribute('aria-current')
  })

  it('trata rotas internas da configuração como mesma localização', () => {
    definirRota('/configurar/compromissos')
    render(<ShellPrivado email="maria.clara@exemplo.com">conteúdo</ShellPrivado>)

    const config = screen.getAllByRole('link', { name: /configuração/i })[0]
    expect(config).toHaveAttribute('aria-current', 'page')
  })

  it('expõe navegação móvel com ação central apontando para capacidade existente', () => {
    render(<ShellPrivado email="maria.clara@exemplo.com">conteúdo</ShellPrivado>)

    const movel = screen.getByRole('navigation', { name: /móvel/i })
    const criacao = within(movel).getByRole('link', { name: /novo compromisso/i })
    expect(criacao).toHaveAttribute('href', '/semana/novo')
  })

  it('mostra a identidade da conta derivada do e-mail autenticado', () => {
    render(<ShellPrivado email="maria.clara@exemplo.com">conteúdo</ShellPrivado>)

    expect(screen.getAllByText('maria.clara@exemplo.com').length).toBeGreaterThan(0)
    expect(screen.getAllByText('MC').length).toBeGreaterThan(0)
  })

  it('mantém a saída da conta acessível no desktop e no celular', () => {
    render(<ShellPrivado email="maria.clara@exemplo.com">conteúdo</ShellPrivado>)

    const botoes = screen.getAllByRole('button', { name: /sair/i })
    expect(botoes.length).toBeGreaterThanOrEqual(2)
    for (const sair of botoes) {
      expect(sair.closest('form')).toHaveAttribute('action', '/api/auth/logout')
    }
    // No celular a lateral fica oculta — a saída precisa existir no topo.
    const topo = screen.getByRole('banner')
    expect(within(topo).getByRole('button', { name: /sair/i })).toBeInTheDocument()
  })

  it('não é o único meio de perceber a localização atual', () => {
    definirRota('/semana')
    const { container } = render(
      <ShellPrivado email="maria.clara@exemplo.com">conteúdo</ShellPrivado>
    )

    const atual = container.querySelector('[aria-current="page"]')
    expect(atual?.textContent).toContain('Semana')
  })

  it('não apresenta violações de acessibilidade detectáveis em jsdom', async () => {
    definirRota('/hoje')
    const { container } = render(
      <ShellPrivado email="maria.clara@exemplo.com">conteúdo</ShellPrivado>
    )
    expect(await axe(container, regras)).toHaveNoViolations()
  })

  it('segue exibindo a conta mesmo quando o e-mail não está disponível', () => {
    render(<ShellPrivado email={null}>conteúdo</ShellPrivado>)

    expect(screen.getByText('Sua conta')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /sair/i }).length).toBeGreaterThan(0)
  })
})

describe('shell público de autenticação', () => {
  it('usa a mesma marca sem expor navegação privada', () => {
    render(<ShellPublico>conteúdo público</ShellPublico>)

    expect(screen.getByText('Apoio')).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
