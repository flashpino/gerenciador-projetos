import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GroupComTarefas } from '@/types/domain'
import { criarWrapper } from '@/test/query'
import { criarTarefaFixture as tarefa } from '@/test/fixtures'

vi.mock('@/services/boards', () => ({
  buscarFavoritos: vi.fn(),
  buscarBoard: vi.fn(),
  buscarGruposComTarefas: vi.fn(),
  buscarMembros: vi.fn(),
}))
vi.mock('@/services/auth', () => ({ sair: vi.fn() }))

import * as servico from '@/services/boards'
import DashboardPage from './DashboardPage'

function renderizar() {
  const { wrapper: QueryWrapper } = criarWrapper()
  return render(
    <MemoryRouter initialEntries={['/boards/b1/dashboard']}>
      <QueryWrapper>
        <Routes>
          <Route path="/boards/:boardId/dashboard" element={<DashboardPage />} />
        </Routes>
      </QueryWrapper>
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(servico.buscarFavoritos).mockResolvedValue([])
  })

  it('F4.3: board com grupo presente mas sem tarefas mostra o estado vazio, não 0%/NaN', async () => {
    vi.mocked(servico.buscarBoard).mockResolvedValue({ id: 'b1', name: 'Meu Board' })
    const grupoVazio: GroupComTarefas[] = [
      { id: 'g1', board_id: 'b1', name: 'Grupo Vazio', color: 'azure', position: 0, tasks: [] },
    ]
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue(grupoVazio)

    renderizar()

    expect(await screen.findByText('Nenhuma tarefa ainda')).toBeInTheDocument()
    expect(screen.queryByText('NaN%')).not.toBeInTheDocument()
    expect(screen.queryByText('Taxa de Conclusão')).not.toBeInTheDocument()
  })

  it('renderiza as métricas reais quando o board tem tarefas', async () => {
    vi.mocked(servico.buscarBoard).mockResolvedValue({ id: 'b1', name: 'Meu Board' })
    const grupos: GroupComTarefas[] = [
      {
        id: 'g1', board_id: 'b1', name: 'Em Execução', color: 'azure', position: 0,
        tasks: [tarefa({ status: 'done' }), tarefa({ status: 'working' })],
      },
    ]
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue(grupos)

    renderizar()

    expect(
      await screen.findByRole('progressbar', { name: 'Taxa de Conclusão: 50%' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Em Execução')).toBeInTheDocument()
  })
})
