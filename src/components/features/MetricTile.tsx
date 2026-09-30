import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface Props {
  titulo: string
  valor: string
  /** 0 a 100. Quando presente, mostra uma ProgressBar simples sob o valor. */
  progresso?: number
  /** Verdadeiro quando o número pede atenção (ex.: existem tarefas atrasadas). */
  atencao?: boolean
}

/**
 * Um KPI: título + valor grande, com selo opcional de atenção e barra de
 * progresso opcional. docs/components.md, Tabela 2 (Dashboard).
 */
export function MetricTile({ titulo, valor, progresso, atencao }: Props) {
  return (
    <div className="glass rounded-card p-space-md">
      <div className="flex items-center justify-between gap-space-sm">
        <span className="text-label text-ink-muted">{titulo}</span>
        {atencao && <Badge tone="bg-danger-soft text-danger-ink">Atenção</Badge>}
      </div>
      <p className="mt-space-xs text-display text-ink">{valor}</p>
      {progresso !== undefined && (
        <ProgressBar value={progresso} label={`${titulo}: ${valor}`} className="mt-space-sm" />
      )}
    </div>
  )
}
