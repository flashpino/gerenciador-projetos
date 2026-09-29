import type { Atividade, TaskStatus } from '@/types/domain'

export type IconeAtividade = 'criada' | 'concluida' | 'travada' | 'status' | 'comentario'

export interface DescricaoAtividade {
  icone: IconeAtividade
  ator: string
  /** Texto antes do título entre aspas. */
  antes: string
  /** Texto logo depois do título (começa com espaço ou pontuação). */
  depois: string
  /** Só em "mudou … para": o status novo, mostrado como Badge. */
  status: TaskStatus | null
  trecho: string | null
}

/**
 * Concluída e travada têm frase própria (são os eventos que o time mais quer
 * ver — Stitch, dashboard); os outros status saem como "mudou … para {badge}".
 */
export function descreverAtividade(
  a: Pick<Atividade, 'kind' | 'to_status' | 'comment_excerpt' | 'ator'>,
): DescricaoAtividade {
  const base = { ator: a.ator?.full_name ?? 'Alguém', depois: '', status: null, trecho: null }

  if (a.kind === 'task_created') return { ...base, icone: 'criada', antes: 'criou a tarefa' }
  if (a.kind === 'comment_added') {
    return { ...base, icone: 'comentario', antes: 'comentou em', depois: ':', trecho: a.comment_excerpt }
  }
  if (a.to_status === 'done') return { ...base, icone: 'concluida', antes: 'concluiu' }
  if (a.to_status === 'stuck') return { ...base, icone: 'travada', antes: 'marcou', depois: ' como travada' }
  return { ...base, icone: 'status', antes: 'mudou', depois: ' para', status: a.to_status }
}
