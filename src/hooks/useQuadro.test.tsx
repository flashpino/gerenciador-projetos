import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GroupComTarefas } from '@/types/domain'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarGruposComTarefas: vi.fn(),
  buscarMembros: vi.fn(),
  atualizarTarefa: vi.fn(),
  criarTarefa: vi.fn(),
  removerTarefa: vi.fn(),
  criarGrupo: vi.fn(),
  buscarTarefaDetalhe: vi.fn(),
  atualizarSubtarefa: vi.fn(),
  criarSubtarefa: vi.fn(),
  removerSubtarefa: vi.fn(),
  criarComentario: vi.fn(),
  buscarBoards: vi.fn(),
  buscarBoard: vi.fn(),
  criarBoard: vi.fn(),
  renomearBoard: vi.fn(),
  removerBoard: vi.fn(),
  buscarFavoritos: vi.fn(),
  favoritar: vi.fn(),
  desfavoritar: vi.fn(),
  buscarAtividades: vi.fn(),
}))

import type { TaskComDetalhe } from '@/types/domain'
import * as servico from '@/services/boards'
import { ErroDeDados } from '@/services/erros'
import {
  useAlternarFavorito,
  useAtividades,
  useAtualizarSubtarefa,
  useAtualizarTarefa,
  useBoard,
  useBoards,
  useCriarBoard,
  useCriarComentario,
  useCriarSubtarefa,
  useCriarTarefa,
  useExcluirBoard,
  useFavoritos,
  useGruposComTarefas,
  useRemoverSubtarefa,
  useRenomearBoard,
  useTarefaDetalhe,
} from './useQuadro'

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

const tarefaDetalhe = (): TaskComDetalhe => ({
  id: 't1', board_id: 'b1', group_id: 'g1', title: 'Refatorar arquitetura',
  description: null, status: 'working', priority: 'high', assignee_id: null,
  start_date: null, due_date: null, progress: 65, estimated_hours: null,
  logged_hours: null, is_milestone: false, tags: [], position: 0,
  created_at: '', updated_at: '',
  subtasks: [
    { id: 's1', task_id: 't1', title: 'Mapear módulos', done: false, position: 0 },
  ],
  comments: [],
})

