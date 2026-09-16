import type { Task, TaskStatus } from '@/types/domain'
import { estaAtrasada } from './date'
import { ORDEM_STATUS } from './status'

export interface FatiaStatus {
  status: TaskStatus
  quantidade: number
  percentual: number
}

/** Concluidas sobre total, uma casa decimal. 0 para lista vazia — nunca NaN. */
export function taxaDeConclusao(tarefas: readonly Task[]): number {
  if (tarefas.length === 0) return 0
  const feitas = tarefas.filter((t) => t.status === 'done').length
  return Math.round((feitas / tarefas.length) * 1000) / 10
}

/**
 * Distribuicao por status, omitindo os zerados.
 *
 * Os percentuais somam exatamente 100. Arredondar cada fatia de forma
 * independente produz 99.9 ou 100.1, e a barra empilhada fica com uma fresta ou
 * estoura o container. A sobra vai para a fatia de maior resto (metodo do maior
 * resto), que e o desvio minimo possivel.
 */
export function distribuicaoStatus(tarefas: readonly Task[]): FatiaStatus[] {
  if (tarefas.length === 0) return []

  const presentes = ORDEM_STATUS
    .map((status) => ({ status, quantidade: tarefas.filter((t) => t.status === status).length }))
    .filter((f) => f.quantidade > 0)

  const exatos = presentes.map((f) => (f.quantidade / tarefas.length) * 100)
  const base = exatos.map((v) => Math.floor(v * 10) / 10)
  const sobra = Math.round((100 - base.reduce((s, v) => s + v, 0)) * 10) / 10

  // Devolve a sobra a quem tem o maior resto descartado.
  if (sobra > 0) {
    const restos = exatos.map((v, i) => ({ i, resto: v - (base[i] ?? 0) }))
    const alvo = restos.toSorted((a, b) => b.resto - a.resto)[0]
    if (alvo) base[alvo.i] = Math.round(((base[alvo.i] ?? 0) + sobra) * 10) / 10
  }

  return presentes.map((f, i) => ({ ...f, percentual: base[i] ?? 0 }))
}

/** Media do campo `progress`. 0 para grupo vazio. */
export function progressoDoGrupo(tarefas: readonly Task[]): number {
  if (tarefas.length === 0) return 0
  const soma = tarefas.reduce((s, t) => s + t.progress, 0)
  return Math.round(soma / tarefas.length)
}

/** Vencidas e nao concluidas. */
export function contarAtrasadas(tarefas: readonly Task[], hoje = new Date()): number {
  return tarefas.filter((t) => estaAtrasada(t.due_date, t.status, hoje)).length
}
