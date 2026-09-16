import { useId } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  checked: boolean
  onChange: (v: boolean) => void
  /** Obrigatorio. Se for visualmente oculto, use `rotuloOculto`. */
  label: string
  rotuloOculto?: boolean
  disabled?: boolean
  className?: string
}

export function Checkbox({ checked, onChange, label, rotuloOculto, disabled, className }: Props) {
  const id = useId()
  return (
    <span className={cn('inline-flex items-center gap-space-sm', className)}>
      {/* Input nativo: foco, teclado e leitor de tela vem de graca.
          O quadrado desenhado e puramente visual (peer + aria-hidden). */}
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer size-4 appearance-none rounded-sm border border-border-strong bg-surface checked:border-primary checked:bg-primary disabled:opacity-50"
      />
      <Check
        aria-hidden="true"
        className="pointer-events-none -ml-[1.25rem] size-3 text-primary-fg opacity-0 peer-checked:opacity-100"
      />
      <label htmlFor={id} className={cn('text-body', rotuloOculto ? 'sr-only' : 'ml-space-xs')}>
        {label}
      </label>
    </span>
  )
}
