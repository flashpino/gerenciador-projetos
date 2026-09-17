import { CORES_STATUS, STATUS } from '@/lib/status'
import type { FatiaStatus } from '@/lib/metrics'

interface Props {
  fatias: FatiaStatus[]
}

// r = 100 / (2*pi) faz a circunferencia dar ~100: strokeDasharray usa a
// porcentagem direto, sem calcular o perimetro à parte.
const RAIO = 15.9155

/**
 * Sem lib de grafico (docs/components.md, "Sem gráficos de terceiros"): anel
 * feito com circles de SVG e stroke-dasharray. A legenda ao lado é texto
 * visivel normal — nao sr-only — porque ja e a forma "em texto" que o
 * criterio F4.2 pede, sem duplicar numero escondido.
 */
export function StatusDonut({ fatias }: Props) {
  if (fatias.length === 0) return null

  const { arcos } = fatias.reduce<{ acumulado: number; arcos: (FatiaStatus & { offset: number })[] }>(
    (estado, f) => ({
      acumulado: estado.acumulado + f.percentual,
      arcos: [...estado.arcos, { ...f, offset: -estado.acumulado }],
    }),
    { acumulado: 0, arcos: [] },
  )
  const total = fatias.reduce((soma, f) => soma + f.quantidade, 0)

  return (
    <div className="flex flex-col items-center gap-space-md md:flex-row md:gap-space-lg">
      <svg viewBox="0 0 36 36" aria-hidden="true" className="size-36 shrink-0 -rotate-90">
        <circle cx="18" cy="18" r={RAIO} fill="none" stroke="var(--color-surface-3)" strokeWidth="4" />
        {arcos.map((a) => (
          <circle
            key={a.status}
            cx="18"
            cy="18"
            r={RAIO}
            fill="none"
            stroke={CORES_STATUS[a.status]}
            strokeWidth="4"
            strokeDasharray={`${a.percentual} ${100 - a.percentual}`}
            strokeDashoffset={a.offset}
          />
        ))}
      </svg>
      <ul className="flex flex-col gap-space-xs">
        <li className="text-label text-ink-muted">{total} tarefas no total</li>
        {fatias.map((f) => (
          <li key={f.status} className="flex items-center gap-space-sm text-body text-ink">
            <span
              aria-hidden="true"
              className="size-3 rounded-sm"
              style={{ backgroundColor: CORES_STATUS[f.status] }}
            />
            <span>
              {STATUS[f.status].rotulo}: {f.quantidade} ({f.percentual}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
