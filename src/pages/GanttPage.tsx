import { Navigate, useParams } from 'react-router-dom'
import { BoardShell } from '@/components/features/BoardShell'
import { GanttChart } from '@/components/features/GanttChart'
import { EsqueletoGantt } from '@/components/features/Esqueletos'
import { VisaoDoBoard } from '@/components/features/VisaoDoBoard'
import { Button } from '@/components/ui/Button'
import { useGruposFiltrados } from '@/hooks/useGruposFiltrados'
import { useBoard } from '@/hooks/useQuadro'

export default function GanttPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const board = useBoard(boardId)
  const grupos = useGruposFiltrados(boardId)

  // Board apagado ou de outro workspace: "tentar de novo" não o traz de volta.
  if (board.isError) return <Navigate to="/paineis" replace />

  return (
    <BoardShell titulo={board.data?.name ?? 'Quadro'}>
      <VisaoDoBoard
        grupos={grupos}
        boardPendente={board.isPending}
        esqueleto={<EsqueletoGantt />}
        vazio={{
          titulo: 'Nenhuma tarefa ainda',
          descricao: 'Crie tarefas com período definido para vê-las no cronograma.',
          acao: <Button variant="primary">Ver Tabela Principal</Button>,
        }}
      >
        <GanttChart grupos={grupos.data ?? []} />
      </VisaoDoBoard>
    </BoardShell>
  )
}
