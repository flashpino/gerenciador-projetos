import { estaAtrasada } from '@/lib/date'
import { ORDEM_STATUS, PRIORIDADES } from '@/lib/status'
import type { GroupComTarefas, Task, TaskPriority, TaskStatus } from '@/types/domain'

/**
 * Busca e filtros do board (docs/superpowers/specs/2026-09-30-busca-filtros-design.md).
 * O estado mora na URL; aqui só há lógica pura: ler/escrever a query e decidir
 * se uma tarefa casa. Categorias diferentes se combinam com E; dentro de uma
 * categoria (vários status, por exemplo) vale OU.
 */
export interface FiltroTarefas {
  /** Texto da busca. Casa no título e na descrição, sem diferenciar maiúsculas nem acentos. */
  q: string
  status: TaskStatus[]
  prioridade: TaskPriority[]
  /** id da pessoa, `SEM_RESPONSAVEL`, ou null (qualquer um). */
  responsavel: string | null
  atrasadas: boolean
}

/** Valor de `responsavel` para "tarefas sem ninguém". Nunca colide com um uuid. */
export const SEM_RESPONSAVEL = 'sem'

export const FILTRO_VAZIO: FiltroTarefas = { q: '', status: [], prioridade: [], responsavel: null, atrasadas: false }

// Chaves da query. Só estas são lidas/escritas; qualquer outro parâmetro da URL é preservado.
const CHAVES = ['q', 'status', 'prio', 'resp', 'atrasadas'] as const

const normalizar = (s: string): string => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

/** Valores da lista que existem no domínio; o resto (URL editada à mão) é descartado. */
const validos = <T extends string>(bruto: string | null, permitidos: readonly T[]): T[] =>
  (bruto?.split(',') ?? []).filter((v): v is T => (permitidos as readonly string[]).includes(v))

export function lerFiltro(params: URLSearchParams): FiltroTarefas {
  return {
    q: params.get('q') ?? '',
    status: validos(params.get('status'), ORDEM_STATUS),
    prioridade: validos(params.get('prio'), PRIORIDADES),
    responsavel: params.get('resp') || null,
    atrasadas: params.get('atrasadas') === '1',
  }
}

/** Devolve uma cópia dos `params` com o filtro aplicado; filtro vazio remove as chaves. */
export function escreverFiltro(params: URLSearchParams, f: FiltroTarefas): URLSearchParams {
  const saida = new URLSearchParams(params)
  for (const k of CHAVES) saida.delete(k)
  if (f.q.trim()) saida.set('q', f.q)
  if (f.status.length) saida.set('status', f.status.join(','))
  if (f.prioridade.length) saida.set('prio', f.prioridade.join(','))
  if (f.responsavel) saida.set('resp', f.responsavel)
  if (f.atrasadas) saida.set('atrasadas', '1')
  return saida
}

/** Quantas CATEGORIAS de filtro estão ligadas (a busca não entra: tem o próprio campo). */
export function contarFiltros(f: FiltroTarefas): number {
  return [f.status.length > 0, f.prioridade.length > 0, f.responsavel !== null, f.atrasadas].filter(Boolean).length
}

export const filtroAtivo = (f: FiltroTarefas): boolean => f.q.trim() !== '' || contarFiltros(f) > 0

export function casaTarefa(t: Task, f: FiltroTarefas, hoje = new Date()): boolean {
  const busca = normalizar(f.q)
  if (busca && !normalizar(`${t.title} ${t.description ?? ''}`).includes(busca)) return false
  if (f.status.length && !f.status.includes(t.status)) return false
  if (f.prioridade.length && !f.prioridade.includes(t.priority)) return false
  if (f.responsavel === SEM_RESPONSAVEL && t.assignee_id !== null) return false
  if (f.responsavel && f.responsavel !== SEM_RESPONSAVEL && t.assignee_id !== f.responsavel) return false
  if (f.atrasadas && !estaAtrasada(t.due_date, t.status, hoje)) return false
  return true
}

export const contarTarefas = (grupos: GroupComTarefas[]): number => grupos.reduce((n, g) => n + g.tasks.length, 0)

/**
 * Sem filtro devolve os grupos como vieram (inclusive os vazios: é onde se cria tarefa).
 * Com filtro, grupo sem nenhuma tarefa que case some — senão a tela vira uma pilha de cartões vazios.
 */
export function aplicarFiltro(grupos: GroupComTarefas[], f: FiltroTarefas, hoje = new Date()): GroupComTarefas[] {
  if (!filtroAtivo(f)) return grupos
  return grupos
    .map((g) => ({ ...g, tasks: g.tasks.filter((t) => casaTarefa(t, f, hoje)) }))
    .filter((g) => g.tasks.length > 0)
}
