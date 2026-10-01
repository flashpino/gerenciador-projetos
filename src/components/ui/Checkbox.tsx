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
    <span className={cn('relative inline-flex items-center gap-space-sm', className)}>
      {/* Input nativo: foco, teclado e leitor de tela vem de graca.
          O quadrado desenhado e puramente visual (peer + aria-hidden). */}
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={rotuloOculto ? label : undefined}
        className="peer size-4 appearance-none rounded-xs border border-border-strong bg-surface checked:border-primary checked:bg-primary disabled:opacity-50"
      />
      <Check
        aria-hidden="true"
        className="pointer-events-none -ml-[1.25rem] size-3 text-primary-fg opacity-0 peer-checked:opacity-100"
      />
      {rotuloOculto ? (
        // Rótulo oculto = só o quadrado de 16px na tela. O <label> vira só a área de toque de 44px em volta
        // dele no celular (docs/responsive.md, alvo mínimo) — tocar no label marca o input de graça.
        // O nome vem do aria-label do input; o label é aria-hidden para não ser lido duas vezes.
        <label htmlFor={id} aria-hidden="true" className="absolute -inset-3.5 md:inset-0">
          <span className="sr-only">{label}</span>
        </label>
      ) : (
        <label htmlFor={id} className="ml-space-xs text-body">
          {label}
        </label>
      )}
    </span>
  )
}
