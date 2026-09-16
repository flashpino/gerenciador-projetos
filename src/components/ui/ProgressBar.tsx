import { cn } from '@/lib/cn'

interface Segmento {
  percentual: number
  tone: string
  rotulo: string
}

interface Props {
  /** Barra simples: 0 a 100. */
  value?: number
  /** Barra empilhada multicolorida (distribuicao de status do grupo). */
  segments?: Segmento[]
  /** Rotulo acessivel. Obrigatorio: barra sem nome nao diz nada a leitor de tela. */
  label: string
  className?: string
}

export function ProgressBar({ value, segments, label, className }: Props) {
  if (segments) {
    const texto = segments.map((s) => `${s.rotulo} ${s.percentual}%`).join(', ')
    return (
      <span className={cn('block', className)}>
        {/*
          Os numeros sao TEXTO de verdade (sr-only), nao um aria-label: texto
          real e selecionavel, traduzivel e sobrevive a falha de CSS. A barra
          em si vira decorativa. Cumpre o criterio F4.2 melhor que role="img".
        */}
        <span className="sr-only">{label}: {texto}</span>
        <span
          aria-hidden="true"
          className="flex h-2 w-full overflow-hidden rounded-full bg-surface-3"
        >
          {segments.map((s) => (
            <span key={s.rotulo} className={cn('h-full', s.tone)} style={{ width: `${s.percentual}%` }} />
          ))}
        </span>
      </span>
    )
  }

  const v = Math.max(0, Math.min(100, value ?? 0))
  return (
    // <progress> nativo: aria-valuenow, papel e anuncio vem do navegador.
    // A estilizacao vive em tokens.css (::-webkit-progress-*, ::-moz-progress-bar).
    <progress
      value={v}
      max={100}
      aria-label={label}
      data-completo={v === 100 || undefined}
      className={cn('barra-progresso h-2 w-full', className)}
    >
      {v}%
    </progress>
  )
}
