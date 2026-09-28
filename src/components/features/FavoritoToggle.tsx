import { Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAlternarFavorito, useFavoritos } from '@/hooks/useQuadro'
import { cn } from '@/lib/cn'

interface Props {
  boardId: string
  nome: string
}

/**
 * Estrela de favorito — autossuficiente: lê e alterna sozinha, quem usa só passa
 * id e nome (docs/superpowers/specs/2026-09-28-favoritos-design.md).
 */
export function FavoritoToggle({ boardId, nome }: Props) {
  const favoritos = useFavoritos()
  const alternar = useAlternarFavorito()
  const ativo = favoritos.data?.includes(boardId) ?? false

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        aria-label={`Favoritar ${nome}`}
        aria-pressed={ativo}
        disabled={favoritos.isPending}
        onClick={() => alternar.mutate({ boardId, favorito: !ativo })}
        iconStart={<Star aria-hidden="true" className={cn('size-4', ativo && 'fill-current text-primary')} />}
      />
      {alternar.isError && (
        <span role="alert" className="sr-only">
          Não foi possível atualizar o favorito de {nome}.
        </span>
      )}
    </>
  )
}
