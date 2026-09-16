import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ORDEM_STATUS } from '@/lib/status'
import type { GroupComTarefas, Profile, Task } from '@/types/domain'
import { KanbanBoard } from './KanbanBoard'

function tarefa(id: string, status: Task['status'], title: string): Task {
  return {
    id, board_id: 'b', group_id: 'g', title,
    description: null, status, priority: 'medium', assignee_id: null,
    start_date: null, due_date: null, progress: 0, estimated_hours: null,
    logged_hours: null, is_milestone: false, tags: [], position: 0,
    created_at: '', updated_at: '',
  }
}

const GRUPOS: GroupComTarefas[] = [
  {
    id: 'g1', board_id: 'b', name: 'Em Execução', color: 'azure', position: 0,
    tasks: [tarefa('t1', 'working', 'Refatorar'), tarefa('t2', 'done', 'Subir migration')],
  },
]
const MEMBROS: Profile[] = []

describe('KanbanBoard', () => {
  // F2.1
  it('renderiza UMA coluna por status, cada uma com sua contagem', () => {
    render(<KanbanBoard grupos={GRUPOS} membros={MEMBROS} aoMover={() => {}} aoAbrir={() => {}} />)

    expect(screen.getAllByRole('region')).toHaveLength(ORDEM_STATUS.length)
    const emAndamento = screen.getByRole('region', { name: /em andamento/i })
    expect(within(emAndamento).getByText('1')).toBeVisible()
  })

  // F2.5
  it('mantém a coluna vazia com área que anuncia o vazio em texto', () => {
    render(<KanbanBoard grupos={GRUPOS} membros={MEMBROS} aoMover={() => {}} aoAbrir={() => {}} />)

    expect(screen.getByText('Nenhuma tarefa em Travado')).toBeVisible()
  })

  it('põe cada tarefa na coluna do seu status', () => {
    render(<KanbanBoard grupos={GRUPOS} membros={MEMBROS} aoMover={() => {}} aoAbrir={() => {}} />)

    const emAndamento = screen.getByRole('region', { name: /em andamento/i })
    expect(within(emAndamento).getByRole('button', { name: 'Refatorar' })).toBeVisible()
  })

  // F2.2 pelo caminho acessível. O arrastar (Task 6) chama o MESMO aoMover.
  it('mover pelo menu chama aoMover com a tarefa e o destino', async () => {
    const user = userEvent.setup()
    const aoMover = vi.fn()
    render(<KanbanBoard grupos={GRUPOS} membros={MEMBROS} aoMover={aoMover} aoAbrir={() => {}} />)

    await user.click(screen.getByRole('button', { name: /ações de refatorar/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Mover para Em revisão' }))

    expect(aoMover).toHaveBeenCalledWith('t1', 'review')
  })

  // F2.3: "com a mudança anunciada". Sem região viva, quem usa leitor de tela
  // aciona "Mover para Pronto" e não recebe confirmação nenhuma.
  it('anuncia a movimentação numa região viva', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard grupos={GRUPOS} membros={MEMBROS} aoMover={() => {}} aoAbrir={() => {}} />)

    await user.click(screen.getByRole('button', { name: /ações de refatorar/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Mover para Em revisão' }))

    // Desde que os anúncios do próprio dnd-kit foram silenciados (não removidos —
    // ele sempre injeta seu <div role="status"> vazio), há dois status na árvore.
    // O nosso é o <output>; o do dnd-kit nunca ganha texto.
    const nosso = screen.getAllByRole('status').find((el) => el.tagName === 'OUTPUT')
    expect(nosso).toHaveTextContent('Refatorar movida para Em revisão')
  })

  // F2.6: em 375px navega-se uma coluna por vez, sem perder acesso a nenhuma.
  it('oferece uma faixa de abas para alternar de coluna', () => {
    render(<KanbanBoard grupos={GRUPOS} membros={MEMBROS} aoMover={() => {}} aoAbrir={() => {}} />)

    expect(screen.getByRole('tablist', { name: /colunas/i })).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(ORDEM_STATUS.length)
  })
})
