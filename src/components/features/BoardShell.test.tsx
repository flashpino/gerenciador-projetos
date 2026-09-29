import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarBoard: vi.fn(),
  buscarFavoritos: vi.fn(),
  favoritar: vi.fn(),
  desfavoritar: vi.fn(),
}))

import * as servico from '@/services/boards'
import { BoardShell } from './BoardShell'

function renderizar(rota = '/boards/b1') {
  const { wrapper: QueryWrapper } = criarWrapper()
  return render(
    <QueryWrapper>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/boards/:boardId/*" element={<BoardShell titulo="Sprint Alpha">conteudo</BoardShell>} />
        </Routes>
      </MemoryRouter>
    </QueryWrapper>,
  )
}

describe('BoardShell', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
    vi.mocked(servico.buscarFavoritos).mockResolvedValue([])
    vi.mocked(servico.buscarBoard).mockResolvedValue({ id: 'b1', name: 'Sprint Alpha', workspace_id: 'w1', owner_id: 'u1' })
  })

  it('abas apontam para as views DESTE board', () => {
    renderizar()
    expect(screen.getByRole('link', { name: 'Tabela Principal' })).toHaveAttribute('href', '/boards/b1')
    expect(screen.getByRole('link', { name: 'Kanban' })).toHaveAttribute('href', '/boards/b1/kanban')
    expect(screen.getByRole('link', { name: 'Gantt' })).toHaveAttribute('href', '/boards/b1/gantt')
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/boards/b1/dashboard')
  })

  it('marca a aba da view atual', () => {
    renderizar('/boards/b1/kanban')
    expect(screen.getByRole('link', { name: 'Kanban' })).toHaveAttribute('aria-current', 'page')
  })

  it('não cria um segundo landmark main — o do AppShell já envolve a rota', () => {
    renderizar()
    expect(screen.queryByRole('main')).not.toBeInTheDocument()
  })

  it('lembra o board visitado, pra raiz / voltar nele', () => {
    renderizar()
    expect(localStorage.getItem('ultimoBoardId')).toBe('b1')
  })

  it('estrela de favorito funcional, com o nome do board', async () => {
    renderizar()
    const estrela = await screen.findByRole('button', { name: 'Favoritar Sprint Alpha' })
    expect(estrela).toHaveAttribute('aria-pressed', 'false')
  })

  it('os ícones ainda não implementados seguem desabilitados, com o motivo', () => {
    renderizar()
    for (const nome of [
      'Buscar neste quadro — em breve',
      'Filtrar — em breve',
      'Novo item — em breve',
    ]) {
      expect(screen.getByRole('button', { name: nome })).toBeDisabled()
    }
  })

  it('"Convidar integrantes" habilita quando o board carrega', async () => {
    renderizar()
    const botao = await screen.findByRole('button', { name: 'Convidar integrantes' })
    await vi.waitFor(() => expect(botao).toBeEnabled())
  })
})
