import { supabase } from '@/lib/supabase'
import type { Board, Comment, GroupComTarefas, Profile, Subtask, Task, TaskComDetalhe } from '@/types/domain'
import { traduzirErro } from './erros'

/**
 * CAMADA DE SERVICO — unico lugar que fala com o Supabase.
 *
 * Contrato que toda funcao daqui segue:
 *  - devolve dado ja no formato que a UI consome, nao a linha crua
 *  - lanca ErroDeDados (nunca o erro cru do PostgREST)
 *  - nao conhece React: nada de hook, estado ou cache aqui dentro
 */

/**
 * Workspace do usuario. Na v1 ha um workspace por usuario — usado pela Sidebar
 * pra mostrar o nome e pelo BoardFormModal pra criar board nele.
 */
export async function buscarWorkspaceAtual(): Promise<{ id: string; name: string }> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('id, name')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (error) throw traduzirErro(error)
  return data
}

/** Boards do workspace (RLS isola). Ordem de criação: o primeiro é o fallback da raiz `/`. */
export async function buscarBoards(): Promise<Board[]> {
  const { data, error } = await supabase
    .from('boards')
    .select('id, name, created_at')
    .order('created_at', { ascending: true })

  if (error) throw traduzirErro(error)
  return data ?? []
}

export async function buscarBoard(id: string): Promise<{ id: string; name: string }> {
  const { data, error } = await supabase.from('boards').select('id, name').eq('id', id).single()
  if (error) throw traduzirErro(error)
  return data
}

/**
 * Board + grupo "A fazer", espelhando handle_new_user (0001_init.up.sql): sem
 * grupo, `tasks.group_id` NOT NULL deixa o board sem onde criar tarefa. Dois
 * inserts e não RPC — uma function atômica seria migration (Zona Vermelha).
 */
export async function criarBoard(workspaceId: string, name: string): Promise<Board> {
  const { data: board, error } = await supabase
    .from('boards')
    .insert({ workspace_id: workspaceId, name })
    .select('id, name, created_at')
    .single()
  if (error) throw traduzirErro(error)

  const { error: erroGrupo } = await supabase
    .from('groups')
    .insert({ board_id: board.id, name: 'A fazer', color: 'azure', position: 0 })
  if (erroGrupo) throw traduzirErro(erroGrupo)

  return board
}

export async function renomearBoard(id: string, name: string): Promise<Board> {
  const { data, error } = await supabase
    .from('boards')
    .update({ name })
    .eq('id', id)
    .select('id, name, created_at')
    .single()

  if (error) throw traduzirErro(error)
  return data
}

/** O `on delete cascade` do schema leva grupos, tarefas, subtarefas e comentários junto. */
export async function removerBoard(id: string): Promise<void> {
  const { error } = await supabase.from('boards').delete().eq('id', id)
  if (error) throw traduzirErro(error)
}

/** Ids dos boards favoritados pela pessoa logada — o RLS de board_favorites filtra. */
export async function buscarFavoritos(): Promise<string[]> {
  const { data, error } = await supabase.from('board_favorites').select('board_id')
  if (error) throw traduzirErro(error)
  return (data ?? []).map((f) => f.board_id as string)
}

/** Sem user_id: o `default auth.uid()` preenche e a policy confere (0003). */
export async function favoritar(boardId: string): Promise<void> {
  const { error } = await supabase.from('board_favorites').insert({ board_id: boardId })
  if (error) throw traduzirErro(error)
}

/** Filtra só por board: o RLS já restringe o delete aos favoritos da própria pessoa. */
export async function desfavoritar(boardId: string): Promise<void> {
  const { error } = await supabase.from('board_favorites').delete().eq('board_id', boardId)
  if (error) throw traduzirErro(error)
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
