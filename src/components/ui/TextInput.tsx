import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type PropsInput = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; multiline?: false }
type PropsTextarea = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean; multiline: true }
type Props = PropsInput | PropsTextarea

const base = (className: string | undefined) =>
  cn(
    'w-full rounded border border-border-strong bg-surface px-space-md text-body text-ink',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    'aria-invalid:border-danger',
    'disabled:cursor-not-allowed disabled:opacity-50',
    className,
  )

export function TextInput(props: Props) {
  if (props.multiline) {
    const { invalid, multiline: _multiline, className, ...rest } = props
    return (
      <textarea
        aria-invalid={invalid || undefined}
        className={cn(base(className), 'min-h-24 py-space-sm')}
        {...rest}
      />
    )
  }

  const { invalid, multiline: _multiline, className, ...rest } = props
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(base(className), 'min-h-touch md:min-h-8')}
      {...rest}
    />
  )
}
