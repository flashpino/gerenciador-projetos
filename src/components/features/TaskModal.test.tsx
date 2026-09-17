import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Profile, TaskComDetalhe } from '@/types/domain'

vi.mock('@/hooks/useQuadro', () => ({
  useTarefaDetalhe: vi.fn(),
  useAtualizarTarefa: vi.fn(),
  useCriarTarefa: vi.fn(),
  useAtualizarSubtarefa: vi.fn(),
  useCriarSubtarefa: vi.fn(),
  useRemoverSubtarefa: vi.fn(),
  useCriarComentario: vi.fn(),
}))
vi.mock('@/hooks/useSessao', () => ({ useSessao: vi.fn() }))

import * as hooks from '@/hooks/useQuadro'
import { useSessao } from '@/hooks/useSessao'
import { TaskModal } from './TaskModal'

const membros = (): Profile[] => [{ id: 'u1', full_name: 'Ana Lima', avatar_url: null }]
const grupos = () => [{ id: 'g1', name: 'A fazer' }]

const tarefaDetalhe = (): TaskComDetalhe => ({
  id: 't1', board_id: 'b1', group_id: 'g1', title: 'Refatorar arquitetura',
  description: 'Descrição existente', status: 'working', priority: 'high', assignee_id: null,
  start_date: '2026-09-10', due_date: '2026-09-20', progress: 65, estimated_hours: 10,
  logged_hours: 3, is_milestone: false, tags: [], position: 0,
  created_at: '', updated_at: '',
  subtasks: [{ id: 's1', task_id: 't1', title: 'Mapear módulos', done: false, position: 0 }],
  comments: [],
})

function mockMutacao(sucesso = true) {
  return {
    mutate: vi.fn((_vars: unknown, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => {
      if (sucesso) opts?.onSuccess?.()
      else opts?.onError?.(new Error('falhou'))
    }),
    isPending: false,
  }
}

function mockDetalhe() {
  return { data: undefined as TaskComDetalhe | undefined, isPending: false, isError: false, error: null }
}

function configurarMocksPadrao(overrides: Partial<{ detalhe: Partial<ReturnType<typeof mockDetalhe>> }> = {}) {
  vi.mocked(hooks.useTarefaDetalhe).mockReturnValue({ ...mockDetalhe(), ...overrides.detalhe } as never)
  vi.mocked(hooks.useAtualizarTarefa).mockReturnValue(mockMutacao() as never)
  vi.mocked(hooks.useCriarTarefa).mockReturnValue(mockMutacao() as never)
  vi.mocked(hooks.useAtualizarSubtarefa).mockReturnValue(mockMutacao() as never)
  vi.mocked(hooks.useCriarSubtarefa).mockReturnValue(mockMutacao() as never)
  vi.mocked(hooks.useRemoverSubtarefa).mockReturnValue(mockMutacao() as never)
  vi.mocked(hooks.useCriarComentario).mockReturnValue(mockMutacao() as never)
  vi.mocked(useSessao).mockReturnValue({ usuario: { id: 'u1', email: 'a@x.com' }, carregando: false })
}

describe('TaskModal — modo criação', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    configurarMocksPadrao()
  })

  it('abre com título "Nova tarefa" e campo vazio, sem abas', () => {
    render(
      <TaskModal aberto aoFechar={vi.fn()} boardId="b1" taskId={null} grupoInicialId="g1" grupos={grupos()} membros={membros()} />,
    )
    expect(screen.getByRole('dialog', { name: 'Nova tarefa' })).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toHaveValue('')
    expect(screen.queryByRole('tab', { name: 'Subtarefas' })).not.toBeInTheDocument()
  })

  it('título vazio bloqueia salvar, com erro no campo (critério F5.3)', async () => {
    const user = userEvent.setup()
    render(
      <TaskModal aberto aoFechar={vi.fn()} boardId="b1" taskId={null} grupoInicialId="g1" grupos={grupos()} membros={membros()} />,
    )

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('título')
    const criar = vi.mocked(hooks.useCriarTarefa).mock.results[0]?.value.mutate
    expect(criar).not.toHaveBeenCalled()
  })

  it('preenchendo o título e salvando, cria a tarefa e fecha o modal', async () => {
    const aoFechar = vi.fn()
    const user = userEvent.setup()
    render(
      <TaskModal aberto aoFechar={aoFechar} boardId="b1" taskId={null} grupoInicialId="g1" grupos={grupos()} membros={membros()} />,
    )

    await user.type(screen.getByLabelText('Título'), 'Nova tarefa do sprint')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    const criar = vi.mocked(hooks.useCriarTarefa).mock.results[0]?.value.mutate
    expect(criar).toHaveBeenCalledWith(
      expect.objectContaining({ board_id: 'b1', group_id: 'g1', title: 'Nova tarefa do sprint' }),
      expect.anything(),
    )
    expect(aoFechar).toHaveBeenCalled()
  })
})

