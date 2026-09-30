import { Link } from 'react-router-dom'
import { EllipsisVertical } from 'lucide-react'
import { Menu } from '@/components/ui/Menu'
import { tempoRelativo } from '@/lib/date'
import type { Board } from '@/types/domain'
import { FavoritoToggle } from './FavoritoToggle'

interface Props {
  board: Board
  aoRenomear: (board: Board) => void
  aoExcluir: (board: Board) => void
}

/**
 * Um board na lista "Meus Painéis". O Menu fica FORA do Link: botão dentro
 * de link é HTML inválido e o clique no menu navegaria junto.
 */
export function BoardCard({ board, aoRenomear, aoExcluir }: Props) {
  return (
    <div className="flex items-start gap-space-sm glass rounded-card p-space-md hover:bg-glass-strong">
      <Link
        to={`/boards/${board.id}`}
        className="flex min-h-touch min-w-0 flex-1 flex-col justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="truncate text-title text-ink">{board.name}</span>
        <span className="text-label text-ink-muted">Criado {tempoRelativo(board.created_at)}</span>
      </Link>

      <FavoritoToggle boardId={board.id} nome={board.name} />

      <Menu
        rotulo={`Ações de ${board.name}`}
        align="end"
        items={[
          { id: 'renomear', rotulo: 'Renomear', aoEscolher: () => aoRenomear(board) },
          { id: 'excluir', rotulo: 'Excluir', aoEscolher: () => aoExcluir(board) },
        ]}
        trigger={(p) => (
          <button
            {...p}
            type="button"
            className="grid min-h-touch min-w-touch place-items-center rounded hover:bg-surface-3 md:min-h-8 md:min-w-8"
          >
            <span className="sr-only">Ações de {board.name}</span>
            <EllipsisVertical aria-hidden="true" className="size-4" />
          </button>
        )}
      />
    </div>
  )
}
