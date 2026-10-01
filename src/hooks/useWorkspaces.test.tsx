import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarWorkspaces: vi.fn(),
  buscarWorkspaceAtual: vi.fn(),
  criarWorkspace: vi.fn(),
  renomearWorkspace: vi.fn(),
  excluirWorkspace: vi.fn(),
}))

import * as servico from '@/services/boards'
import { lerWorkspaceAtual } from '@/lib/workspaceAtual'
import { useCriarWorkspace, useExcluirWorkspace, useRenomearWorkspace, useTrocarWorkspace, useWorkspaces } from './useQuadro'

describe('hooks de workspaces', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  it('useWorkspaces lista os workspaces da pessoa', async () => {
    vi.mocked(servico.buscarWorkspaces).mockResolvedValue([{ id: 'w1', name: 'Meu', owner_id: 'u1' }])
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useWorkspaces(), { wrapper })
    await waitFor(() => expect(result.current.data?.[0]?.name).toBe('Meu'))
  })

  it('trocar lembra a escolha e recarrega o workspace atual', () => {
    const { wrapper, client } = criarWrapper()
    const espiao = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useTrocarWorkspace(), { wrapper })

    act(() => result.current('w-clientes'))

    expect(lerWorkspaceAtual()).toBe('w-clientes')
    expect(espiao).toHaveBeenCalledWith({ queryKey: ['workspace'] })
  })

  it('criar abre o workspace novo na hora', async () => {
    vi.mocked(servico.criarWorkspace).mockResolvedValue({ id: 'w-novo', name: 'Clientes', owner_id: 'u1' })
    const { wrapper, client } = criarWrapper()
    const espiao = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCriarWorkspace(), { wrapper })

    result.current.mutate('Clientes')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(lerWorkspaceAtual()).toBe('w-novo')
    expect(espiao).toHaveBeenCalledWith({ queryKey: ['workspaces'] })
    expect(espiao).toHaveBeenCalledWith({ queryKey: ['workspace'] })
  })

  it('renomear recarrega a lista e o atual', async () => {
    vi.mocked(servico.renomearWorkspace).mockResolvedValue(undefined)
    const { wrapper, client } = criarWrapper()
    const espiao = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useRenomearWorkspace(), { wrapper })

    result.current.mutate({ id: 'w1', nome: 'Novo nome' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(servico.renomearWorkspace).toHaveBeenCalledWith('w1', 'Novo nome')
    expect(espiao).toHaveBeenCalledWith({ queryKey: ['workspaces'] })
  })

  it('excluir recarrega lista, atual, painéis e favoritos (o cascade levou os boards)', async () => {
    vi.mocked(servico.excluirWorkspace).mockResolvedValue(undefined)
    const { wrapper, client } = criarWrapper()
    const espiao = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useExcluirWorkspace(), { wrapper })

    result.current.mutate('w1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    for (const chave of [['workspaces'], ['workspace'], ['boards'], ['favoritos']]) {
      expect(espiao).toHaveBeenCalledWith({ queryKey: chave })
    }
  })
})
