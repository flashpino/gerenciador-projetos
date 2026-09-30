import { Button } from '@/components/ui/Button'

interface Props {
  visiveis: number
  total: number
  aoLimpar: () => void
}

/**
 * Aparece quando a busca ou algum filtro está ligado. Um filtro que esconde
 * tarefas sem avisar parece dado perdido; aqui a pessoa vê quanto está fora.
 */
export function ResumoFiltro({ visiveis, total, aoLimpar }: Props) {
  return (
    <div className="mb-gutter flex flex-wrap items-center gap-space-sm">
      <output className="text-body text-ink-muted">
        Mostrando {visiveis} de {total} {total === 1 ? 'tarefa' : 'tarefas'}
      </output>
      <Button variant="ghost" size="sm" onClick={aoLimpar}>
        Limpar busca e filtros
      </Button>
    </div>
  )
}
