import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

// Sem resetAllMocks neste arquivo, então o valor do factory persiste.
vi.mock('@/services/boards', () => ({
  buscarFavoritos: vi.fn().mockResolvedValue(['b1']),
  favoritar: vi.fn(),
  desfavoritar: vi.fn(),
}))

import { BoardCard } from './BoardCard'

const BOARD = { id: 'b1', name: 'Sprint Alpha', created_at: '2026-09-01T10:00:00Z' }

function renderizar() {
  const aoRenomear = vi.fn()
  const aoExcluir = vi.fn()
  const { wrapper: QueryWrapper } = criarWrapper()
  render(
    <QueryWrapper>
      <MemoryRouter>
        <BoardCard board={BOARD} aoRenomear={aoRenomear} aoExcluir={aoExcluir} />
      </MemoryRouter>
    </QueryWrapper>,
  )
  return { aoRenomear, aoExcluir }
}

describe('BoardCard', () => {
  it('mostra a estrela de favorito do board, já marcada quando favoritado', async () => {
    renderizar()
    const estrela = await screen.findByRole('button', { name: 'Favoritar Sprint Alpha' })
    await vi.waitFor(() => expect(estrela).toHaveAttribute('aria-pressed', 'true'))
  })

  it('o card é um link para o board', () => {
    renderizar()
    expect(screen.getByRole('link', { name: /Sprint Alpha/ })).toHaveAttribute('href', '/boards/b1')
  })

  it('"Renomear" no menu entrega o board', async () => {
    const user = userEvent.setup()
    const { aoRenomear } = renderizar()

    await user.click(screen.getByRole('button', { name: 'Ações de Sprint Alpha' }))
    await user.click(screen.getByRole('menuitem', { name: 'Renomear' }))

    expect(aoRenomear).toHaveBeenCalledWith(BOARD)
  })

  it('"Excluir" no menu entrega o board', async () => {
    const user = userEvent.setup()
    const { aoExcluir } = renderizar()

    await user.click(screen.getByRole('button', { name: 'Ações de Sprint Alpha' }))
    await user.click(screen.getByRole('menuitem', { name: 'Excluir' }))

    expect(aoExcluir).toHaveBeenCalledWith(BOARD)
  })
})
