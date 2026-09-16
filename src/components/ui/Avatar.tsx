import { cn } from '@/lib/cn'
import type { Profile } from '@/types/domain'

interface Props {
  /** Lista mesmo para um so: evita um AvatarStack como 13o primitivo. */
  users: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>[]
  size?: 'sm' | 'md'
  max?: number
  className?: string
}

const iniciais = (nome: string): string =>
  nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')

export function Avatar({ users, size = 'md', max = 4, className }: Props) {
  const visiveis = users.slice(0, max)
  const extras = users.length - visiveis.length
  const dim = size === 'sm' ? 'size-6 text-micro' : 'size-8 text-label'

  if (users.length === 0) {
    return <span className="text-cell text-ink-muted">Sem responsável</span>
  }

  return (
    <span className={cn('flex items-center', users.length > 1 && '-space-x-2', className)}>
      {visiveis.map((u) =>
        u.avatar_url ? (
          <img
            key={u.id}
            src={u.avatar_url}
            alt={u.full_name}
            width={size === 'sm' ? 24 : 32}
            height={size === 'sm' ? 24 : 32}
            className={cn(dim, 'rounded-full border-2 border-surface object-cover')}
          />
        ) : (
          <span
            key={u.id}
            title={u.full_name}
            className={cn(dim, 'grid place-items-center rounded-full border-2 border-surface bg-primary-soft font-semibold text-primary')}
          >
            <span className="sr-only">{u.full_name}</span>
            <span aria-hidden="true">{iniciais(u.full_name)}</span>
          </span>
        ),
      )}
      {extras > 0 && (
        <span className={cn(dim, 'grid place-items-center rounded-full border-2 border-surface bg-surface-3 font-semibold text-ink-muted')}>
          <span className="sr-only">e mais {extras}</span>
          <span aria-hidden="true">+{extras}</span>
        </span>
      )}
    </span>
  )
}
