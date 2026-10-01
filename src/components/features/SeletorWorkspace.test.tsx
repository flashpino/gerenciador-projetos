import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const trocar = vi.fn()
vi.mock('@/hooks/useQuadro', () => ({
  useWorkspaces: () => ({
    data: [
      { id: 'w1', name: 'Meu Workspace', owner_id: 'u1' },
      { id: 'w2', name: 'Clientes', owner_id: 'u1' },
      { id: 'w3', name: 'Do Pino', owner_id: 'u9' },
    ],
  }),
  useWorkspaceAtual: () => ({ data: { id: 'w1', name: 'Meu Workspace', owner_id: 'u1' } }),
  useTrocarWorkspace: () => trocar,
}))

import { SeletorWorkspace } from './SeletorWorkspace'

const aoNovo = vi.fn()
const aoCompartilhar = vi.fn()

function renderizar() {
  render(
    <MemoryRouter initialEntries={['/boards/b1']}>
      <Routes>
        <Route path="*" element={<SeletorWorkspace aoNovo={aoNovo} aoCompartilhar={aoCompartilhar} />} />
        <Route path="/paineis" element={<p>meus painéis</p>} />
        <Route path="/workspaces" element={<p>gerenciar workspaces</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SeletorWorkspace', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mostra o workspace atual e lista os outros, com o atual marcado', async () => {
    const user = userEvent.setup()
    renderizar()

    await user.click(screen.getByRole('button', { name: 'Workspace: Meu Workspace. Trocar' }))

    expect(screen.getByRole('menuitem', { name: 'Meu Workspace' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('menuitem', { name: 'Do Pino' })).toBeInTheDocument()
  })

  it('escolher outro workspace troca e leva aos painéis dele', async () => {
    const user = userEvent.setup()
    renderizar()

    await user.click(screen.getByRole('button', { name: /^Workspace:/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Clientes' }))

    expect(trocar).toHaveBeenCalledWith('w2')
    expect(await screen.findByText('meus painéis')).toBeInTheDocument()
  })

  it('Novo, Compartilhar e Gerenciar', async () => {
    const user = userEvent.setup()
    renderizar()

    await user.click(screen.getByRole('button', { name: /^Workspace:/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Novo workspace' }))
    expect(aoNovo).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /^Workspace:/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Compartilhar workspace' }))
    expect(aoCompartilhar).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /^Workspace:/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Gerenciar workspaces' }))
    expect(await screen.findByText('gerenciar workspaces')).toBeInTheDocument()
  })
})
