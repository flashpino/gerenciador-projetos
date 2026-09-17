import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { GroupComTarefas } from '@/types/domain'
import { GanttChart } from './GanttChart'

const grupos = (): GroupComTarefas[] => [
  {
    id: 'g1', board_id: 'b1', name: 'Backend', color: 'azure', position: 0,
    tasks: [
      {
        id: 't1', board_id: 'b1', group_id: 'g1', title: 'Migrar API', description: null,
        status: 'working', priority: 'high', assignee_id: null,
        start_date: '2026-09-05', due_date: '2026-09-08', progress: 40,
        estimated_hours: null, logged_hours: null, is_milestone: false, tags: [],
        position: 0, created_at: '', updated_at: '',
      },
      {
        id: 't2', board_id: 'b1', group_id: 'g1', title: 'Sem datas ainda', description: null,
        status: 'not_started', priority: 'medium', assignee_id: null,
        start_date: null, due_date: null, progress: 0,
        estimated_hours: null, logged_hours: null, is_milestone: false, tags: [],
        position: 1, created_at: '', updated_at: '',
      },
      {
        id: 't3', board_id: 'b1', group_id: 'g1', title: 'Freeze de release', description: null,
        status: 'not_started', priority: 'critical', assignee_id: null,
        start_date: null, due_date: '2026-09-20', progress: 0,
        estimated_hours: null, logged_hours: null, is_milestone: true, tags: [],
        position: 2, created_at: '', updated_at: '',
      },
    ],
  },
]

describe('GanttChart', () => {
  it('agrupa por grupo e lista cada tarefa (marco, barra e sem período)', () => {
    render(<GanttChart grupos={grupos()} />)

    expect(screen.getByRole('heading', { name: 'Backend' })).toBeInTheDocument()
    expect(screen.getAllByText('Migrar API').length).toBeGreaterThan(0)
    expect(screen.getByText('Sem período definido')).toBeInTheDocument()
    expect(screen.getByText(/Marco: Freeze de release/)).toBeInTheDocument()
  })

  it('mostra o marcador de "hoje" (critério F3.3)', () => {
    render(<GanttChart grupos={grupos()} />)
    expect(screen.getByText('Hoje')).toBeInTheDocument()
  })

  it('trocar a escala reposiciona as barras sem perder a tarefa (critério F3.2)', async () => {
    const user = userEvent.setup()
    render(<GanttChart grupos={grupos()} />)

    // [0] é o nome fixo na coluna esquerda (largura sempre 208px); [1] é a
    // barra dentro do GanttRow, cuja largura em px varia com a escala.
    const barraAntes = screen.getAllByText('Migrar API')[1]?.closest('[style]') as HTMLElement
    const larguraAntes = barraAntes.style.width

    await user.click(screen.getByRole('tab', { name: 'Dias' }))

    const barraDepois = screen.getAllByText('Migrar API')[1]?.closest('[style]') as HTMLElement
    expect(barraDepois.style.width).not.toBe(larguraAntes)
  })
})
