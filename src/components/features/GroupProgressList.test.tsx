import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GroupComTarefas, Task } from '@/types/domain'
import { GroupProgressList } from './GroupProgressList'

function tarefa(progress: number, extra: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(), board_id: 'b', group_id: 'g', title: 't',
    description: null, status: 'working', priority: 'medium', assignee_id: null,
    start_date: null, due_date: null, progress, estimated_hours: null,
    logged_hours: null, is_milestone: false, tags: [], position: 0,
    created_at: '', updated_at: '', ...extra,
  }
}

function grupo(nome: string, progressos: number[]): GroupComTarefas {
  return {
    id: nome, board_id: 'b', name: nome, color: 'azure', position: 0,
    tasks: progressos.map((p) => tarefa(p)),
  }
}

describe('GroupProgressList', () => {
  it('mostra uma linha por grupo com o progresso medio', () => {
    render(<GroupProgressList grupos={[grupo('Backend', [40, 60]), grupo('Frontend', [100])]} />)

    expect(screen.getByText('Backend')).toBeInTheDocument()
    expect(screen.getByText('Frontend')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Progresso de Backend' })).toHaveAttribute('value', '50')
    expect(screen.getByRole('progressbar', { name: 'Progresso de Frontend' })).toHaveAttribute('value', '100')
  })
})
