import { supabase } from '@/lib/supabase'
import type { GroupComTarefas, Profile, Task } from '@/types/domain'
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

/*
 * criarTarefa, removerTarefa e criarGrupo foram escritas e APAGADAS aqui.
 * Nada as consumia ainda — o knip apontou como export morto. Voltam no mesmo
 * commit da feature que precisar delas (modal de tarefa, criacao de grupo).
 * Escrever camada "para depois" e o boilerplate que o manual manda cortar.
 */
