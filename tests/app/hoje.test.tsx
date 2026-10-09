import { render, screen } from '@testing-library/react'
import HojePage from '@/app/hoje/page'
import { getStateStore } from '@/server/persistence'
import { dataCivilHoje } from '@/server/tempo'
import { rotinaVazia } from '@/server/rotina/modelo'

process.env.PERSISTENCE_DRIVER = 'memory'

function renderizar(params: Record<string, string> = {}) {
  return HojePage({ searchParams: Promise.resolve(params) }).then(render)
}

describe('Área privada', () => {
  it('oferece ação para encerrar a sessão', async () => {
    await renderizar()

    const sair = screen.getByRole('button', { name: /sair/i })
    expect(sair.closest('form')).toHaveAttribute('action', '/api/auth/logout')
    expect(sair.closest('form')).toHaveAttribute('method', 'post')
  })

  it('exibe a anotação persistida do dia', async () => {
    const store = await getStateStore()
    const carregado = await store.load()
    if (!carregado.ok) throw new Error('store indisponível no teste')
    await store.save(
      { notasPorDia: { [dataCivilHoje()]: 'levar documento' }, rotina: rotinaVazia() },
      carregado.value.version
    )

    await renderizar()

    expect(screen.getByLabelText(/anotação do dia/i)).toHaveValue('levar documento')
  })

  it('confirma a gravação apenas após a persistência concluir', async () => {
    await renderizar({ salvo: '1' })

    expect(screen.getByRole('status')).toHaveTextContent(/salva/i)
  })

  it('apresenta erro factual quando o armazenamento falha', async () => {
    await renderizar({ erro: 'persistencia' })

    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível salvar/i)
  })
})
