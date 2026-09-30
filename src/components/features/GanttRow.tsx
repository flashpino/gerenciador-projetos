import { cn } from '@/lib/cn'
import { formatarIntervalo } from '@/lib/date'
import { posicaoBarra, posicaoData, type EscalaGantt } from '@/lib/gantt'
import { BORDA_STATUS, STATUS } from '@/lib/status'
import type { Task } from '@/types/domain'

interface Props {
  task: Task
  inicioTimeline: Date
  escala: EscalaGantt
}

/**
 * Uma linha do gantt: marco (losango, F3.4), barra (F3.1) ou "sem período
 * definido" (F3.5) — nunca some silenciosamente uma tarefa sem data.
 */
export function GanttRow({ task, inicioTimeline, escala }: Props) {
  if (task.is_milestone && task.due_date) {
    const esquerda = posicaoData(inicioTimeline, task.due_date, escala)
    return (
      <div className="relative h-10">
        <span className="sr-only">
          Marco: {task.title}, {formatarIntervalo(null, task.due_date)}
        </span>
        <div
          aria-hidden="true"
          style={{ left: esquerda }}
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-xs bg-priority-critical"
        />
      </div>
    )
  }

  if (!task.start_date || !task.due_date) {
    return (
      <div className="flex h-10 items-center whitespace-nowrap px-space-md text-label text-ink-muted">
        {/* Pílula com fundo e `relative`: fica por cima da linha vertical do "Hoje", que a cortava. */}
        <span className="relative rounded-full bg-surface-2 px-space-sm py-space-xs">Sem período definido</span>
      </div>
    )
  }

  const { esquerda, largura } = posicaoBarra(inicioTimeline, task.start_date, task.due_date, escala)

  return (
    <div className="relative h-10">
      <div
        style={{ left: esquerda, width: largura }}
        className={cn(
          'absolute top-1/2 flex h-7 -translate-y-1/2 items-center gap-space-xs overflow-hidden rounded-sm border-2 px-space-sm text-micro',
          STATUS[task.status].classe,
          BORDA_STATUS[task.status],
        )}
      >
        <span className="truncate">{task.title}</span>
        <span className="ml-auto shrink-0">{task.progress}%</span>
      </div>
    </div>
  )
}
