import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Subtask } from '@/types/domain'
import { SubtaskList } from './SubtaskList'

const subtasks = (): Subtask[] => [
  { id: 's1', task_id: 't1', title: 'Mapear módulos', done: true, position: 0 },
  { id: 's2', task_id: 't1', title: 'Escrever testes', done: false, position: 1 },
]

describe('SubtaskList', () => {
  it('mostra o contador feitas/total (critério F5.5)', () => {
    render(<SubtaskList subtasks={subtasks()} aoAlternar={vi.fn()} aoAdicionar={vi.fn()} aoRemover={vi.fn()} />)
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  it('marcar uma subtarefa chama aoAlternar com o novo valor', async () => {
    const aoAlternar = vi.fn()
    const user = userEvent.setup()
    render(<SubtaskList subtasks={subtasks()} aoAlternar={aoAlternar} aoAdicionar={vi.fn()} aoRemover={vi.fn()} />)

    await user.click(screen.getByRole('checkbox', { name: 'Escrever testes' }))
    expect(aoAlternar).toHaveBeenCalledWith('s2', true)
  })

  it('adicionar subtarefa envia o título e limpa o campo', async () => {
    const aoAdicionar = vi.fn()
    const user = userEvent.setup()
    render(<SubtaskList subtasks={subtasks()} aoAlternar={vi.fn()} aoAdicionar={aoAdicionar} aoRemover={vi.fn()} />)

    const campo = screen.getByLabelText('Nova subtarefa')
    await user.type(campo, 'Revisar PR')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    expect(aoAdicionar).toHaveBeenCalledWith('Revisar PR')
    expect(campo).toHaveValue('')
  })

  it('não envia subtarefa com título vazio', async () => {
    const aoAdicionar = vi.fn()
    const user = userEvent.setup()
    render(<SubtaskList subtasks={subtasks()} aoAlternar={vi.fn()} aoAdicionar={aoAdicionar} aoRemover={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect(aoAdicionar).not.toHaveBeenCalled()
  })

  it('remover subtarefa chama aoRemover com o id', async () => {
    const aoRemover = vi.fn()
    const user = userEvent.setup()
    render(<SubtaskList subtasks={subtasks()} aoAlternar={vi.fn()} aoAdicionar={vi.fn()} aoRemover={aoRemover} />)

    await user.click(screen.getByRole('button', { name: 'Remover Escrever testes' }))
    expect(aoRemover).toHaveBeenCalledWith('s2')
  })

  it('lista vazia mostra estado vazio, não uma lista muda', () => {
    render(<SubtaskList subtasks={[]} aoAlternar={vi.fn()} aoAdicionar={vi.fn()} aoRemover={vi.fn()} />)
    expect(screen.getByText('Nenhuma subtarefa ainda')).toBeInTheDocument()
  })
})
