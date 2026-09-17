import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Comment } from '@/types/domain'
import { CommentList } from './CommentList'

const comments = (): Comment[] => [
  {
    id: 'c1',
    task_id: 't1',
    body: 'Já testei em staging.',
    created_at: new Date().toISOString(),
    author: { id: 'u1', full_name: 'Ana Lima', avatar_url: null },
  },
]

describe('CommentList', () => {
  it('lista vazia mostra estado vazio com convite a comentar (critério F5.6)', () => {
    render(<CommentList comments={[]} aoComentar={vi.fn()} />)
    expect(screen.getByText('Nenhum comentário ainda')).toBeInTheDocument()
  })

  it('mostra autor e corpo de cada comentário', () => {
    render(<CommentList comments={comments()} aoComentar={vi.fn()} />)
    // "Ana Lima" aparece 2x: sr-only do Avatar + rotulo visivel do autor.
    expect(screen.getAllByText('Ana Lima').length).toBeGreaterThan(0)
    expect(screen.getByText('Já testei em staging.')).toBeInTheDocument()
  })

  it('postar comentário envia o texto e limpa o campo', async () => {
    const aoComentar = vi.fn()
    const user = userEvent.setup()
    render(<CommentList comments={[]} aoComentar={aoComentar} />)

    const campo = screen.getByLabelText('Novo comentário')
    await user.type(campo, 'Ficou ótimo')
    await user.click(screen.getByRole('button', { name: 'Comentar' }))

    expect(aoComentar).toHaveBeenCalledWith('Ficou ótimo')
    expect(campo).toHaveValue('')
  })

  it('não envia comentário vazio', async () => {
    const aoComentar = vi.fn()
    const user = userEvent.setup()
    render(<CommentList comments={[]} aoComentar={aoComentar} />)

    await user.click(screen.getByRole('button', { name: 'Comentar' }))
    expect(aoComentar).not.toHaveBeenCalled()
  })
})
