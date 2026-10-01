import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface Props {
  /** Classe de token com o PAR fundo+texto (ex.: STATUS[s].classe). */
  tone?: string
  variant?: 'fill' | 'soft' | 'outline'
  children: ReactNode
  className?: string
}

export function Badge({ tone, variant = 'fill', children, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-full px-space-md py-space-xs text-label font-semibold',
        variant === 'outline' && 'border border-border-strong bg-surface text-ink',
        variant === 'soft' && 'bg-surface-2 text-ink-muted',
        variant === 'fill' && tone,
        className,
      )}
    >
      {children}
    </span>
  )
}
