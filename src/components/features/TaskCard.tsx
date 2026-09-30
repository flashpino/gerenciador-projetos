import { useDraggable } from '@dnd-kit/core'
import { EllipsisVertical } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { type ItemMenu, Menu } from '@/components/ui/Menu'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/cn'
import { ORDEM_STATUS, PRIORIDADE, STATUS } from '@/lib/status'
import type { Profile, Task, TaskStatus } from '@/types/domain'
import { DueDateCell } from './DueDateCell'

interface Props {
  task: Task
  membros: Profile[]
  aoMover: (destino: TaskStatus) => void
  aoAbrir: () => void
}

/**
 * Card de tarefa do kanban.
 *
 * O menu "Mover para…" existe em TODAS as larguras, não só no mobile. Ele é ao
 * mesmo tempo a alternativa por teclado ao arrastar (WCAG 2.5.7, critério F2.3)
 * e a forma de mover em 375px (docs/responsive.md, F2). Uma implementação
 * resolve os dois — por isso ela vem antes do drag-and-drop, não depois.
 */
export function TaskCard({ task, membros, aoMover, aoAbrir }: Props) {
  const responsavel = membros.find((m) => m.id === task.assignee_id) ?? null

  // A coluna atual fica fora: mover para onde já se está é um no-op que ainda
  // por cima infla a contagem que o leitor de tela anuncia.
  const destinos: ItemMenu[] = ORDEM_STATUS.filter((s) => s !== task.status).map((s) => ({
    id: s,
    rotulo: `Mover para ${STATUS[s].rotulo}`,
    aoEscolher: () => aoMover(s),
  }))

  // role: 'group' em vez do 'button' padrão do dnd-kit — o <article> já contém
  // botões reais (título, menu de ações); role="button" faria o nome acessível
  // ser computado do conteúdo (name-from-content), duplicando "Ações de …" e
  // colidindo com o botão do menu em qualquer getByRole('button', {name}). Um
  // "button" com botões dentro também é aninhamento interativo inválido em ARIA.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    // roleDescription vazio: o padrao do dnd-kit e a string em ingles
    // "draggable", que SOBRESCREVE (nao complementa) o papel falado via
    // aria-roledescription — anunciaria ingles por cima do role="group" acima.
    attributes: { role: 'group', tabIndex: -1, roleDescription: '' },
  })

  return (
    // div, não <article>: ARIA-in-HTML não permite role="group" em <article>
    // (achado do axe em src/test/a11y.test.tsx, regra aria-allowed-role). O
    // role="group" em si é deliberado — ver comentário acima sobre dnd-kit.
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'glass-strong rounded-md p-space-md shadow-drag',
        isDragging && 'opacity-50',
      )}
    >
      <div className="flex items-start gap-space-sm">
        <button
          type="button"
          onClick={aoAbrir}
          className={cn(
            'flex-1 text-left text-body font-medium hover:underline',
            task.status === 'done' && 'text-ink-muted line-through',
          )}
        >
          {task.title}
        </button>

        <Menu
          rotulo={`Ações de ${task.title}`}
          items={destinos}
          align="end"
          trigger={(p) => (
            <button
              {...p}
              type="button"
              className="grid min-h-touch min-w-touch place-items-center rounded hover:bg-surface-2 md:min-h-8 md:min-w-8"
            >
              <span className="sr-only">Ações de {task.title}</span>
              <EllipsisVertical aria-hidden="true" className="size-4" />
            </button>
          )}
        />
      </div>

      <div className="mt-space-sm flex flex-wrap items-center gap-space-sm">
        <Badge tone={PRIORIDADE[task.priority].classe}>{PRIORIDADE[task.priority].rotulo}</Badge>
        {task.due_date && <DueDateCell task={task} />}
      </div>

      <div className="mt-space-sm flex items-center gap-space-sm">
        <span aria-hidden="true" className="flex items-center gap-space-sm">
          <Avatar users={responsavel ? [responsavel] : []} size="sm" />
          {responsavel && <span className="text-cell text-ink-muted">{responsavel.full_name}</span>}
        </span>
        <span className="sr-only">
          {responsavel ? `Responsável: ${responsavel.full_name}` : 'Sem responsável'}
        </span>
        <ProgressBar
          value={task.progress}
          label={`Progresso de ${task.title}`}
          className="ml-auto w-16"
        />
      </div>
    </div>
  )
}
