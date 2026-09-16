import { StateView } from '@/components/ui/StateView'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import { Button } from '@/components/ui/Button'
import { TaskGroup } from '@/components/features/TaskGroup'
import { useAtualizarTarefa, useBoardAtual, useGruposComTarefas, useMembros } from '@/hooks/useQuadro'

export default function BoardPage() {
  const board = useBoardAtual()
  const grupos = useGruposComTarefas(board.data?.id)
  const membros = useMembros()
  const editar = useAtualizarTarefa(board.data?.id)

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
    <main className="mx-auto max-w-[1440px] p-gutter md:p-margin">
      <h1 className="mb-margin text-display">{board.data?.name ?? 'Quadro'}</h1>

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
            aoAbrir={() => {
              /* modal de detalhe entra na proxima fatia (F5) */
            }}
          />
        ))}
      </StateView>
    </main>
  )
}
