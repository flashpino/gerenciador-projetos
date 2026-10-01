/** Espelha os enums do banco (supabase/migrations/0001_init.up.sql). */
export type TaskStatus = 'not_started' | 'working' | 'review' | 'done' | 'stuck'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type GroupColor = 'azure' | 'grape' | 'mint' | 'crimson'

export interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
}

export interface Board {
  id: string
  name: string
  created_at: string
  /** Meus Painéis mostra só os do workspace aberto. */
  workspace_id: string
}

export interface Group {
  id: string
  board_id: string
  name: string
  color: GroupColor
  position: number
}

/** Grupo ainda sem board — o que um modelo (lib/modelos.ts) ou o "Novo Painel" pede para criar. */
export type GrupoInicial = Pick<Group, 'name' | 'color'>

export interface Task {
  id: string
  board_id: string
  group_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee_id: string | null
  start_date: string | null
  due_date: string | null
  progress: number
  estimated_hours: number | null
  logged_hours: number | null
  is_milestone: boolean
  tags: string[]
  position: number
  created_at: string
  updated_at: string
}

/** Grupo com suas tarefas — o formato que a tabela realmente consome. */
export interface GroupComTarefas extends Group {
  tasks: Task[]
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  done: boolean
  position: number
}

export interface Comment {
  id: string
  task_id: string
  body: string
  created_at: string
  author: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

/** Tarefa com o que só o modal de detalhe (F5) precisa — não a tabela/kanban. */
// Nao exportado: so serve de base para Atividade, no mesmo arquivo.
type ActivityKind = 'task_created' | 'status_changed' | 'comment_added'

/** Linha de `activities` (0004), gravada por gatilho — o app só lê. */
export interface Atividade {
  id: number
  board_id: string
  task_id: string | null
  kind: ActivityKind
  /** Cópia: a tarefa pode ter sido renomeada ou apagada depois. */
  task_title: string
  from_status: TaskStatus | null
  to_status: TaskStatus | null
  comment_excerpt: string | null
  created_at: string
  ator: Pick<Profile, 'full_name' | 'avatar_url'> | null
  board: { name: string } | null
}

export interface TaskComDetalhe extends Task {
  subtasks: Subtask[]
  comments: Comment[]
}
