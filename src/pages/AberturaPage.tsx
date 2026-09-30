import { Navigate } from 'react-router-dom'
import { EsqueletoDaRota } from '@/components/features/Esqueletos'
import { StateView } from '@/components/ui/StateView'
import { useBoards } from '@/hooks/useQuadro'
import { lerUltimoBoard } from '@/lib/ultimoBoard'

/**
 * Raiz `/`: vai direto pro trabalho — último board visitado se ainda existir,
 * senão o mais antigo (docs/superpowers/specs/2026-09-25-multiplos-boards-design.md).
 */
export default function AberturaPage() {
  const boards = useBoards()

  // Vai virar a tabela do primeiro board: já mostra a forma dela.
  if (boards.isPending) return <EsqueletoDaRota />

  if (boards.isError) {
    return (
      <StateView
        estado={{ tipo: 'erro', mensagem: boards.error.message, aoTentarDeNovo: () => void boards.refetch() }}
      >
        {null}
      </StateView>
    )
  }

  const ultimo = lerUltimoBoard()
  const alvo = boards.data.find((b) => b.id === ultimo) ?? boards.data[0]
  // Sem nenhum board, a lista é quem oferece "Criar painel" — um lugar só.
  return <Navigate to={alvo ? `/boards/${alvo.id}` : '/paineis'} replace />
}
