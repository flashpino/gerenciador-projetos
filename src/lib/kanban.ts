import type { GroupComTarefas, Task, TaskStatus } from '@/types/domain'
import { ORDEM_STATUS, STATUS } from './status'

export interface ColunaKanban {
  status: TaskStatus
  /** Rotulo em TEXTO. Vai junto porque cor sozinha reprova em WCAG 1.4.1. */
  rotulo: string
  tarefas: Task[]
}

/**
 * Transforma os grupos do board nas colunas do kanban.
 *
 * O kanban e a MESMA consulta da tabela, recortada de outro jeito: a tabela
 * agrupa por `group_id`, o kanban por `status`. Por isso nao ha hook nem
 * funcao de servico nova — `useGruposComTarefas` alimenta os dois.
 *
 * Parte sempre de ORDEM_STATUS, nunca dos status presentes nos dados. Uma
 * coluna derivada do que existe some quando esvazia, e dai nao ha para onde
 * arrastar de volta a ultima tarefa que saiu dela (criterios F2.1 e F2.5).
 */
export function colunasPorStatus(grupos: readonly GroupComTarefas[]): ColunaKanban[] {
  // Ordena por grupo e depois por position: e a mesma ordem que
  // buscarGruposComTarefas pede ao banco. Reproduzi-la aqui mantem o card no
  // lugar entre um refetch e outro — sem isso ele troca de posicao sozinho
  // quando o cache reconcilia.
  const tarefas = grupos
    .toSorted((a, b) => a.position - b.position)
    .flatMap((g) => g.tasks.toSorted((a, b) => a.position - b.position))

  return ORDEM_STATUS.map((status) => ({
    status,
    rotulo: STATUS[status].rotulo,
    tarefas: tarefas.filter((t) => t.status === status),
  }))
}