describe('TaskModal — modo edição', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    configurarMocksPadrao({ detalhe: { data: tarefaDetalhe() } })
  })

  it('pré-preenche os campos com a tarefa carregada', () => {
    render(
      <TaskModal aberto aoFechar={vi.fn()} boardId="b1" taskId="t1" grupoInicialId="g1" grupos={grupos()} membros={membros()} />,
    )
    expect(screen.getByLabelText('Título')).toHaveValue('Refatorar arquitetura')
    expect(screen.getByLabelText('Descrição')).toHaveValue('Descrição existente')
  })

  it('prazo antes do início bloqueia salvar (critério F5.4)', async () => {
    const user = userEvent.setup()
    render(
      <TaskModal aberto aoFechar={vi.fn()} boardId="b1" taskId="t1" grupoInicialId="g1" grupos={grupos()} membros={membros()} />,
    )

    const prazo = screen.getByLabelText('Prazo')
    await user.clear(prazo)
    await user.type(prazo, '2026-09-01')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('prazo')
    const salvar = vi.mocked(hooks.useAtualizarTarefa).mock.results[0]?.value.mutate
    expect(salvar).not.toHaveBeenCalled()
  })

  it('editar e salvar chama atualizarTarefa e fecha o modal (critério F5.2)', async () => {
    const aoFechar = vi.fn()
    const user = userEvent.setup()
    render(
      <TaskModal aberto aoFechar={aoFechar} boardId="b1" taskId="t1" grupoInicialId="g1" grupos={grupos()} membros={membros()} />,
    )

    const titulo = screen.getByLabelText('Título')
    await user.clear(titulo)
    await user.type(titulo, 'Título alterado')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    const salvar = vi.mocked(hooks.useAtualizarTarefa).mock.results[0]?.value.mutate
    expect(salvar).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1', campos: expect.objectContaining({ title: 'Título alterado' }) }),
      expect.anything(),
    )
    expect(aoFechar).toHaveBeenCalled()
  })

  it('aba Subtarefas mostra o contador e permite marcar como feita', async () => {
    const user = userEvent.setup()
    render(
      <TaskModal aberto aoFechar={vi.fn()} boardId="b1" taskId="t1" grupoInicialId="g1" grupos={grupos()} membros={membros()} />,
    )

    await user.click(screen.getByRole('tab', { name: /Subtarefas/ }))
    expect(screen.getByText('0/1')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Mapear módulos' }))
    const alternar = vi.mocked(hooks.useAtualizarSubtarefa).mock.results[0]?.value.mutate
    expect(alternar).toHaveBeenCalledWith({ id: 's1', campos: { done: true } })
  })

  it('aba Atividade mostra estado vazio e permite comentar com o autor logado', async () => {
    const user = userEvent.setup()
    render(
      <TaskModal aberto aoFechar={vi.fn()} boardId="b1" taskId="t1" grupoInicialId="g1" grupos={grupos()} membros={membros()} />,
    )

    await user.click(screen.getByRole('tab', { name: /Atividade/ }))
    expect(screen.getByText('Nenhum comentário ainda')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Novo comentário'), 'Comentário de teste')
    await user.click(screen.getByRole('button', { name: 'Comentar' }))

    const comentar = vi.mocked(hooks.useCriarComentario).mock.results[0]?.value.mutate
    expect(comentar).toHaveBeenCalledWith({ authorId: 'u1', body: 'Comentário de teste' })
  })
})
