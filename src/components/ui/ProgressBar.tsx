import { cn } from '@/lib/cn'

interface Segmento {
  percentual: number
  tone: string
  rotulo: string
}

interface Props {
  /** Barra simples: 0 a 100. */
  value?: number
  /** Barra empilhada multicolorida (progresso por status do grupo). */
  segments?: Segmento[]
  /** Rotulo acessivel. Obrigatorio: barra sem nome nao diz nada a leitor de tela. */
  label: string
  className?: string
}

export function ProgressBar({ value, segments, label, className }: Props) {
  if (segments) {
    const texto = segments.map((s) => `${s.rotulo} ${s.percentual}%`).join(', ')
    return (
      // img + aria-label: a barra empilhada e uma figura, e o texto equivalente
      // e o que cumpre "os mesmos numeros disponiveis em texto" (criterio F4.2).
      <div role="img" aria-label={`${label}: ${texto}`} className={cn('flex h-2 w-full overflow-hidden rounded-full bg-surface-3', className)}>
        {segments.map((s) => (
          <span
            key={s.rotulo}
            className={cn('h-full', s.tone)}
            style={{ width: `${s.percentual}%` }}
          />
        ))}
      </div>
    )
  }

  const v = Math.max(0, Math.min(100, value ?? 0))
  return (
    <div
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-3', className)}
    >
      <span
        className={cn('block h-full rounded-full transition-[width] duration-normal',
          v === 100 ? 'bg-status-done' : 'bg-primary')}
        style={{ width: `${v}%` }}
      />
    </div>
  )
}
