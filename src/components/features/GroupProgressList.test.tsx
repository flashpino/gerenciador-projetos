import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GroupComTarefas } from '@/types/domain'
import { criarTarefaFixture } from '@/test/fixtures'
import { GroupProgressList } from './GroupProgressList'

function grupo(nome: string, progressos: number[]): GroupComTarefas {
  return {
    id: nome, board_id: 'b', name: nome, color: 'azure', position: 0,
    tasks: progressos.map((p) => criarTarefaFixture({ progress: p })),
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
