import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Task } from '@/types/domain'
import { GanttRow } from './GanttRow'

const base: Task = {
  id: 't1', board_id: 'b1', group_id: 'g1', title: 'Migrar API', description: null,
  status: 'working', priority: 'high', assignee_id: null, start_date: null, due_date: null,
  progress: 40, estimated_hours: null, logged_hours: null, is_milestone: false, tags: [],
  position: 0, created_at: '', updated_at: '',
}

const inicioTimeline = new Date(2026, 8, 1)

describe('GanttRow', () => {
  it('tarefa com início e fim vira uma barra posicionada (critério F3.1)', () => {
    const task: Task = { ...base, start_date: '2026-09-05', due_date: '2026-09-08' }
    render(<GanttRow task={task} inicioTimeline={inicioTimeline} escala="dia" />)

    const barra = screen.getByText('Migrar API')
    expect(barra).toBeInTheDocument()
    expect(barra.closest('[style]')).toHaveStyle({ left: '160px', width: '160px' })
  })

  it('tarefa marcada como marco vira losango numa data única, não barra (critério F3.4)', () => {
    const task: Task = { ...base, is_milestone: true, due_date: '2026-09-10' }
    render(<GanttRow task={task} inicioTimeline={inicioTimeline} escala="dia" />)

    expect(screen.getByText(/Marco: Migrar API/)).toBeInTheDocument()
    expect(screen.queryByText('40%')).not.toBeInTheDocument()
  })

  it('tarefa sem data aparece como "sem período definido", não some (critério F3.5)', () => {
    render(<GanttRow task={base} inicioTimeline={inicioTimeline} escala="dia" />)
    expect(screen.getByText('Sem período definido')).toBeInTheDocument()
  })
})
