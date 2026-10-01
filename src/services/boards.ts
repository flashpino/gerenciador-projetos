import { supabase } from '@/lib/supabase'
import type { Atividade, Board, Comment, Group, GroupComTarefas, GrupoInicial, Profile, Subtask, Task, TaskComDetalhe } from '@/types/domain'
import { escolherWorkspace, lerWorkspaceAtual } from '@/lib/workspaceAtual'
import { ErroDeDados, traduzirErro } from './erros'

/**
 * CAMADA DE SERVICO — unico lugar que fala com o Supabase.
 *
 * Contrato que toda funcao daqui segue:
 *  - devolve dado ja no formato que a UI consome, nao a linha crua
 *  - lanca ErroDeDados (nunca o erro cru do PostgREST)
 *  - nao conhece React: nada de hook, estado ou cache aqui dentro
 */

export interface Workspace {
  id: string
  name: string
  owner_id: string
}

async function meuId(): Promise<string> {
  const { data: sessao } = await supabase.auth.getSession()
  const id = sessao.session?.user.id
  if (!id) throw new ErroDeDados('Sua sessão expirou. Entre de novo.')
  return id
}

/** Workspaces de que a pessoa é membro (o RLS de workspaces filtra), na ordem de criação. */
export async function buscarWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('id, name, owner_id')
    .order('created_at', { ascending: true })
  if (error) throw traduzirErro(error)
  return data ?? []
}

/**
 * O workspace aberto agora (lib/workspaceAtual): o último escolhido, senão o próprio, senão o primeiro.
 * Sidebar, Meus Painéis, Novo Painel e Modelos leem este — trocar é `lembrarWorkspaceAtual` + invalidar.
 */
export async function buscarWorkspaceAtual(): Promise<Workspace> {
  const [lista, eu] = await Promise.all([buscarWorkspaces(), meuId()])
  const atual = escolherWorkspace(lista, lerWorkspaceAtual(), eu)
  if (!atual) throw new ErroDeDados('Nenhum workspace disponível.')
  return atual
}

/**
 * Cria um workspace com a pessoa como dona e membro. O id nasce aqui: o RLS de select só mostra
 * workspace de que se é MEMBRO, então pedir a linha de volta no insert falharia antes do 2º passo.
 * Dois inserts (não RPC — uma function atômica seria migration); se o 2º falha, desfaz o 1º.
 */
export async function criarWorkspace(nome: string): Promise<Workspace> {
  const dono = await meuId()
  const ws: Workspace = { id: crypto.randomUUID(), name: nome.trim(), owner_id: dono }

  const { error } = await supabase.from('workspaces').insert(ws)
  if (error) throw traduzirErro(error)

  const { error: erroMembro } = await supabase.from('workspace_members').insert({ workspace_id: ws.id, user_id: dono })
  if (erroMembro) {
    await supabase.from('workspaces').delete().eq('id', ws.id)
    throw traduzirErro(erroMembro)
  }
  return ws
}

export async function renomearWorkspace(id: string, nome: string): Promise<void> {
  const { error } = await supabase.from('workspaces').update({ name: nome.trim() }).eq('id', id)
  if (error) throw traduzirErro(error)
}

/** Só o dono (RLS). O cascade leva boards, grupos, tarefas e a lista de membros. */
export async function excluirWorkspace(id: string): Promise<void> {
  const { error } = await supabase.from('workspaces').delete().eq('id', id)
  if (error) throw traduzirErro(error)
}

/** Boards do workspace (RLS isola). Ordem de criação: o primeiro é o fallback da raiz `/`. */
export async function buscarBoards(): Promise<Board[]> {
  const { data, error } = await supabase
    .from('boards')
    .select('id, name, created_at, workspace_id')
    .order('created_at', { ascending: true })

  if (error) throw traduzirErro(error)
  return data ?? []
}

/** Board + workspace e dono — o diálogo de integrantes precisa dos dois. */
export async function buscarBoard(
  id: string,
): Promise<{ id: string; name: string; workspace_id: string; owner_id: string }> {
  const { data, error } = await supabase
    .from('boards')
    .select('id, name, workspace_id, workspace:workspaces(owner_id)')
    .eq('id', id)
    .single()
  if (error) throw traduzirErro(error)
  const linha = data as unknown as { id: string; name: string; workspace_id: string; workspace: { owner_id: string } }
  return { id: linha.id, name: linha.name, workspace_id: linha.workspace_id, owner_id: linha.workspace.owner_id }
}

