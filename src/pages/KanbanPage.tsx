import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { BoardShell } from '@/components/features/BoardShell'
import { KanbanBoard } from '@/components/features/KanbanBoard'
import { TaskModal } from '@/components/features/TaskModal'
import { VisaoDoBoard } from '@/components/features/VisaoDoBoard'
import { Button } from '@/components/ui/Button'
import { useGruposFiltrados } from '@/hooks/useGruposFiltrados'
import { useAtualizarTarefa, useBoard, useMembros } from '@/hooks/useQuadro'

export default function KanbanPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const board = useBoard(boardId)
  const grupos = useGruposFiltrados(boardId)
  const membros = useMembros(board.data?.workspace_id)
  const editar = useAtualizarTarefa(boardId)
  const [taskIdModal, setTaskIdModal] = useState<string | null>(null)

  // Board apagado ou de outro workspace: "tentar de novo" não o traz de volta.
  if (board.isError) return <Navigate to="/paineis" replace />

  return (
    <BoardShell titulo={board.data?.name ?? 'Quadro'}>
      {/*
        F2.4: o rollback já acontece dentro de useAtualizarTarefa — o card volta
        sozinho para a coluna de origem. O que falta é DIZER que falhou; card que
        volta sem explicação parece bug.
      */}
      {editar.isError && (
        <p role="alert" className="mb-gutter rounded bg-danger-soft px-space-md py-space-sm text-body text-danger-ink">
          {editar.error instanceof Error ? editar.error.message : 'Não foi possível mover a tarefa.'}
        </p>
      )}

      <VisaoDoBoard
        grupos={grupos}
        boardPendente={board.isPending}
        vazio={{
          titulo: 'Nenhuma tarefa ainda',
          descricao: 'Crie a primeira tarefa para vê-la aparecer numa coluna.',
          acao: <Button variant="primary">Criar primeira tarefa</Button>,
        }}
      >
        <KanbanBoard
          grupos={grupos.data ?? []}
          membros={membros.data ?? []}
          aoMover={(id, status) => editar.mutate({ id, campos: { status } })}
          aoAbrir={(t) => setTaskIdModal(t.id)}
        />
      </VisaoDoBoard>

      {board.data && (
        <TaskModal
          aberto={taskIdModal !== null}
          aoFechar={() => setTaskIdModal(null)}
          boardId={board.data.id}
          taskId={taskIdModal}
          grupos={(grupos.todos ?? []).map((g) => ({ id: g.id, name: g.name }))}
          membros={membros.data ?? []}
        />
      )}
    </BoardShell>
  )
}
