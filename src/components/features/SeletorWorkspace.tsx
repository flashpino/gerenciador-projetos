import { useNavigate } from 'react-router-dom'
import { ChevronsUpDown } from 'lucide-react'
import { Menu, type ItemMenu } from '@/components/ui/Menu'
import { cn } from '@/lib/cn'
import { useTrocarWorkspace, useWorkspaceAtual, useWorkspaces } from '@/hooks/useQuadro'

interface Props {
  aoNovo: () => void
  aoCompartilhar: () => void
  /** `trilho`: o logo redondo do menu lateral (md+). `gaveta`: o nome em texto, no drawer do celular. */
  variante?: 'trilho' | 'gaveta'
}

/**
 * Seletor do workspace aberto: lista os de que a pessoa é membro (o atual marcado) e as ações do workspace.
 * Compartilhar é do WORKSPACE inteiro — quem entra vê todos os painéis dele (não há convite por painel).
 */
export function SeletorWorkspace({ aoNovo, aoCompartilhar, variante = 'trilho' }: Props) {
  const navigate = useNavigate()
  const workspaces = useWorkspaces()
  const atual = useWorkspaceAtual()
  const trocar = useTrocarWorkspace()
  const nome = atual.data?.name ?? 'Workspace'

  const itens: ItemMenu[] = [
    ...(workspaces.data ?? []).map((w) => ({
      id: w.id,
      rotulo: w.name,
      selecionado: w.id === atual.data?.id,
      aoEscolher: () => {
        trocar(w.id)
        navigate('/paineis')
      },
    })),
    { id: 'novo', rotulo: 'Novo workspace', aoEscolher: aoNovo },
    { id: 'compartilhar', rotulo: 'Compartilhar workspace', aoEscolher: aoCompartilhar },
    { id: 'gerenciar', rotulo: 'Gerenciar workspaces', aoEscolher: () => navigate('/workspaces') },
  ]

  return (
    <Menu
      rotulo="Workspaces"
      items={itens}
      trigger={(p) =>
        variante === 'trilho' ? (
          <button
            {...p}
            type="button"
            aria-label={`Workspace: ${nome}. Trocar`}
            className="mb-space-sm grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-fg transition-colors duration-fast hover:bg-primary-hover"
          >
            {/* As três colunas do kanban: a mesma marca do ícone do app. */}
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-current">
              <rect x="3" y="3" width="4.5" height="18" rx="1.6" />
              <rect x="9.75" y="3" width="4.5" height="13" rx="1.6" />
              <rect x="16.5" y="3" width="4.5" height="8" rx="1.6" />
            </svg>
          </button>
        ) : (
          <button
            {...p}
            type="button"
            aria-label={`Workspace: ${nome}. Trocar`}
            className={cn(
              'flex min-h-touch w-full items-center justify-between gap-space-sm rounded-full px-space-md text-left',
              'text-title font-semibold text-sidebar-fg hover:bg-sidebar-hover',
            )}
          >
            <span className="truncate">{nome}</span>
            <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0" />
          </button>
        )
      }
    />
  )
}
