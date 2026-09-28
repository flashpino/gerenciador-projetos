import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({ buscarBoards: vi.fn() }))

import * as servico from '@/services/boards'
import AberturaPage from './AberturaPage'

const BOARDS = [
  { id: 'b1', name: 'Primeiro', created_at: '2026-09-01T10:00:00Z' },
  { id: 'b2', name: 'Segundo', created_at: '2026-09-10T10:00:00Z' },
]

function renderizar() {
  const { wrapper: QueryWrapper } = criarWrapper()
  return render(
    <QueryWrapper>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<AberturaPage />} />
          <Route path="/boards/b1" element={<p>board b1</p>} />
          <Route path="/boards/b2" element={<p>board b2</p>} />
          <Route path="/paineis" element={<p>lista de painéis</p>} />
        </Routes>
      </MemoryRouter>
    </QueryWrapper>,
  )
}

describe('AberturaPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  it('vai pro último board visitado quando ele ainda existe', async () => {
    localStorage.setItem('ultimoBoardId', 'b2')
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    renderizar()
    expect(await screen.findByText('board b2')).toBeInTheDocument()
  })

  it('cai no primeiro board quando o último visitado foi apagado', async () => {
    localStorage.setItem('ultimoBoardId', 'apagado')
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    renderizar()
    expect(await screen.findByText('board b1')).toBeInTheDocument()
  })

  it('cai no primeiro board quando nunca visitou nenhum', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    renderizar()
    expect(await screen.findByText('board b1')).toBeInTheDocument()
  })

  it('sem nenhum board, manda pra lista — é ela quem oferece "Criar painel"', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue([])
    renderizar()
    expect(await screen.findByText('lista de painéis')).toBeInTheDocument()
  })

  it('erro ao buscar mostra o estado de erro com "Tentar de novo"', async () => {
    vi.mocked(servico.buscarBoards).mockRejectedValue(new Error('Sem conexão.'))
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão.')
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })
})
