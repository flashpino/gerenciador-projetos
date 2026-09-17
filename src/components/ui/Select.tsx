import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface OpcaoSelect {
  value: string
  label: string
}

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean
  options: OpcaoSelect[]
}

export function Select({ invalid, options, className, ...rest }: Props) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(
        'min-h-touch w-full rounded border border-border-strong bg-surface px-space-md text-body text-ink md:min-h-8',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'aria-invalid:border-danger',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...rest}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
