import { useState } from 'react'
import { Plus } from 'lucide-react'
import { BoardCard } from '@/components/features/BoardCard'
import { BoardFormModal } from '@/components/features/BoardFormModal'
import { ExcluirBoardDialog } from '@/components/features/ExcluirBoardDialog'
import { Button } from '@/components/ui/Button'
import { StateView } from '@/components/ui/StateView'
import { useBoards } from '@/hooks/useQuadro'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import type { Board } from '@/types/domain'

export default function PaineisPage() {
  const boards = useBoards()
  const [formAberto, setFormAberto] = useState(false)
  // null com o form aberto = criando. Mesma ideia de taskIdModal em BoardPage.
  const [boardEmEdicao, setBoardEmEdicao] = useState<Board | null>(null)
  const [boardParaExcluir, setBoardParaExcluir] = useState<Board | null>(null)

  function abrirCriacao() {
    setBoardEmEdicao(null)
    setFormAberto(true)
  }

  function abrirRenomear(board: Board) {
    setBoardEmEdicao(board)
    setFormAberto(true)
  }

  const estado = estadoDaQuery(
    boards,
    {
      titulo: 'Nenhum painel ainda',
      descricao: 'Crie um painel para organizar o trabalho da squad.',
      acao: (
        <Button variant="primary" onClick={abrirCriacao}>
          Criar painel
        </Button>
      ),
    },
    () => void boards.refetch(),
  )

  return (
    <div className="mx-auto max-w-canvas p-gutter md:p-margin">
      <div className="mb-gutter flex items-center justify-between gap-space-md">
        <h1 className="text-display">Meus Painéis</h1>
        <Button
          variant="primary"
          size="sm"
          iconStart={<Plus aria-hidden="true" className="size-4" />}
          onClick={abrirCriacao}
        >
          Novo Painel
        </Button>
      </div>

      <StateView estado={estado}>
        <ul className="grid grid-cols-1 gap-space-md md:grid-cols-2 lg:grid-cols-3">
          {boards.data?.map((b) => (
            <li key={b.id}>
              <BoardCard board={b} aoRenomear={abrirRenomear} aoExcluir={setBoardParaExcluir} />
            </li>
          ))}
        </ul>
      </StateView>

      <BoardFormModal aberto={formAberto} aoFechar={() => setFormAberto(false)} board={boardEmEdicao} />
      <ExcluirBoardDialog
        board={boardParaExcluir}
        aoFechar={() => setBoardParaExcluir(null)}
        ehOUltimo={(boards.data?.length ?? 0) <= 1}
      />
    </div>
  )
}
