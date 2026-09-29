import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GroupComTarefas } from '@/types/domain'
import { criarWrapper } from '@/test/query'
import { criarTarefaFixture as tarefa } from '@/test/fixtures'

vi.mock('@/services/boards', () => ({
  buscarAtividades: vi.fn(),
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
    vi.mocked(servico.buscarAtividades).mockResolvedValue([])
  })

  it('card "Atividades recentes" mostra os eventos DESTE board (10 mais recentes)', async () => {
    vi.mocked(servico.buscarBoard).mockResolvedValue({ id: 'b1', name: 'Meu Board', workspace_id: 'w1', owner_id: 'u1' })
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue([])
    vi.mocked(servico.buscarAtividades).mockResolvedValue([
      {
        id: 1, board_id: 'b1', task_id: 't1', kind: 'task_created', task_title: 'Setup',
        from_status: null, to_status: 'not_started', comment_excerpt: null,
        created_at: new Date().toISOString(), ator: { full_name: 'Ana Lima', avatar_url: null },
        board: { name: 'Meu Board' },
      },
    ])
    renderizar()

    const card = await screen.findByRole('region', { name: 'Atividades recentes' })
    expect(await within(card).findByText(/criou a tarefa/)).toBeInTheDocument()
    expect(servico.buscarAtividades).toHaveBeenCalledWith({ boardId: 'b1', limite: 10 })
  })

  it('card de atividades tem vazio próprio e aparece mesmo com o board sem tarefas', async () => {
    vi.mocked(servico.buscarBoard).mockResolvedValue({ id: 'b1', name: 'Meu Board', workspace_id: 'w1', owner_id: 'u1' })
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue([])
    renderizar()

    const card = await screen.findByRole('region', { name: 'Atividades recentes' })
    expect(await within(card).findByText('Nenhuma atividade ainda')).toBeInTheDocument()
  })

  it('F4.3: board com grupo presente mas sem tarefas mostra o estado vazio, não 0%/NaN', async () => {
    vi.mocked(servico.buscarBoard).mockResolvedValue({ id: 'b1', name: 'Meu Board', workspace_id: 'w1', owner_id: 'u1' })
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
    vi.mocked(servico.buscarBoard).mockResolvedValue({ id: 'b1', name: 'Meu Board', workspace_id: 'w1', owner_id: 'u1' })
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
