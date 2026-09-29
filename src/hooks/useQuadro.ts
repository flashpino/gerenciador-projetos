import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import type { CamposEditaveis, NovaTarefa } from '@/services/boards'
import {
  adicionarMembro,
  atualizarSubtarefa,
  atualizarTarefa,
  buscarAtividades,
  buscarBoard,
  buscarBoards,
  buscarFavoritos,
  buscarGruposComTarefas,
  buscarMembros,
  buscarTarefaDetalhe,
  buscarWorkspaceAtual,
  criarBoard,
  criarComentario,
  criarSubtarefa,
  criarTarefa,
  desfavoritar,
  favoritar,
  removerBoard,
  removerMembro,
  removerSubtarefa,
  renomearBoard,
} from '@/services/boards'
import { ehNaoEncontrado } from '@/services/erros'
import type { GroupComTarefas, GrupoInicial, Subtask, TaskComDetalhe } from '@/types/domain'

/**
 * Chaves de cache centralizadas.
 * Espalhar strings de chave pelo codigo e como espalhar hex: na hora de
 * invalidar, uma delas esta escrita diferente e o cache nao atualiza.
 */
const chaves = {
  workspace: ['workspace'] as const,
  boards: ['boards'] as const,
  board: (boardId: string) => ['board', boardId] as const,
  favoritos: ['favoritos'] as const,
  membros: (workspaceId: string) => ['membros', workspaceId] as const,
  grupos: (boardId: string) => ['grupos', boardId] as const,
  tarefa: (taskId: string) => ['tarefa', taskId] as const,
  atividades: (boardId: string | undefined, limite: number) => ['atividades', boardId ?? 'todos', limite] as const,
  todasAtividades: ['atividades'] as const,
}

/**
 * UPDATE OTIMISTA — o padrão de toda edição por clique (docs/patterns.md).
 * A UI muda na hora e só depois o servidor confirma; se falhar, o valor
 * anterior volta. Sem o rollback a tela fica num estado mentiroso: mostra
 * "Pronto" para algo que o banco nunca aceitou.
 *
 * Extraído na 3ª ocorrência (regra dos três): tarefa, subtarefa, favorito.
 * `aplicar` recebe o dado atual da cache e as variáveis e devolve o novo.
 */
function useMutacaoOtimista<TDado, TVars>(
  chave: QueryKey,
  mutationFn: (vars: TVars) => Promise<unknown>,
  aplicar: (atual: TDado | undefined, vars: TVars) => TDado | undefined,
  /** Outras caches que a mudança torna velhas (ex.: o feed de atividades). */
  invalidarTambem: readonly QueryKey[] = [],
) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn,

    onMutate: async (vars: TVars) => {
      // Cancela refetches em voo: um deles poderia chegar depois e sobrescrever
      // o valor otimista com o dado velho.
      await qc.cancelQueries({ queryKey: chave })
      const anterior = qc.getQueryData<TDado>(chave)
      qc.setQueryData<TDado>(chave, (atual) => aplicar(atual, vars))
      return { anterior }
    },

    onError: (_erro, _vars, ctx) => {
      if (ctx?.anterior) qc.setQueryData(chave, ctx.anterior)
    },

    onSettled: () => {
      // Reconcilia com o servidor em sucesso E em erro: o banco pode ter
      // normalizado algo (trigger de updated_at, constraint) que o otimista nao sabe.
      void qc.invalidateQueries({ queryKey: chave })
      for (const outra of invalidarTambem) void qc.invalidateQueries({ queryKey: outra })
    },
  })
}

export function useWorkspaceAtual() {
  return useQuery({ queryKey: chaves.workspace, queryFn: buscarWorkspaceAtual })
}

export function useBoards() {
  return useQuery({ queryKey: chaves.boards, queryFn: buscarBoards })
}

export function useBoard(boardId: string | undefined) {
  return useQuery({
    queryKey: chaves.board(boardId ?? ''),
    queryFn: () => buscarBoard(boardId as string),
    enabled: Boolean(boardId),
    // Board inexistente não volta a existir numa 2ª tentativa — repetir só
    // atrasa o redirect para /paineis. Falha de rede continua com 1 retry.
    retry: (falhas, erro) => !ehNaoEncontrado(erro) && falhas < 1,
  })
}

/**
 * Criar/renomear/excluir board são ações deliberadas, com botão em `loading` —
 * sem update otimista, mesmo motivo de useCriarTarefa.
 */
export function useCriarBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, name, grupos }: { workspaceId: string; name: string; grupos?: GrupoInicial[] }) =>
      // Não repassa `grupos` undefined: o Vitest trata (a, b, undefined) ≠ (a, b), e os
      // testes do Novo Painel verificam a chamada com dois argumentos.
      grupos ? criarBoard(workspaceId, name, grupos) : criarBoard(workspaceId, name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaves.boards })
    },
  })
}

export function useRenomearBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renomearBoard(id, name),
    onSuccess: (_board, { id }) => {
      void qc.invalidateQueries({ queryKey: chaves.boards })
      void qc.invalidateQueries({ queryKey: chaves.board(id) })
    },
  })
}

export function useExcluirBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => removerBoard(id),
    // Devolve a promessa: o `onSuccess` de quem chamou (fechar o diálogo) só
    // roda com a lista já sem o board — senão o foco volta pro "⋮" de um card
    // que some em seguida e se perde.
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: chaves.boards }),
        // A cascata do banco apagou o favorito junto (0003).
        qc.invalidateQueries({ queryKey: chaves.favoritos }),
      ]),
  })
}

