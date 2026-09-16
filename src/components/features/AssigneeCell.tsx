import { Avatar } from '@/components/ui/Avatar'
import { type ItemMenu, Menu } from '@/components/ui/Menu'
import type { Profile } from '@/types/domain'

interface Props {
  assigneeId: string | null
  membros: Profile[]
  nomeTarefa: string
  aoMudar: (id: string | null) => void
}

export function AssigneeCell({ assigneeId, membros, nomeTarefa, aoMudar }: Props) {
  const atual = membros.find((m) => m.id === assigneeId) ?? null

  const items: ItemMenu[] = [
    {
      id: '__nenhum',
      rotulo: <span className="text-ink-muted">Sem responsável</span>,
      rotuloTexto: 'Sem responsável',
      selecionado: atual === null,
      aoEscolher: () => aoMudar(null),
    },
    ...membros.map((m) => ({
      id: m.id,
      rotulo: (
        <span className="flex items-center gap-space-sm">
          <Avatar users={[m]} size="sm" />
          {m.full_name}
        </span>
      ),
      rotuloTexto: m.full_name,
      selecionado: m.id === assigneeId,
      aoEscolher: () => aoMudar(m.id),
    })),
  ]

  return (
    <Menu
      rotulo={`Responsável por ${nomeTarefa}`}
      items={items}
      trigger={(p) => (
        <button
          {...p}
          type="button"
          className="inline-flex min-h-touch items-center gap-space-sm rounded px-space-xs hover:bg-surface-2 md:min-h-0"
        >
          <span className="sr-only">
            Responsável por {nomeTarefa}: {atual?.full_name ?? 'ninguém'}. Alterar
          </span>
          <span aria-hidden="true" className="flex items-center gap-space-sm">
            <Avatar users={atual ? [atual] : []} size="sm" />
            {atual && <span className="text-cell">{atual.full_name}</span>}
          </span>
        </button>
      )}
    />
  )
}
