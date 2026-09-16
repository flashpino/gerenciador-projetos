/** Espelha os enums do banco (supabase/migrations/0001_init.up.sql). */
export type TaskStatus = 'not_started' | 'working' | 'review' | 'done' | 'stuck'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type GroupColor = 'azure' | 'grape' | 'mint' | 'crimson'

export interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
}

// Nao exportado: so serve de base para GroupComTarefas, no mesmo arquivo.
interface Group {
  id: string
  board_id: string
  name: string
  color: GroupColor
  position: number
}

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