export function useFavoritos() {
  return useQuery({ queryKey: chaves.favoritos, queryFn: buscarFavoritos })
}

/** Estrela é clique de alternância, como a célula da F1 — otimista. */
export function useAlternarFavorito() {
  return useMutacaoOtimista<string[], { boardId: string; favorito: boolean }>(
    chaves.favoritos,
    ({ boardId, favorito }) => (favorito ? favoritar(boardId) : desfavoritar(boardId)),
    (ids = [], { boardId, favorito }) => (favorito ? [...ids, boardId] : ids.filter((id) => id !== boardId)),
  )
}

/** Feed de eventos (0004): do workspace inteiro (`boardId` indefinido) ou de um board. */
export function useAtividades(boardId: string | undefined, limite: number) {
  return useQuery({
    queryKey: chaves.atividades(boardId, limite),
    queryFn: () => buscarAtividades({ boardId, limite }),
  })
}

/** Membros do workspace de um board — com convite, a pessoa vê mais de um workspace. */
export function useMembros(workspaceId: string | undefined) {
  return useQuery({
    queryKey: chaves.membros(workspaceId ?? ''),
    queryFn: () => buscarMembros(workspaceId as string),
    enabled: Boolean(workspaceId),
  })
}

export function useAdicionarMembro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, email }: { workspaceId: string; email: string }) => adicionarMembro(workspaceId, email),
    onSuccess: (_nada, { workspaceId }) => {
      void qc.invalidateQueries({ queryKey: chaves.membros(workspaceId) })
    },
  })
}

export function useRemoverMembro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, userId }: { workspaceId: string; userId: string }) => removerMembro(workspaceId, userId),
    onSuccess: (_nada, { workspaceId }) => {
      void qc.invalidateQueries({ queryKey: chaves.membros(workspaceId) })
    },
  })
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

/** Edição de célula (F1.3): otimista, com rollback se o servidor recusar. */
export function useAtualizarTarefa(boardId: string | undefined) {
  return useMutacaoOtimista<GroupComTarefas[], MutacaoTarefa>(
    chaves.grupos(boardId ?? ''),
    ({ id, campos }) => atualizarTarefa(id, campos),
    (grupos, { id, campos }) =>
      grupos?.map((g) => ({
        ...g,
        tasks: g.tasks.map((t) => (t.id === id ? { ...t, ...campos } : t)),
      })),
    // Mudar status gera evento no banco (gatilho da 0004): o feed fica velho.
    [chaves.todasAtividades],
  )
}

/**
 * Tarefa com subtarefas e comentarios — so o que o TaskModal (F5) precisa.
 * Query separada de useGruposComTarefas: pedir subtasks/comments de toda
 * tarefa visivel na tabela buscaria dado que ninguem olha na maior parte
 * do tempo.
 */
export function useTarefaDetalhe(taskId: string | undefined) {
  return useQuery({
    queryKey: chaves.tarefa(taskId ?? ''),
    queryFn: () => buscarTarefaDetalhe(taskId as string),
    enabled: Boolean(taskId),
  })
}

/**
 * Cria uma tarefa. SEM update otimista: diferente da edicao inline (onde
 * latencia percebida importa a cada clique, docs/specs.md persona), criar
 * pelo modal e uma acao deliberada — o botao "Salvar" ja mostra `loading`
 * e o usuario espera o resultado antes de fechar. Otimista aqui exigiria
 * inserir um id temporario dentro do grupo certo em GroupComTarefas[] pra
 * um ganho de percepcao que ninguem vai notar num clique de "Salvar".
 */
export function useCriarTarefa(boardId: string | undefined) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (campos: NovaTarefa) => criarTarefa(campos),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaves.grupos(boardId ?? '') })
      void qc.invalidateQueries({ queryKey: chaves.todasAtividades })
    },
  })
}

export interface MutacaoSubtarefa {
  id: string
  campos: Partial<Pick<Subtask, 'title' | 'done'>>
}

/** Subtarefa: o contador "4/6" tem que atualizar IMEDIATAMENTE (F5.5) — otimista. */
export function useAtualizarSubtarefa(taskId: string | undefined) {
  return useMutacaoOtimista<TaskComDetalhe, MutacaoSubtarefa>(
    chaves.tarefa(taskId ?? ''),
    ({ id, campos }) => atualizarSubtarefa(id, campos),
    (tarefa, { id, campos }) =>
      tarefa && {
        ...tarefa,
        subtasks: tarefa.subtasks.map((s) => (s.id === id ? { ...s, ...campos } : s)),
      },
  )
}

/** Sem otimismo: adicionar item e mais raro que marcar feito, o ganho nao paga a complexidade. */
export function useCriarSubtarefa(taskId: string | undefined) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ title, position }: { title: string; position: number }) =>
      criarSubtarefa(taskId as string, title, position),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaves.tarefa(taskId ?? '') })
    },
  })
}

export function useRemoverSubtarefa(taskId: string | undefined) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => removerSubtarefa(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaves.tarefa(taskId ?? '') })
    },
  })
}

/** `authorId` vem de useSessao() no componente — este hook nao conhece auth. */
export function useCriarComentario(taskId: string | undefined) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ authorId, body }: { authorId: string; body: string }) =>
      criarComentario(taskId as string, authorId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaves.tarefa(taskId ?? '') })
      void qc.invalidateQueries({ queryKey: chaves.todasAtividades })
    },
  })
}
