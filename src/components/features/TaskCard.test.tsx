import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Profile, Task } from '@/types/domain'
import { TaskCard } from './TaskCard'

function tarefa(extra: Partial<Task> = {}): Task {
  return {
    id: 't1', board_id: 'b', group_id: 'g', title: 'Refatorar arquitetura',
    description: null, status: 'working', priority: 'high', assignee_id: 'u1',
    start_date: null, due_date: null, progress: 40, estimated_hours: null,
    logged_hours: null, is_milestone: false, tags: [], position: 0,
    created_at: '', updated_at: '', ...extra,
  }
}

const MEMBROS: Profile[] = [{ id: 'u1', full_name: 'Ana Lima', avatar_url: null }]

describe('TaskCard', () => {
  it('mostra título, prioridade em texto e progresso', () => {
    render(<TaskCard task={tarefa()} membros={MEMBROS} aoMover={() => {}} aoAbrir={() => {}} />)

    expect(screen.getByRole('button', { name: 'Refatorar arquitetura' })).toBeVisible()
    expect(screen.getByText('Alta')).toBeVisible()
    expect(screen.getByRole('progressbar', { name: /progresso de refatorar/i })).toBeInTheDocument()
  })

  // F2.3 + WCAG 2.5.7: arrastar NUNCA é a única forma de mover, em nenhuma largura.
  it('move por teclado pelo menu, sem mouse', async () => {
    const user = userEvent.setup()
    const aoMover = vi.fn()
    render(<TaskCard task={tarefa()} membros={MEMBROS} aoMover={aoMover} aoAbrir={() => {}} />)

    await user.click(screen.getByRole('button', { name: /ações de refatorar arquitetura/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Mover para Pronto' }))

    expect(aoMover).toHaveBeenCalledWith('done')
  })

  // A coluna atual no menu seria um no-op que ocupa espaço e infla a contagem
  // que o leitor de tela anuncia ("menu, 5 itens" para 4 destinos reais).
  it('não oferece a coluna em que a tarefa já está', async () => {
    const user = userEvent.setup()
    render(<TaskCard task={tarefa({ status: 'working' })} membros={MEMBROS} aoMover={() => {}} aoAbrir={() => {}} />)

    await user.click(screen.getByRole('button', { name: /ações de refatorar/i }))

    expect(screen.queryByRole('menuitem', { name: 'Mover para Em andamento' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('menuitem')).toHaveLength(4)
  })

  it('clicar no título chama aoAbrir', async () => {
    const user = userEvent.setup()
    const aoAbrir = vi.fn()
    render(<TaskCard task={tarefa()} membros={MEMBROS} aoMover={() => {}} aoAbrir={aoAbrir} />)

    await user.click(screen.getByRole('button', { name: 'Refatorar arquitetura' }))

    expect(aoAbrir).toHaveBeenCalledOnce()
  })

  it('mostra o responsável pelo nome, não só pelo avatar', () => {
    render(<TaskCard task={tarefa()} membros={MEMBROS} aoMover={() => {}} aoAbrir={() => {}} />)

    expect(screen.getAllByText('Ana Lima')).toHaveLength(2)
  })
})
