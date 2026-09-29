import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { Atividade } from '@/types/domain'
import { FeedAtividades } from './FeedAtividades'

const base: Atividade = {
  id: 1, board_id: 'b1', task_id: 't1', kind: 'status_changed', task_title: 'Deploy',
  from_status: 'working', to_status: 'review', comment_excerpt: null,
  created_at: new Date().toISOString(),
  ator: { full_name: 'Ana Lima', avatar_url: null }, board: { name: 'Sprint Alpha' },
}

function renderizar(atividades: Atividade[], mostrarBoard = false) {
  render(
    <MemoryRouter>
      <FeedAtividades atividades={atividades} mostrarBoard={mostrarBoard} />
    </MemoryRouter>,
  )
}

describe('FeedAtividades', () => {
  it('um item de lista por evento, com a frase e o status no badge', () => {
    renderizar([base, { ...base, id: 2, kind: 'task_created', task_title: 'Setup', to_status: 'not_started' }])
    const itens = screen.getAllByRole('listitem')
    expect(itens).toHaveLength(2)
    expect(itens[0]).toHaveTextContent('Ana Lima mudou “Deploy” para Em revisão')
    expect(itens[1]).toHaveTextContent('Ana Lima criou a tarefa “Setup”')
  })

  it('comentário mostra o trecho', () => {
    renderizar([{ ...base, kind: 'comment_added', to_status: null, comment_excerpt: 'Figma exportado' }])
    expect(screen.getByRole('listitem')).toHaveTextContent('Ana Lima comentou em “Deploy”: Figma exportado')
  })

  it('com mostrarBoard, o nome do board é link para ele', () => {
    renderizar([base], true)
    expect(within(screen.getByRole('listitem')).getByRole('link', { name: 'Sprint Alpha' }))
      .toHaveAttribute('href', '/boards/b1')
  })

  it('sem mostrarBoard, não repete o board (o widget já está dentro dele)', () => {
    renderizar([base])
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
