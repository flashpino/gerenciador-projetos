import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { BoardCard } from './BoardCard'

const BOARD = { id: 'b1', name: 'Sprint Alpha', created_at: '2026-09-01T10:00:00Z' }

function renderizar() {
  const aoRenomear = vi.fn()
  const aoExcluir = vi.fn()
  render(
    <MemoryRouter>
      <BoardCard board={BOARD} aoRenomear={aoRenomear} aoExcluir={aoExcluir} />
    </MemoryRouter>,
  )
  return { aoRenomear, aoExcluir }
}

describe('BoardCard', () => {
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
