import { BoardShell } from '@/components/features/BoardShell'
import { GroupProgressList } from '@/components/features/GroupProgressList'
import { MetricTile } from '@/components/features/MetricTile'
import { StatusDonut } from '@/components/features/StatusDonut'
import { Button } from '@/components/ui/Button'
import { StateView } from '@/components/ui/StateView'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import { contarAtrasadas, distribuicaoStatus, taxaDeConclusao } from '@/lib/metrics'
import { useBoardAtual, useGruposComTarefas } from '@/hooks/useQuadro'

export default function DashboardPage() {
  const board = useBoardAtual()
  const grupos = useGruposComTarefas(board.data?.id)
  const tarefas = grupos.data?.flatMap((g) => g.tasks)

  // "Vazio" aqui e ZERO TAREFAS, nao zero grupos (diferente de BoardPage/GanttPage) —
  // criterio F4.3 fala de board sem tarefas, e um board pode ter grupos vazios.
  const consultaTarefas = { ...grupos, data: tarefas }
  const estado = estadoDaQuery(
    board.isPending ? { ...consultaTarefas, isPending: true } : consultaTarefas,
    {
      titulo: 'Nenhuma tarefa ainda',
      descricao: 'Crie tarefas no board para ver as métricas aqui.',
      acao: <Button variant="primary">Ver Tabela Principal</Button>,
    },
    () => void grupos.refetch(),
  )

  const conclusao = taxaDeConclusao(tarefas ?? [])
  const atrasadas = contarAtrasadas(tarefas ?? [])

  return (
    <BoardShell titulo={board.data?.name ?? 'Quadro'}>
      <StateView estado={estado}>
        <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
          <MetricTile titulo="Taxa de Conclusão" valor={`${conclusao}%`} progresso={conclusao} />
          <MetricTile titulo="Tarefas Atrasadas" valor={String(atrasadas)} atencao={atrasadas > 0} />
        </div>
        <div className="mt-margin grid grid-cols-1 gap-space-md md:grid-cols-2">
          <div className="rounded-md border border-border bg-surface p-space-md">
            <h2 className="mb-space-md text-title text-ink">Distribuição por Status</h2>
            <StatusDonut fatias={distribuicaoStatus(tarefas ?? [])} />
          </div>
          <div className="rounded-md border border-border bg-surface p-space-md">
            <h2 className="mb-space-md text-title text-ink">Progresso por Grupo</h2>
            <GroupProgressList grupos={grupos.data ?? []} />
          </div>
        </div>
      </StateView>
    </BoardShell>
  )
}
