import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CamposEditaveis } from '@/services/boards'
import {
  atualizarTarefa,
  buscarBoardAtual,
  buscarGruposComTarefas,
  buscarMembros,
} from '@/services/boards'
import type { GroupComTarefas } from '@/types/domain'

/**
 * Chaves de cache centralizadas.
 * Espalhar strings de chave pelo codigo e como espalhar hex: na hora de
 * invalidar, uma delas esta escrita diferente e o cache nao atualiza.
 */
const chaves = {
  board: ['board'] as const,
  membros: ['membros'] as const,
  grupos: (boardId: string) => ['grupos', boardId] as const,
}

export function useBoardAtual() {
  return useQuery({ queryKey: chaves.board, queryFn: buscarBoardAtual })
}

export function useMembros() {
  return useQuery({ queryKey: chaves.membros, queryFn: buscarMembros })
}

export function useGruposComTarefas(boardId: string | undefined) {
  return useQuery({
    queryKey: chaves.grupos(boardId ?? ''),
    queryFn: () => buscarGruposComTarefas(boardId as string),
    // Sem board nao ha o que buscar. Sem isto, a query dispara com id vazio
    // e o erro aparece como "nao encontrado" em vez de "ainda carregando".
    enabled: Boolean(boardId),
  })
}

export interface MutacaoTarefa {
  id: string
  campos: CamposEditaveis
}

/**
 * Atualiza uma tarefa com UPDATE OTIMISTA.
 *
 * A UI muda na hora e so depois o servidor confirma. Se falhar, o valor anterior
 * volta (criterio F1.3). Sem o rollback a celula fica num estado mentiroso: mostra
 * "Pronto" para algo que o banco nunca aceitou.
 *
 * Este e o padrao que TODAS as mutacoes do app seguem. Ver docs/patterns.md.
 */
export function useAtualizarTarefa(boardId: string | undefined) {
  const qc = useQueryClient()
  const chave = chaves.grupos(boardId ?? '')

  return useMutation({
    mutationFn: ({ id, campos }: MutacaoTarefa) => atualizarTarefa(id, campos),

    onMutate: async ({ id, campos }) => {
      // Cancela refetches em voo: um deles poderia chegar depois e sobrescrever
      // o valor otimista com o dado velho.
      await qc.cancelQueries({ queryKey: chave })
      const anterior = qc.getQueryData<GroupComTarefas[]>(chave)

      qc.setQueryData<GroupComTarefas[]>(chave, (grupos) =>
        grupos?.map((g) => ({
          ...g,
          tasks: g.tasks.map((t) => (t.id === id ? { ...t, ...campos } : t)),
        })),
      )

      return { anterior }
    },

    onError: (_erro, _vars, ctx) => {
      // Rollback. `ctx.anterior` e o snapshot tirado no onMutate.
      if (ctx?.anterior) qc.setQueryData(chave, ctx.anterior)
    },

    onSettled: () => {
      // Reconcilia com o servidor em sucesso E em erro: o banco pode ter
      // normalizado algo (trigger de updated_at, constraint) que o otimista nao sabe.
      void qc.invalidateQueries({ queryKey: chave })
    },
  })
}
