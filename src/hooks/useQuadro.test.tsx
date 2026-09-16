import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GroupComTarefas } from '@/types/domain'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarBoardAtual: vi.fn(),
  buscarGruposComTarefas: vi.fn(),
  buscarMembros: vi.fn(),
  atualizarTarefa: vi.fn(),
  criarTarefa: vi.fn(),
  removerTarefa: vi.fn(),
  criarGrupo: vi.fn(),
}))

import * as servico from '@/services/boards'
import { useAtualizarTarefa, useGruposComTarefas } from './useQuadro'

const grupos = (): GroupComTarefas[] => [
  {
    id: 'g1', board_id: 'b1', name: 'Em Execução', color: 'azure', position: 0,
    tasks: [
      {
        id: 't1', board_id: 'b1', group_id: 'g1', title: 'Refatorar arquitetura',
        description: null, status: 'working', priority: 'high', assignee_id: null,
        start_date: null, due_date: null, progress: 65, estimated_hours: null,
        logged_hours: null, is_milestone: false, tags: [], position: 0,
        created_at: '', updated_at: '',
      },
    ],
  },
]

describe('useGruposComTarefas', () => {
  beforeEach(() => vi.resetAllMocks())

  it('1) carregamento inicial expõe loading e depois os dados', async () => {
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue(grupos())
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useGruposComTarefas('b1'), { wrapper })

    expect(result.current.isPending).toBe(true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0]?.tasks[0]?.title).toBe('Refatorar arquitetura')
  })

  it('2) erro de rede vira estado de erro, nao dado vazio silencioso', async () => {
    vi.mocked(servico.buscarGruposComTarefas).mockRejectedValue(new Error('offline'))
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useGruposComTarefas('b1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })

  it('3) lista vazia é sucesso com zero grupos, não erro', async () => {
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue([])
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useGruposComTarefas('b1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('4) não busca enquanto o boardId for indefinido', () => {
    const { wrapper } = criarWrapper()
    renderHook(() => useGruposComTarefas(undefined), { wrapper })
    expect(servico.buscarGruposComTarefas).not.toHaveBeenCalled()
  })
})

describe('useAtualizarTarefa — update otimista', () => {
  beforeEach(() => vi.resetAllMocks())

  it('5) aplica a mudança IMEDIATAMENTE, antes da resposta do servidor', async () => {
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue(grupos())
    // Nunca resolve: prova que a UI nao esperou o servidor.
    vi.mocked(servico.atualizarTarefa).mockImplementation(() => new Promise(() => {}))

    const { wrapper } = criarWrapper()
    const { result } = renderHook(
      () => ({ lista: useGruposComTarefas('b1'), mutar: useAtualizarTarefa('b1') }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.lista.isSuccess).toBe(true))

    result.current.mutar.mutate({ id: 't1', campos: { status: 'done' } })

    await waitFor(() =>
      expect(result.current.lista.data?.[0]?.tasks[0]?.status).toBe('done'),
    )
  })

  it('6) DESFAZ a mudança quando o servidor falha (critério F1.3)', async () => {
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue(grupos())
    vi.mocked(servico.atualizarTarefa).mockRejectedValue(new Error('500'))

    const { wrapper } = criarWrapper()
    const { result } = renderHook(
      () => ({ lista: useGruposComTarefas('b1'), mutar: useAtualizarTarefa('b1') }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.lista.isSuccess).toBe(true))
    expect(result.current.lista.data?.[0]?.tasks[0]?.status).toBe('working')

    result.current.mutar.mutate({ id: 't1', campos: { status: 'done' } })

    await waitFor(() => expect(result.current.mutar.isError).toBe(true))
    // Voltou ao valor anterior: a celula nao pode ficar num estado mentiroso.
    expect(result.current.lista.data?.[0]?.tasks[0]?.status).toBe('working')
  })
})
