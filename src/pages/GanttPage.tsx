import { BoardShell } from '@/components/features/BoardShell'
import { GanttChart } from '@/components/features/GanttChart'
import { Button } from '@/components/ui/Button'
import { StateView } from '@/components/ui/StateView'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import { useBoardAtual, useGruposComTarefas } from '@/hooks/useQuadro'

export default function GanttPage() {
  const board = useBoardAtual()
  const grupos = useGruposComTarefas(board.data?.id)

  const estado = estadoDaQuery(
    board.isPending ? { ...grupos, isPending: true } : grupos,
    {
      titulo: 'Nenhuma tarefa ainda',
      descricao: 'Crie tarefas com período definido para vê-las no cronograma.',
      acao: <Button variant="primary">Ver Tabela Principal</Button>,
    },
    () => void grupos.refetch(),
  )

  return (
    <BoardShell titulo={board.data?.name ?? 'Quadro'}>
      <StateView estado={estado}>
        <GanttChart grupos={grupos.data ?? []} />
      </StateView>
    </BoardShell>
  )
}
