import type { Task } from '@/types/domain'

/** Tarefa minima para teste — so preenche o que o teste especifica em extra. */
export function criarTarefaFixture(extra: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(), board_id: 'b', group_id: 'g', title: 't',
    description: null, status: 'working', priority: 'medium', assignee_id: null,
    start_date: null, due_date: null, progress: 0, estimated_hours: null,
    logged_hours: null, is_milestone: false, tags: [], position: 0,
    created_at: '', updated_at: '', ...extra,
  }
}
