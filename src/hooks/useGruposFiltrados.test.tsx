import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarTarefaFixture as tarefa } from '@/test/fixtures'
import { criarWrapper } from '@/test/query'
import type { GroupComTarefas } from '@/types/domain'

vi.mock('@/services/boards', () => ({ buscarGruposComTarefas: vi.fn() }))

import * as servico from '@/services/boards'
import { useGruposFiltrados } from './useGruposFiltrados'

const grupo = (id: string, tasks: ReturnType<typeof tarefa>[]) =>
  ({ id, board_id: 'b', name: id, color: 'azure', position: 0, tasks }) as GroupComTarefas

function montar(url: string) {
  const { wrapper: Query } = criarWrapper()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Query>
      <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
    </Query>
  )
  return renderHook(() => useGruposFiltrados('b'), { wrapper })
}

describe('useGruposFiltrados', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue([
      grupo('g1', [tarefa({ id: 'a', status: 'working' }), tarefa({ id: 'b', status: 'done' })]),
      grupo('g2', [tarefa({ id: 'c', status: 'done' })]),
    ])
  })

  it('sem filtro: data e todos são o mesmo, contagens iguais, filtro inativo', async () => {
    const { result } = montar('/b')
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data).toBe(result.current.todos)
    expect(result.current.total).toBe(3)
    expect(result.current.visiveis).toBe(3)
    expect(result.current.ativo).toBe(false)
  })

  it('com filtro na URL: data filtrado, todos intacto (o modal de tarefa precisa deles), contagens', async () => {
    const { result } = montar('/b?status=done')
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data?.flatMap((g) => g.tasks.map((t) => t.id))).toEqual(['b', 'c'])
    expect(result.current.todos?.flatMap((g) => g.tasks)).toHaveLength(3)
    expect(result.current.total).toBe(3)
    expect(result.current.visiveis).toBe(2)
    expect(result.current.ativo).toBe(true)
  })

  it('antes de carregar não inventa dados nem contagem', () => {
    vi.mocked(servico.buscarGruposComTarefas).mockReturnValue(new Promise(() => {}))
    const { result } = montar('/b?status=done')
    expect(result.current.data).toBeUndefined()
    expect(result.current.total).toBe(0)
    expect(result.current.visiveis).toBe(0)
    expect(result.current.isPending).toBe(true)
  })
})
