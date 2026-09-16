import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface Props {
  /** Classe de token com o PAR fundo+texto (ex.: STATUS[s].classe). */
  tone?: string
  variant?: 'fill' | 'soft' | 'outline'
  /** `true` preenche a celula inteira — o mosaico de status da tabela. */
  bleed?: boolean
  children: ReactNode
  className?: string
}

export function Badge({ tone, variant = 'fill', bleed = false, children, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-semibold',
        bleed
          ? 'h-full w-full px-space-sm text-label'
          : 'rounded-sm px-space-sm py-space-xs text-micro',
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
