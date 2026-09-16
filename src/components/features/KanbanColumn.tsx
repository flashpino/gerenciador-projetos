import { useDroppable } from '@dnd-kit/core'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import type { ColunaKanban } from '@/lib/kanban'
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
        'flex min-w-0 flex-col rounded-md bg-surface-2 p-space-sm',
        // Realce do alvo: só visual. Quem não vê usa o menu, que não depende disto.
        isOver && 'ring-2 ring-primary',
        className,
      )}
    >
      <header className="mb-space-sm flex items-center gap-space-sm px-space-xs">
        <h3 id={`col-${coluna.status}`} className="text-subtitle">
          {coluna.rotulo}
        </h3>
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
