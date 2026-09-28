import type { ComponentType } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarFavoritos: vi.fn(),
  buscarBoard: vi.fn(),
  buscarGruposComTarefas: vi.fn(),
  buscarMembros: vi.fn(),
}))

import * as servico from '@/services/boards'
import { ErroDeDados } from '@/services/erros'
import BoardPage from './BoardPage'
import DashboardPage from './DashboardPage'
import GanttPage from './GanttPage'
import KanbanPage from './KanbanPage'

const PAGINAS: [string, ComponentType][] = [
  ['BoardPage', BoardPage],
  ['KanbanPage', KanbanPage],
  ['GanttPage', GanttPage],
  ['DashboardPage', DashboardPage],
]

describe('board da URL que não existe mais (apagado, ou de outro workspace)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(servico.buscarFavoritos).mockResolvedValue([])
    // O erro que o serviço lança de verdade para board inexistente (PGRST116 via traduzirErro).
    vi.mocked(servico.buscarBoard).mockRejectedValue(
      new ErroDeDados('Registro não encontrado.', { code: 'PGRST116' }),
    )
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue([])
    vi.mocked(servico.buscarMembros).mockResolvedValue([])
  })

  it.each(PAGINAS)('%s redireciona para /paineis em vez de oferecer "tentar de novo"', async (_nome, Pagina) => {
    const { wrapper: QueryWrapper } = criarWrapper()
    render(
      <QueryWrapper>
        <MemoryRouter initialEntries={['/boards/nao-existe']}>
          <Routes>
            <Route path="/boards/:boardId" element={<Pagina />} />
            <Route path="/paineis" element={<p>lista de painéis</p>} />
          </Routes>
        </MemoryRouter>
      </QueryWrapper>,
    )

    expect(await screen.findByText('lista de painéis')).toBeInTheDocument()
  })
})
