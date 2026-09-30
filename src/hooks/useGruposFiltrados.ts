import { useMemo } from 'react'
import { aplicarFiltro, contarTarefas, filtroAtivo } from '@/lib/filtro'
import { useFiltroTarefas } from './useFiltroTarefas'
import { useGruposComTarefas } from './useQuadro'

/**
 * `useGruposComTarefas` + o filtro da URL. Tabela, Kanban e Gantt leem `data`.
 * `todos` fica SEM filtro de propósito: o modal de tarefa (grupo de destino,
 * "Adicionar item") precisa enxergar também os grupos que o filtro escondeu.
 */
export type GruposFiltrados = ReturnType<typeof useGruposFiltrados>

export function useGruposFiltrados(boardId: string | undefined) {
  const grupos = useGruposComTarefas(boardId)
  const { filtro, limpar } = useFiltroTarefas()
  const todos = grupos.data

  const data = useMemo(() => (todos ? aplicarFiltro(todos, filtro) : undefined), [todos, filtro])

  return {
    ...grupos,
    todos,
    data,
    total: todos ? contarTarefas(todos) : 0,
    visiveis: data ? contarTarefas(data) : 0,
    filtro,
    ativo: filtroAtivo(filtro),
    limpar,
  }
}
