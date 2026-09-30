import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useCriarBoard, useWorkspaceAtual } from '@/hooks/useQuadro'
import { MODELOS, type Modelo } from '@/lib/modelos'
import type { GroupColor } from '@/types/domain'

// ponytail: segunda cópia do mapa de cor de TaskGroup.tsx; unificar na terceira (regra dos três).
const COR: Record<GroupColor, string> = {
  azure: 'bg-group-azure',
  grape: 'bg-group-grape',
  mint: 'bg-group-mint',
  crimson: 'bg-group-crimson',
}

/**
 * Catálogo estático: não há consulta, logo não há loading/erro/vazio de lista
 * e a tela não usa StateView. O único estado assíncrono é a criação do board.
 */
export default function ModelosPage() {
  const workspace = useWorkspaceAtual()
  const criar = useCriarBoard()
  const navigate = useNavigate()

  function usar(modelo: Modelo) {
    if (!workspace.data) return
    criar.mutate(
      { workspaceId: workspace.data.id, name: modelo.nome, grupos: modelo.grupos },
      { onSuccess: (novo) => navigate(`/boards/${novo.id}`) },
    )
  }

  return (
    <div className="mx-auto max-w-canvas p-gutter md:p-margin">
      <h1 className="mb-gutter text-display">Modelos</h1>

      {criar.isError && (
        <p role="alert" className="mb-gutter rounded bg-danger-soft px-space-md py-space-sm text-body text-danger-ink">
          {criar.error.message}
        </p>
      )}

      <ul className="grid gap-space-md md:grid-cols-2 lg:grid-cols-3">
        {MODELOS.map((modelo) => {
          const criandoEste = criar.isPending && criar.variables?.name === modelo.nome
          return (
            <li
              key={modelo.nome}
              className="flex flex-col gap-space-sm glass rounded-card p-space-md"
            >
              <h2 className="text-title text-ink">{modelo.nome}</h2>
              <p className="text-body text-ink-muted">{modelo.descricao}</p>
              <ul aria-label={`Grupos de ${modelo.nome}`} className="flex flex-col gap-space-xs">
                {modelo.grupos.map((g) => (
                  <li key={g.name} className="flex items-center gap-space-sm text-label text-ink">
                    <span aria-hidden="true" className={`size-2 rounded-full ${COR[g.color]}`} />
                    {g.name}
                  </li>
                ))}
              </ul>
              {/* Três botões "Usar modelo" na tela: o nome do modelo vai só para o leitor de tela. */}
              <Button
                variant="primary"
                className="mt-auto"
                loading={criandoEste}
                disabled={!workspace.data || criar.isPending}
                onClick={() => usar(modelo)}
              >
                {criandoEste ? 'Criando…' : 'Usar modelo'}{' '}
                <span className="sr-only">{modelo.nome}</span>
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
