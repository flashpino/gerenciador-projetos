import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Atividade } from '@/types/domain'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({ buscarAtividades: vi.fn() }))

import * as servico from '@/services/boards'
import AtividadesPage from './AtividadesPage'

const EVENTO: Atividade = {
  id: 1, board_id: 'b1', task_id: 't1', kind: 'status_changed', task_title: 'Deploy',
  from_status: 'working', to_status: 'review', comment_excerpt: null,
  created_at: new Date().toISOString(),
  ator: { full_name: 'Ana Lima', avatar_url: null }, board: { name: 'Sprint Alpha' },
}

function renderizar() {
  const { wrapper: QueryWrapper } = criarWrapper()
  render(
    <QueryWrapper>
      <MemoryRouter>
        <AtividadesPage />
      </MemoryRouter>
    </QueryWrapper>,
  )
}

describe('AtividadesPage', () => {
  beforeEach(() => vi.resetAllMocks())

  it('carregando', () => {
    vi.mocked(servico.buscarAtividades).mockImplementation(() => new Promise(() => {}))
    renderizar()
    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
  })

  it('erro', async () => {
    vi.mocked(servico.buscarAtividades).mockRejectedValue(new Error('Sem conexão.'))
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão.')
  })

  it('vazio', async () => {
    vi.mocked(servico.buscarAtividades).mockResolvedValue([])
    renderizar()
    expect(await screen.findByText('Nenhuma atividade ainda')).toBeInTheDocument()
  })

  it('workspace inteiro (50 mais recentes), com o board de cada evento como link', async () => {
    vi.mocked(servico.buscarAtividades).mockResolvedValue([EVENTO])
    renderizar()

    expect(screen.getByRole('heading', { name: 'Atividades' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Sprint Alpha' })).toHaveAttribute('href', '/boards/b1')
    expect(servico.buscarAtividades).toHaveBeenCalledWith({ boardId: undefined, limite: 50 })
  })
})
