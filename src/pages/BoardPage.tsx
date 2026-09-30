import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { BoardShell } from '@/components/features/BoardShell'
import { TaskGroup } from '@/components/features/TaskGroup'
import { TaskModal } from '@/components/features/TaskModal'
import { VisaoDoBoard } from '@/components/features/VisaoDoBoard'
import { useGruposFiltrados } from '@/hooks/useGruposFiltrados'
import { useAtualizarTarefa, useBoard, useMembros } from '@/hooks/useQuadro'
import type { Task } from '@/types/domain'

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const board = useBoard(boardId)
  const grupos = useGruposFiltrados(boardId)
  const membros = useMembros(board.data?.workspace_id)
  const editar = useAtualizarTarefa(boardId)

  // null = modal fechado. string = editando essa tarefa. '' = criando (o
  // grupo alvo vai em grupoParaCriar).
  const [taskIdModal, setTaskIdModal] = useState<string | null>(null)
  const [grupoParaCriar, setGrupoParaCriar] = useState<string | null>(null)
  const modalAberto = taskIdModal !== null || grupoParaCriar !== null

  function abrirParaEditar(task: Task) {
    setTaskIdModal(task.id)
    setGrupoParaCriar(null)
  }

  function abrirParaCriar(groupId: string) {
    setTaskIdModal(null)
    setGrupoParaCriar(groupId)
  }

  function fecharModal() {
    setTaskIdModal(null)
    setGrupoParaCriar(null)
  }

  // Board apagado ou de outro workspace: "tentar de novo" não o traz de volta.
  if (board.isError) return <Navigate to="/paineis" replace />

  return (
    <BoardShell titulo={board.data?.name ?? 'Quadro'}>
      {editar.isError && (
        <p role="alert" className="mb-gutter rounded bg-danger-soft px-space-md py-space-sm text-body text-danger-ink">
          {editar.error instanceof Error ? editar.error.message : 'Nao foi possivel salvar.'}
        </p>
      )}

      <VisaoDoBoard
        grupos={grupos}
        boardPendente={board.isPending}
        vazio={{
          titulo: 'Nenhuma tarefa ainda',
          descricao: 'Crie o primeiro grupo para comecar a organizar o trabalho da squad.',
          acao: <Button variant="primary">Criar primeiro grupo</Button>,
        }}
      >
        {grupos.data?.map((g) => (
          <TaskGroup
            key={g.id}
            grupo={g}
            membros={membros.data ?? []}
            aoEditar={(id, campos) => editar.mutate({ id, campos })}
            aoAbrir={abrirParaEditar}
            aoCriar={() => abrirParaCriar(g.id)}
          />
        ))}
      </VisaoDoBoard>

      {board.data && (
        <TaskModal
          aberto={modalAberto}
          aoFechar={fecharModal}
          boardId={board.data.id}
          taskId={taskIdModal}
          grupoInicialId={grupoParaCriar ?? grupos.todos?.[0]?.id ?? ''}
          grupos={(grupos.todos ?? []).map((g) => ({ id: g.id, name: g.name }))}
          membros={membros.data ?? []}
        />
      )}
    </BoardShell>
  )
}