describe('useTarefaDetalhe', () => {
  beforeEach(() => vi.resetAllMocks())

  it('carrega a tarefa com subtarefas e comentários', async () => {
    vi.mocked(servico.buscarTarefaDetalhe).mockResolvedValue(tarefaDetalhe())
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useTarefaDetalhe('t1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.subtasks[0]?.title).toBe('Mapear módulos')
  })

  it('não busca enquanto o taskId for indefinido', () => {
    const { wrapper } = criarWrapper()
    renderHook(() => useTarefaDetalhe(undefined), { wrapper })
    expect(servico.buscarTarefaDetalhe).not.toHaveBeenCalled()
  })
})

describe('useCriarTarefa', () => {
  beforeEach(() => vi.resetAllMocks())

  it('cria a tarefa e invalida a lista de grupos', async () => {
    vi.mocked(servico.criarTarefa).mockResolvedValue({ id: 't2' } as never)
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useCriarTarefa('b1'), { wrapper })

    result.current.mutate({ board_id: 'b1', group_id: 'g1', title: 'Nova tarefa' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(servico.criarTarefa).toHaveBeenCalledWith({ board_id: 'b1', group_id: 'g1', title: 'Nova tarefa' })
  })
})

describe('useAtualizarSubtarefa — update otimista (critério F5.5)', () => {
  beforeEach(() => vi.resetAllMocks())

  it('marca como feita IMEDIATAMENTE, antes da resposta do servidor', async () => {
    vi.mocked(servico.buscarTarefaDetalhe).mockResolvedValue(tarefaDetalhe())
    vi.mocked(servico.atualizarSubtarefa).mockImplementation(() => new Promise(() => {}))

    const { wrapper } = criarWrapper()
    const { result } = renderHook(
      () => ({ detalhe: useTarefaDetalhe('t1'), mutar: useAtualizarSubtarefa('t1') }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.detalhe.isSuccess).toBe(true))

    result.current.mutar.mutate({ id: 's1', campos: { done: true } })

    await waitFor(() => expect(result.current.detalhe.data?.subtasks[0]?.done).toBe(true))
  })

  it('desfaz quando o servidor falha', async () => {
    vi.mocked(servico.buscarTarefaDetalhe).mockResolvedValue(tarefaDetalhe())
    vi.mocked(servico.atualizarSubtarefa).mockRejectedValue(new Error('500'))

    const { wrapper } = criarWrapper()
    const { result } = renderHook(
      () => ({ detalhe: useTarefaDetalhe('t1'), mutar: useAtualizarSubtarefa('t1') }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.detalhe.isSuccess).toBe(true))

    result.current.mutar.mutate({ id: 's1', campos: { done: true } })

    await waitFor(() => expect(result.current.mutar.isError).toBe(true))
    expect(result.current.detalhe.data?.subtasks[0]?.done).toBe(false)
  })
})

describe('useCriarSubtarefa / useRemoverSubtarefa / useCriarComentario', () => {
  beforeEach(() => vi.resetAllMocks())

  it('useCriarSubtarefa chama o serviço com a posição informada', async () => {
    vi.mocked(servico.criarSubtarefa).mockResolvedValue({ id: 's2' } as never)
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useCriarSubtarefa('t1'), { wrapper })

    result.current.mutate({ title: 'Nova subtarefa', position: 1 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(servico.criarSubtarefa).toHaveBeenCalledWith('t1', 'Nova subtarefa', 1)
  })

  it('useRemoverSubtarefa chama o serviço com o id', async () => {
    vi.mocked(servico.removerSubtarefa).mockResolvedValue(undefined)
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useRemoverSubtarefa('t1'), { wrapper })

    result.current.mutate('s1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(servico.removerSubtarefa).toHaveBeenCalledWith('s1')
  })

  it('useCriarComentario repassa o authorId de quem chama, não conhece auth sozinho', async () => {
    vi.mocked(servico.criarComentario).mockResolvedValue({ id: 'c1' } as never)
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useCriarComentario('t1'), { wrapper })

    result.current.mutate({ authorId: 'u1', body: 'Comentário' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(servico.criarComentario).toHaveBeenCalledWith('t1', 'u1', 'Comentário')
  })
})

describe('boards — lista, um board e CRUD', () => {
  beforeEach(() => vi.resetAllMocks())

  it('useBoards devolve a lista na ordem que o serviço entregou', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue([
      { id: 'b1', name: 'Sprint Alpha', created_at: '2026-09-01T10:00:00Z' },
      { id: 'b2', name: 'Roadmap', created_at: '2026-09-10T10:00:00Z' },
    ])
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useBoards(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map((b) => b.id)).toEqual(['b1', 'b2'])
  })

  it('useBoard NÃO repete a busca quando o board não existe — repetir só atrasa o redirect', async () => {
    vi.mocked(servico.buscarBoard).mockRejectedValue(
      new ErroDeDados('Registro não encontrado.', { code: 'PGRST116' }),
    )
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useBoard('nao-existe'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(servico.buscarBoard).toHaveBeenCalledTimes(1)
  })

  it('useBoard repete uma vez quando a falha é transitória (rede)', async () => {
    vi.mocked(servico.buscarBoard).mockRejectedValue(new ErroDeDados('Não foi possível completar a operação.'))
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useBoard('b1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 4000 })
    expect(servico.buscarBoard).toHaveBeenCalledTimes(2)
  })

  it('useBoard não busca enquanto o boardId for indefinido', () => {
    const { wrapper } = criarWrapper()
    renderHook(() => useBoard(undefined), { wrapper })
    expect(servico.buscarBoard).not.toHaveBeenCalled()
  })

  it('useCriarBoard repassa workspaceId e nome ao serviço', async () => {
    vi.mocked(servico.criarBoard).mockResolvedValue({ id: 'b3', name: 'Novo', created_at: '' })
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useCriarBoard(), { wrapper })

    result.current.mutate({ workspaceId: 'w1', name: 'Novo' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(servico.criarBoard).toHaveBeenCalledWith('w1', 'Novo')
  })

  it('useRenomearBoard repassa id e nome', async () => {
    vi.mocked(servico.renomearBoard).mockResolvedValue({ id: 'b1', name: 'Outro', created_at: '' })
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useRenomearBoard(), { wrapper })

    result.current.mutate({ id: 'b1', name: 'Outro' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(servico.renomearBoard).toHaveBeenCalledWith('b1', 'Outro')
  })

  it('useExcluirBoard repassa o id', async () => {
    vi.mocked(servico.removerBoard).mockResolvedValue(undefined)
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useExcluirBoard(), { wrapper })

    result.current.mutate('b1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(servico.removerBoard).toHaveBeenCalledWith('b1')
  })
})

describe('favoritos — alternância otimista', () => {
  beforeEach(() => vi.resetAllMocks())

  it('favoritar aparece IMEDIATAMENTE, antes da resposta do servidor', async () => {
    vi.mocked(servico.buscarFavoritos).mockResolvedValue([])
    vi.mocked(servico.favoritar).mockImplementation(() => new Promise(() => {}))
    const { wrapper } = criarWrapper()
    const { result } = renderHook(
      () => ({ lista: useFavoritos(), alternar: useAlternarFavorito() }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.lista.isSuccess).toBe(true))

    result.current.alternar.mutate({ boardId: 'b1', favorito: true })

    await waitFor(() => expect(result.current.lista.data).toEqual(['b1']))
    expect(servico.favoritar).toHaveBeenCalledWith('b1')
  })

  it('desfaz quando o servidor falha', async () => {
    vi.mocked(servico.buscarFavoritos).mockResolvedValue(['b1'])
    vi.mocked(servico.desfavoritar).mockRejectedValue(new Error('500'))
    const { wrapper } = criarWrapper()
    const { result } = renderHook(
      () => ({ lista: useFavoritos(), alternar: useAlternarFavorito() }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.lista.isSuccess).toBe(true))

    result.current.alternar.mutate({ boardId: 'b1', favorito: false })

    await waitFor(() => expect(result.current.alternar.isError).toBe(true))
    expect(result.current.lista.data).toEqual(['b1'])
    expect(servico.desfavoritar).toHaveBeenCalledWith('b1')
  })
})

describe('atividades', () => {
  beforeEach(() => vi.resetAllMocks())

  it('useAtividades repassa boardId e limite ao serviço', async () => {
    vi.mocked(servico.buscarAtividades).mockResolvedValue([])
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useAtividades('b1', 10), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(servico.buscarAtividades).toHaveBeenCalledWith({ boardId: 'b1', limite: 10 })
  })

  it('mudar uma tarefa invalida o feed — o evento novo aparece sem esperar o staleTime', async () => {
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue(grupos())
    vi.mocked(servico.atualizarTarefa).mockResolvedValue({} as never)
    const { wrapper, client } = criarWrapper()
    const espiao = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useAtualizarTarefa('b1'), { wrapper })

    result.current.mutate({ id: 't1', campos: { status: 'done' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(espiao).toHaveBeenCalledWith({ queryKey: ['atividades'] })
  })

  it('comentar invalida o feed', async () => {
    vi.mocked(servico.criarComentario).mockResolvedValue({ id: 'c1' } as never)
    const { wrapper, client } = criarWrapper()
    const espiao = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCriarComentario('t1'), { wrapper })

    result.current.mutate({ authorId: 'u1', body: 'oi' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(espiao).toHaveBeenCalledWith({ queryKey: ['atividades'] })
  })
})