const GRUPOS_PADRAO: GrupoInicial[] = [{ name: 'A fazer', color: 'azure' }]

/**
 * Board + grupos iniciais (padrão: "A fazer"), espelhando handle_new_user (0001_init.up.sql): sem
 * grupo, `tasks.group_id` NOT NULL deixa o board sem onde criar tarefa. Dois
 * inserts e não RPC — uma function atômica seria migration (Zona Vermelha).
 */
export async function criarBoard(
  workspaceId: string,
  name: string,
  grupos: GrupoInicial[] = GRUPOS_PADRAO,
): Promise<Board> {
  const { data: board, error } = await supabase
    .from('boards')
    .insert({ workspace_id: workspaceId, name })
    .select('id, name, created_at, workspace_id')
    .single()
  if (error) throw traduzirErro(error)

  const { error: erroGrupo } = await supabase
    .from('groups')
    .insert(grupos.map((g, position) => ({ board_id: board.id, name: g.name, color: g.color, position })))
  if (erroGrupo) throw traduzirErro(erroGrupo)

  return board
}

export async function renomearBoard(id: string, name: string): Promise<Board> {
  const { data, error } = await supabase
    .from('boards')
    .update({ name })
    .eq('id', id)
    .select('id, name, created_at, workspace_id')
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

/** Feed: os `limite` mais recentes, do workspace inteiro ou de um board. RLS isola. */
export async function buscarAtividades({ boardId, limite }: { boardId?: string; limite: number }): Promise<Atividade[]> {
  let consulta = supabase
    .from('activities')
    .select(
      'id, board_id, task_id, kind, task_title, from_status, to_status, comment_excerpt, created_at, ator:profiles(full_name, avatar_url), board:boards(name)',
    )
  if (boardId) consulta = consulta.eq('board_id', boardId)
  const { data, error } = await consulta.order('created_at', { ascending: false }).limit(limite)

  if (error) throw traduzirErro(error)
  return (data ?? []) as unknown as Atividade[]
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

/** Membros de um workspace — para o seletor de responsavel e para os avatares. */
export async function buscarMembros(workspaceId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('perfil:profiles(id, full_name, avatar_url)')
    .eq('workspace_id', workspaceId)
  if (error) throw traduzirErro(error)

  const linhas = (data ?? []) as unknown as { perfil: Profile }[]
  return linhas.map((l) => l.perfil).toSorted((x, y) => x.full_name.localeCompare(y.full_name, 'pt-BR'))
}

/**
 * Nome de exibição da própria pessoa. A policy `profiles_update` (0001/0002) só deixa
 * atualizar o próprio perfil e o check do banco limita o nome a 1–120 caracteres:
 * a validação de verdade é do servidor.
 */
export async function atualizarNomePerfil(userId: string, nome: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name: nome })
    .eq('id', userId)
    .select('id, full_name, avatar_url')
    .single()
  if (error) throw traduzirErro(error)
  return data as Profile
}

/** Só o dono consegue (RPC da 0005). Só acha quem já tem conta — nenhum e-mail é enviado. */
export async function adicionarMembro(workspaceId: string, email: string): Promise<void> {
  const { error } = await supabase.rpc('adicionar_membro', { p_ws: workspaceId, p_email: email })
  // P0002 é o raise da 0005 para e-mail sem conta — a única mensagem de domínio da RPC.
  if (error?.code === 'P0002') throw new ErroDeDados('Nenhuma conta com esse e-mail.', error)
  if (error) throw traduzirErro(error)
}

/** RLS: só o dono apaga, e nunca a própria linha (0005). */
export async function removerMembro(workspaceId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
  if (error) throw traduzirErro(error)
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

/** `position` vem de quem chama (maior atual + 1) — mesmo motivo de criarSubtarefa: sem round-trip só pra calcular. */
export async function criarGrupo(boardId: string, { name, color }: GrupoInicial, position: number): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .insert({ board_id: boardId, name, color, position })
    .select()
    .single()

  if (error) throw traduzirErro(error)
  return data as Group
}

export async function atualizarGrupo(id: string, campos: GrupoInicial): Promise<Group> {
  const { data, error } = await supabase.from('groups').update(campos).eq('id', id).select().single()
  if (error) throw traduzirErro(error)
  return data as Group
}

/** O `on delete cascade` leva as tarefas junto — quem chama só oferece isto para grupo vazio. */
export async function removerGrupo(id: string): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', id)
  if (error) throw traduzirErro(error)
}

/* removerTarefa continua nao escrita — nada a consome ainda. */
