import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { StateView } from '@/components/ui/StateView'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import { Button } from '@/components/ui/Button'
import { BoardShell } from '@/components/features/BoardShell'
import { TaskGroup } from '@/components/features/TaskGroup'
import { TaskModal } from '@/components/features/TaskModal'
import { useAtualizarTarefa, useBoard, useGruposComTarefas, useMembros } from '@/hooks/useQuadro'
import type { Task } from '@/types/domain'

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const board = useBoard(boardId)
  const grupos = useGruposComTarefas(boardId)
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

  // Os QUATRO estados, num lugar so. Nenhuma tela do app inventa a propria regra.
  const estado = estadoDaQuery(
    board.isPending ? { ...grupos, isPending: true } : grupos,
    {
      titulo: 'Nenhuma tarefa ainda',
      descricao: 'Crie o primeiro grupo para comecar a organizar o trabalho da squad.',
      acao: <Button variant="primary">Criar primeiro grupo</Button>,
    },
    () => void grupos.refetch(),
  )

  return (
    <BoardShell titulo={board.data?.name ?? 'Quadro'}>
      {editar.isError && (
        <p role="alert" className="mb-gutter rounded bg-danger-soft px-space-md py-space-sm text-body text-danger-ink">
          {editar.error instanceof Error ? editar.error.message : 'Nao foi possivel salvar.'}
        </p>
      )}

      <StateView estado={estado}>
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
      </StateView>

      {board.data && (
        <TaskModal
          aberto={modalAberto}
          aoFechar={fecharModal}
          boardId={board.data.id}
          taskId={taskIdModal}
          grupoInicialId={grupoParaCriar ?? grupos.data?.[0]?.id ?? ''}
          grupos={(grupos.data ?? []).map((g) => ({ id: g.id, name: g.name }))}
          membros={membros.data ?? []}
        />
      )}
    </BoardShell>
  )
}
