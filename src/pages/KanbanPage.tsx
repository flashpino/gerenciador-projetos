import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { BoardShell } from '@/components/features/BoardShell'
import { KanbanBoard } from '@/components/features/KanbanBoard'
import { TaskModal } from '@/components/features/TaskModal'
import { Button } from '@/components/ui/Button'
import { StateView } from '@/components/ui/StateView'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import { useAtualizarTarefa, useBoard, useGruposComTarefas, useMembros } from '@/hooks/useQuadro'

export default function KanbanPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const board = useBoard(boardId)
  const grupos = useGruposComTarefas(boardId)
  const membros = useMembros(board.data?.workspace_id)
  const editar = useAtualizarTarefa(boardId)
  const [taskIdModal, setTaskIdModal] = useState<string | null>(null)

  // Board apagado ou de outro workspace: "tentar de novo" não o traz de volta.
  if (board.isError) return <Navigate to="/paineis" replace />

  const estado = estadoDaQuery(
    board.isPending ? { ...grupos, isPending: true } : grupos,
    {
      titulo: 'Nenhuma tarefa ainda',
      descricao: 'Crie a primeira tarefa para vê-la aparecer numa coluna.',
      acao: <Button variant="primary">Criar primeira tarefa</Button>,
    },
    () => void grupos.refetch(),
  )

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

      <StateView estado={estado}>
        <KanbanBoard
          grupos={grupos.data ?? []}
          membros={membros.data ?? []}
          aoMover={(id, status) => editar.mutate({ id, campos: { status } })}
          aoAbrir={(t) => setTaskIdModal(t.id)}
        />
      </StateView>

      {board.data && (
        <TaskModal
          aberto={taskIdModal !== null}
          aoFechar={() => setTaskIdModal(null)}
          boardId={board.data.id}
          taskId={taskIdModal}
          grupos={(grupos.data ?? []).map((g) => ({ id: g.id, name: g.name }))}
          membros={membros.data ?? []}
        />
      )}
    </BoardShell>
  )
}
