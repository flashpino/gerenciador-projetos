import { useDroppable } from '@dnd-kit/core'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import type { ColunaKanban } from '@/lib/kanban'
import { STATUS } from '@/lib/status'
import type { Profile, Task, TaskStatus } from '@/types/domain'
import { TaskCard } from './TaskCard'

interface Props {
  coluna: ColunaKanban
  membros: Profile[]
  aoMover: (id: string, destino: TaskStatus) => void
  aoAbrir: (t: Task) => void
  className?: string
}

export function KanbanColumn({ coluna, membros, aoMover, aoAbrir, className }: Props) {
  const n = coluna.tarefas.length
  const { setNodeRef, isOver } = useDroppable({ id: coluna.status })

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`col-${coluna.status}`}
      className={cn(
        'glass flex min-w-0 flex-col rounded-card p-space-sm',
        // Realce do alvo: só visual. Quem não vê usa o menu, que não depende disto.
        isOver && 'ring-2 ring-primary',
        className,
      )}
    >
      <header className="mb-space-sm flex items-center gap-space-sm px-space-xs">
        {/* h2, não h3: mesma correção de GanttChart.tsx — nenhuma h2 existe
            entre o h1 da página (BoardShell) e este cabeçalho de coluna
            (achado do axe em src/test/a11y.test.tsx, regra heading-order). */}
        <h2
          id={`col-${coluna.status}`}
          className={cn('rounded-full px-space-md py-space-xs text-label font-semibold', STATUS[coluna.status].classe)}
        >
          {coluna.rotulo}
        </h2>
        <Badge variant="soft">
          <span className="sr-only">{n} {n === 1 ? 'tarefa' : 'tarefas'}</span>
          <span aria-hidden="true">{n}</span>
        </Badge>
      </header>

      <ul className="flex flex-col gap-space-sm">
        {coluna.tarefas.map((t) => (
          <li key={t.id}>
            <TaskCard
              task={t}
              membros={membros}
              aoMover={(destino) => aoMover(t.id, destino)}
              aoAbrir={() => aoAbrir(t)}
            />
          </li>
        ))}
      </ul>

      {/*
        Critério F2.5: coluna vazia continua existindo, mostra contagem 0 e é
        alvo de drop. A área vazia é anunciada por TEXTO — um retângulo
        tracejado sem texto não diz nada a leitor de tela.
      */}
      {n === 0 && (
        <p className="rounded border border-dashed border-border-strong p-space-md text-center text-label text-ink-muted">
          Nenhuma tarefa em {coluna.rotulo}
        </p>
      )}
    </section>
  )
}
