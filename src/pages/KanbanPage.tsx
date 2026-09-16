import { BoardShell } from '@/components/features/BoardShell'
import { KanbanBoard } from '@/components/features/KanbanBoard'
import { Button } from '@/components/ui/Button'
import { StateView } from '@/components/ui/StateView'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import { useAtualizarTarefa, useBoardAtual, useGruposComTarefas, useMembros } from '@/hooks/useQuadro'

export default function KanbanPage() {
  const board = useBoardAtual()
  const grupos = useGruposComTarefas(board.data?.id)
  const membros = useMembros()
  const editar = useAtualizarTarefa(board.data?.id)

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
          aoAbrir={() => {
            /* modal de detalhe entra na F5 */
          }}
        />
      </StateView>
    </BoardShell>
  )
}
