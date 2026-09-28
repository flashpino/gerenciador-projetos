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
  // null = fechado, 'novo' = criando, um Board = renomeando.
  const [form, setForm] = useState<Board | 'novo' | null>(null)
  const [boardParaExcluir, setBoardParaExcluir] = useState<Board | null>(null)
  const abrirCriacao = () => setForm('novo')

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
              <BoardCard board={b} aoRenomear={setForm} aoExcluir={setBoardParaExcluir} />
            </li>
          ))}
        </ul>
      </StateView>

      <BoardFormModal
        aberto={form !== null}
        aoFechar={() => setForm(null)}
        board={form === 'novo' ? null : form}
      />
      <ExcluirBoardDialog
        board={boardParaExcluir}
        aoFechar={() => setBoardParaExcluir(null)}
        ehOUltimo={(boards.data?.length ?? 0) <= 1}
      />
    </div>
  )
}
