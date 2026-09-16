import { CalendarDays, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'
import { diasAte, estaAtrasada, formatarIntervalo } from '@/lib/date'
import type { Task } from '@/types/domain'

interface Props {
  task: Pick<Task, 'start_date' | 'due_date' | 'status'>
}

/**
 * Prazo com destaque de atraso.
 *
 * O atraso e anunciado por TEXTO ("Atrasada há 3 dias"), nao apenas pelo fundo
 * vermelho — criterio F1.5. O icone e aria-hidden porque o texto ja diz tudo.
 */
export function DueDateCell({ task }: Props) {
  const atrasada = estaAtrasada(task.due_date, task.status)
  const dias = diasAte(task.due_date)
  const texto = formatarIntervalo(task.start_date, task.due_date)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-space-xs rounded-sm px-space-sm py-space-xs text-cell',
        atrasada ? 'bg-danger-soft text-danger-ink' : 'bg-surface-2 text-ink',
      )}
    >
      {atrasada ? (
        <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />
      ) : (
        <CalendarDays aria-hidden="true" className="size-3.5 shrink-0 text-ink-muted" />
      )}
      <span>{texto}</span>
      {atrasada && (
        <span className="sr-only">
          — Atrasada há {Math.abs(dias)} {Math.abs(dias) === 1 ? 'dia' : 'dias'}
        </span>
      )}
    </span>
  )
}
