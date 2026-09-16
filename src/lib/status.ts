import type { TaskPriority, TaskStatus } from '@/types/domain'

/**
 * Cada status carrega rotulo em TEXTO alem da cor.
 *
 * Cor nunca e o unico portador de significado (WCAG 1.4.1): quem nao distingue
 * verde de vermelho, e quem usa leitor de tela, le o rotulo.
 *
 * A classe traz SEMPRE o par fundo+texto junto. E o que garante os 4.5:1 que o
 * check-contrast valida — usar `bg-status-done` com outro texto quebraria o par.
 */
export const STATUS: Record<TaskStatus, { rotulo: string; classe: string }> = {
  not_started: { rotulo: 'Não iniciado', classe: 'bg-status-not-started text-status-not-started-fg' },
  working:     { rotulo: 'Em andamento', classe: 'bg-status-working text-status-working-fg' },
  review:      { rotulo: 'Em revisão',   classe: 'bg-status-review text-status-review-fg' },
  done:        { rotulo: 'Pronto',       classe: 'bg-status-done text-status-done-fg' },
  stuck:       { rotulo: 'Travado',      classe: 'bg-status-stuck text-status-stuck-fg' },
}

/** Ordem das colunas do kanban: do backlog ao bloqueio. */
export const ORDEM_STATUS: readonly TaskStatus[] = [
  'not_started', 'working', 'review', 'done', 'stuck',
]

export const PRIORIDADE: Record<TaskPriority, { rotulo: string; classe: string }> = {
  low:      { rotulo: 'Baixa',   classe: 'bg-priority-low text-priority-low-fg' },
  medium:   { rotulo: 'Média',   classe: 'bg-priority-medium text-priority-medium-fg' },
  high:     { rotulo: 'Alta',    classe: 'bg-priority-high text-priority-high-fg' },
  critical: { rotulo: 'Crítica', classe: 'bg-priority-critical text-priority-critical-fg' },
}

export const PRIORIDADES: readonly TaskPriority[] = ['low', 'medium', 'high', 'critical']

export const rotuloStatus = (s: TaskStatus): string => STATUS[s].rotulo
export const rotuloPrioridade = (p: TaskPriority): string => PRIORIDADE[p].rotulo
