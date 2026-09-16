import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  iconStart?: ReactNode
  /** Botao so-icone. Exige `aria-label` — sem texto o leitor de tela nao le nada. */
  iconOnly?: boolean
}

const VARIANTES: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
  secondary: 'bg-surface text-ink border border-border-strong hover:bg-surface-2',
  ghost: 'bg-transparent text-ink hover:bg-surface-2',
  danger: 'bg-danger text-danger-fg hover:brightness-110',
}

/**
 * Alvo de toque: 44px (min-h-touch) ate 768px, compacto so a partir de md.
 * Aplicar o tamanho compacto em mobile quebraria WCAG 2.5.8.
 */
const TAMANHOS: Record<Size, string> = {
  sm: 'min-h-touch md:min-h-8 px-space-md text-label',
  md: 'min-h-touch md:min-h-10 px-space-lg text-body',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  iconStart,
  iconOnly = false,
  disabled,
  children,
  className,
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-space-sm rounded font-semibold',
        'transition-[background-color,filter] duration-fast',
        'active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTES[variant],
        TAMANHOS[size],
        iconOnly && 'min-w-touch md:min-w-8 px-0',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
        />
      ) : (
        iconStart
      )}
      {!iconOnly && children}
    </button>
  )
}
