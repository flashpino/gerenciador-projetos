import { supabase } from '@/lib/supabase'
import type { Comment, GroupComTarefas, Profile, Subtask, Task, TaskComDetalhe } from '@/types/domain'
import { traduzirErro } from './erros'

/**
 * CAMADA DE SERVICO — unico lugar que fala com o Supabase.
 *
 * Contrato que toda funcao daqui segue:
 *  - devolve dado ja no formato que a UI consome, nao a linha crua
 *  - lanca ErroDeDados (nunca o erro cru do PostgREST)
 *  - nao conhece React: nada de hook, estado ou cache aqui dentro
 */

/** Board default do usuario. Na v1 ha um workspace e um board por usuario. */
export async function buscarBoardAtual(): Promise<{ id: string; name: string }> {
  const { data, error } = await supabase
    .from('boards')
    .select('id, name')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (error) throw traduzirErro(error)
  return data
}

/**
 * Grupos do board com suas tarefas, prontos para a tabela.
 *
 * Uma query so, com join aninhado: o PostgREST resolve em um round-trip. Buscar
 * grupos e depois tarefas por grupo seria N+1 — a origem mais comum de tela
 * lenta em app com Supabase.
 */
export async function buscarGruposComTarefas(boardId: string): Promise<GroupComTarefas[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('*, tasks(*)')
    .eq('board_id', boardId)
    .order('position', { ascending: true })
    .order('position', { ascending: true, referencedTable: 'tasks' })

  if (error) throw traduzirErro(error)
  return (data ?? []) as GroupComTarefas[]
}

/** Membros do workspace — para o seletor de responsavel e para os avatares. */
export async function buscarMembros(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .order('full_name', { ascending: true })

  if (error) throw traduzirErro(error)
  return data ?? []
}

export type CamposEditaveis = Partial<
  Pick<
    Task,
    | 'title' | 'description' | 'status' | 'priority' | 'assignee_id'
    | 'start_date' | 'due_date' | 'progress' | 'tags' | 'group_id' | 'is_milestone'
  >
>

export async function atualizarTarefa(id: string, campos: CamposEditaveis): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(campos)
    .eq('id', id)
    .select()
    .single()

  if (error) throw traduzirErro(error)
  return data as Task
}

export type NovaTarefa = Omit<CamposEditaveis, 'title' | 'group_id'> & {
  board_id: string
  group_id: string
  title: string
}

/** Criada pelo modal (F5) — unico ponto de escrita rica do app. */
export async function criarTarefa(campos: NovaTarefa): Promise<Task> {
  const { data, error } = await supabase.from('tasks').insert(campos).select().single()
  if (error) throw traduzirErro(error)
  return data as Task
}

/**
 * Tarefa com subtarefas e comentarios — so o que o modal de detalhe (F5)
 * precisa. A tabela/kanban usam buscarGruposComTarefas, que nao traz isso:
 * pedir subtasks/comments de toda tarefa visivel seria buscar dado que
 * ninguem olha na maior parte do tempo.
 */
export async function buscarTarefaDetalhe(taskId: string): Promise<TaskComDetalhe> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, subtasks(*), comments(*, author:profiles(id, full_name, avatar_url))')
    .eq('id', taskId)
    .order('position', { referencedTable: 'subtasks', ascending: true })
    .order('created_at', { referencedTable: 'comments', ascending: false })
    .single()

  if (error) throw traduzirErro(error)
  return data as TaskComDetalhe
}

/** `position` vem de quem chama (tamanho da lista atual) — evita round-trip so pra calcular a proxima posicao. */
export async function criarSubtarefa(taskId: string, title: string, position: number): Promise<Subtask> {
  const { data, error } = await supabase
    .from('subtasks')
    .insert({ task_id: taskId, title, position })
    .select()
    .single()

  if (error) throw traduzirErro(error)
  return data as Subtask
}

export async function atualizarSubtarefa(
  id: string,
  campos: Partial<Pick<Subtask, 'title' | 'done'>>,
): Promise<Subtask> {
  const { data, error } = await supabase.from('subtasks').update(campos).eq('id', id).select().single()
  if (error) throw traduzirErro(error)
  return data as Subtask
}

export async function removerSubtarefa(id: string): Promise<void> {
  const { error } = await supabase.from('subtasks').delete().eq('id', id)
  if (error) throw traduzirErro(error)
}

/** `authorId` vem de useSessao() — o RLS rejeita qualquer valor que nao seja o proprio usuario logado. */
export async function criarComentario(taskId: string, authorId: string, body: string): Promise<Comment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ task_id: taskId, author_id: authorId, body })
    .select('*, author:profiles(id, full_name, avatar_url)')
    .single()

  if (error) throw traduzirErro(error)
  return data as Comment
}

/*
 * removerTarefa e criarGrupo continuam nao escritas — nada as consome ainda.
 * Voltam no commit da feature que precisar delas.
 */
