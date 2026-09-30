import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Menu } from './Menu'

function renderizar(aoExcluir = vi.fn(), desabilitado = false) {
  render(
    <Menu
      rotulo="Ações"
      trigger={(p) => (
        <button {...p} type="button">
          Abrir
        </button>
      )}
      items={[
        { id: 'excluir', rotulo: 'Excluir', aoEscolher: aoExcluir, desabilitado },
      ]}
    />,
  )
  return aoExcluir
}

describe('Menu — item desabilitado', () => {
  it('item habilitado dispara aoEscolher', async () => {
    const user = userEvent.setup()
    const aoExcluir = renderizar()

    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    await user.click(screen.getByRole('menuitem', { name: 'Excluir' }))

    expect(aoExcluir).toHaveBeenCalledTimes(1)
  })

  it('item desabilitado é anunciado como desabilitado e NÃO dispara aoEscolher', async () => {
    const user = userEvent.setup()
    const aoExcluir = renderizar(vi.fn(), true)

    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    const item = screen.getByRole('menuitem', { name: 'Excluir' })
    expect(item).toHaveAttribute('aria-disabled', 'true')

    await user.click(item)
    expect(aoExcluir).not.toHaveBeenCalled()
  })
})
