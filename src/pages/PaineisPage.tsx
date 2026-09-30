import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { BoardCard } from '@/components/features/BoardCard'
import { BoardFormModal } from '@/components/features/BoardFormModal'
import { ExcluirBoardDialog } from '@/components/features/ExcluirBoardDialog'
import { Button } from '@/components/ui/Button'
import { EsqueletoPaineis } from '@/components/features/Esqueletos'
import { StateView } from '@/components/ui/StateView'
import { useBoards, useFavoritos } from '@/hooks/useQuadro'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import type { Board } from '@/types/domain'

interface Props {
  /** '/favoritos' é esta mesma página filtrada — reusa os modais sem duplicar estado. */
  filtro?: 'todos' | 'favoritos'
}

export default function PaineisPage({ filtro = 'todos' }: Props) {
  const boards = useBoards()
  const favoritos = useFavoritos()
  const soFavoritos = filtro === 'favoritos'
  // null = fechado, 'novo' = criando, um Board = renomeando.
  const [form, setForm] = useState<Board | 'novo' | null>(null)
  const [boardParaExcluir, setBoardParaExcluir] = useState<Board | null>(null)
  const abrirCriacao = () => setForm('novo')
  const tituloRef = useRef<HTMLHeadingElement>(null)

  const lista = soFavoritos ? boards.data?.filter((b) => favoritos.data?.includes(b.id)) : boards.data
  // Na variante favoritos, os quatro estados dependem das duas queries.
  const consulta = soFavoritos
    ? {
        isPending: boards.isPending || favoritos.isPending,
        isError: boards.isError || favoritos.isError,
        error: boards.error ?? favoritos.error,
        data: lista,
      }
    : boards

  const estado = estadoDaQuery(
    consulta,
    soFavoritos
      ? {
          titulo: 'Nenhum favorito ainda',
          descricao: 'Marque a estrela de um painel para vê-lo aqui.',
          acao: (
            <Link to="/paineis" className="text-body font-semibold text-primary underline">
              Ver Meus Painéis
            </Link>
          ),
        }
      : {
          titulo: 'Nenhum painel ainda',
          descricao: 'Crie um painel para organizar o trabalho da squad.',
          acao: (
            <Button variant="primary" onClick={abrirCriacao}>
              Criar painel
            </Button>
          ),
        },
    () => {
      void boards.refetch()
      if (soFavoritos) void favoritos.refetch()
    },
  )

  return (
    <div className="mx-auto max-w-canvas p-gutter md:p-margin">
      <div className="mb-gutter flex items-center justify-between gap-space-md">
        <h1 ref={tituloRef} tabIndex={-1} className="text-display focus:outline-none">
          {soFavoritos ? 'Favoritos' : 'Meus Painéis'}
        </h1>
        <Button
          variant="primary"
          size="sm"
          iconStart={<Plus aria-hidden="true" className="size-4" />}
          onClick={abrirCriacao}
        >
          Novo Painel
        </Button>
      </div>

      <StateView estado={estado} esqueleto={<EsqueletoPaineis />}>
        <ul className="grid grid-cols-1 gap-space-md md:grid-cols-2 lg:grid-cols-3">
          {lista?.map((b) => (
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
        aoFechar={() => {
          setBoardParaExcluir(null)
          // Cancelou: o Modal devolve o foco ao "⋮" logo depois, e ele vence.
          // Excluiu: o "⋮" sumiu com o card, então o foco fica no título.
          tituloRef.current?.focus()
        }}
        ehOUltimo={(boards.data?.length ?? 0) <= 1}
      />
    </div>
  )
}
