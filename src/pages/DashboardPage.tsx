import { Navigate, useParams } from 'react-router-dom'
import { BoardShell } from '@/components/features/BoardShell'
import { FeedAtividades } from '@/components/features/FeedAtividades'
import { GroupProgressList } from '@/components/features/GroupProgressList'
import { MetricTile } from '@/components/features/MetricTile'
import { StatusDonut } from '@/components/features/StatusDonut'
import { Button } from '@/components/ui/Button'
import { EsqueletoDashboard, EsqueletoFeed } from '@/components/features/Esqueletos'
import { StateView } from '@/components/ui/StateView'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import { contarAtrasadas, distribuicaoStatus, taxaDeConclusao } from '@/lib/metrics'
import { useAtividades, useBoard, useGruposComTarefas } from '@/hooks/useQuadro'

export default function DashboardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const board = useBoard(boardId)
  const grupos = useGruposComTarefas(boardId)
  // Antes do early return abaixo — a ordem dos hooks não pode variar.
  const atividades = useAtividades(boardId, 10)

  // Board apagado ou de outro workspace: "tentar de novo" não o traz de volta.
  if (board.isError) return <Navigate to="/paineis" replace />

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

  const estadoAtividades = estadoDaQuery(
    atividades,
    { titulo: 'Nenhuma atividade ainda', descricao: 'Criar tarefas, mudar status e comentar aparece aqui.' },
    () => void atividades.refetch(),
  )

  const conclusao = taxaDeConclusao(tarefas ?? [])
  const atrasadas = contarAtrasadas(tarefas ?? [])

  return (
    <BoardShell titulo={board.data?.name ?? 'Quadro'}>
      {/* Só métricas e gráficos: o card de atividades abaixo tem o próprio skeleton. */}
      <StateView estado={estado} esqueleto={<EsqueletoDashboard semAtividades />}>
        <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
          <MetricTile titulo="Taxa de Conclusão" valor={`${conclusao}%`} progresso={conclusao} />
          <MetricTile titulo="Tarefas Atrasadas" valor={String(atrasadas)} atencao={atrasadas > 0} />
        </div>
        <div className="mt-margin grid grid-cols-1 gap-space-md md:grid-cols-2">
          <div className="glass rounded-card p-space-md">
            <h2 className="mb-space-md text-title text-ink">Distribuição por Status</h2>
            <StatusDonut fatias={distribuicaoStatus(tarefas ?? [])} />
          </div>
          <div className="glass rounded-card p-space-md">
            <h2 className="mb-space-md text-title text-ink">Progresso por Grupo</h2>
            <GroupProgressList grupos={grupos.data ?? []} />
          </div>
        </div>
      </StateView>

      {/* Fora do StateView das métricas: board sem tarefas ainda tem histórico. */}
      <section
        aria-labelledby="titulo-atividades"
        className="mt-margin glass rounded-card p-space-md"
      >
        <h2 id="titulo-atividades" className="mb-space-md text-title text-ink">
          Atividades recentes
        </h2>
        <StateView estado={estadoAtividades} esqueleto={<EsqueletoFeed linhas={3} />}>
          <FeedAtividades atividades={atividades.data ?? []} />
        </StateView>
      </section>
    </BoardShell>
  )
}
