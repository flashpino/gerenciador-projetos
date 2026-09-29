import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightLeft, Ban, Check, MessageSquare, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { descreverAtividade, type IconeAtividade } from '@/lib/atividade'
import { tempoRelativo } from '@/lib/date'
import { STATUS } from '@/lib/status'
import type { Atividade } from '@/types/domain'

const ICONES: Record<IconeAtividade, ComponentType<{ className?: string }>> = {
  criada: Plus,
  concluida: Check,
  travada: Ban,
  status: ArrowRightLeft,
  comentario: MessageSquare,
}

interface Props {
  atividades: Atividade[]
  /** No /atividades (workspace inteiro); o widget do Dashboard já está dentro do board. */
  mostrarBoard?: boolean
}

export function FeedAtividades({ atividades, mostrarBoard = false }: Props) {
  return (
    <ol className="flex flex-col gap-space-md">
      {atividades.map((a) => {
        const d = descreverAtividade(a)
        const Icone = ICONES[d.icone]
        return (
          <li key={a.id} className="flex items-start gap-space-sm">
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-muted"
            >
              <Icone className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-body text-ink">
                <strong>{d.ator}</strong> {d.antes} “{a.task_title}”{d.depois}
                {d.status && (
                  <>
                    {' '}
                    <Badge tone={STATUS[d.status].classe}>{STATUS[d.status].rotulo}</Badge>
                  </>
                )}
                {d.trecho && <span className="italic text-ink-muted"> {d.trecho}</span>}
              </p>
              <p className="text-label text-ink-muted">
                {tempoRelativo(a.created_at)}
                {mostrarBoard && a.board && (
                  <>
                    {' · '}
                    <Link to={`/boards/${a.board_id}`} className="underline hover:text-ink">
                      {a.board.name}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
