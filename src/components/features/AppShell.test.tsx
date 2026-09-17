import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarWorkspaceAtual: vi.fn().mockResolvedValue({ id: 'w1', name: 'Meu Workspace' }),
  buscarMembros: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/services/auth', () => ({ sair: vi.fn() }))
vi.mock('@/hooks/useSessao', () => ({
  useSessao: () => ({ usuario: { id: 'u1', email: 'a@x.com' }, carregando: false }),
}))

import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('renderiza a sidebar e o conteúdo da rota filha', async () => {
    const { wrapper: QueryWrapper } = criarWrapper()
    render(
      <QueryWrapper>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<p>conteudo da rota</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryWrapper>,
    )

    expect(await screen.findByText('conteudo da rota')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navegação do workspace' })).toBeInTheDocument()
  })
})
