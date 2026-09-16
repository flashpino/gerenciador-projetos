import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

// ponytail: so a variante `text` (inclui email/password/etc via `type`). A
// variante `textarea` do inventario (docs/components.md #5) entra quando o
// TaskModal (F5) precisar de descricao multilinha — sem uso hoje.
type Props = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean
}

export function TextInput({ invalid, className, ...rest }: Props) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        'min-h-touch w-full rounded border border-border-strong bg-surface px-space-md text-body text-ink md:min-h-8',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'aria-invalid:border-danger',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...rest}
    />
  )
}
