import { useState, type ComponentType } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Activity,
  Bell,
  HelpCircle,
  LayoutGrid,
  LayoutTemplate,
  LogOut,
  Menu as MenuIcon,
  Plus,
  Settings,
  Star,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'
import { useMembros, useWorkspaceAtual } from '@/hooks/useQuadro'
import { useSessao } from '@/hooks/useSessao'
import { sair } from '@/services/auth'

interface ItemNav {
  href: string
  rotulo: string
  Icone: ComponentType<{ 'aria-hidden'?: boolean | 'true'; className?: string }>
}

const ITENS_NAV: ItemNav[] = [
  { href: '/paineis', rotulo: 'Meus Painéis', Icone: LayoutGrid },
  { href: '/favoritos', rotulo: 'Favoritos', Icone: Star },
  { href: '/atividades', rotulo: 'Atividades', Icone: Activity },
  { href: '/modelos', rotulo: 'Modelos', Icone: LayoutTemplate },
]

const ITENS_RODAPE: ItemNav[] = [
  { href: '/notificacoes', rotulo: 'Notificações', Icone: Bell },
  { href: '/ajuda', rotulo: 'Ajuda', Icone: HelpCircle },
  { href: '/configuracoes', rotulo: 'Configurações', Icone: Settings },
]

// rail (md): só ícone, rótulo em sr-only. completa (lg+): rótulo visível.
// drawer: rótulo sempre visível — se está vendo o drawer, está no mobile.
// No escopo do módulo (não do componente): não fecha sobre nenhuma variável
// de Sidebar(), então oxlint (unicorn/consistent-function-scoping) reprova
// recriá-la a cada render.
function classeRotulo(tipo: 'aside' | 'drawer') {
  return cn('truncate', tipo === 'aside' && 'sr-only lg:not-sr-only')
}

/**
 * Casca de navegação do workspace (docs/auditoria-stitch.md item 1,
 * docs/superpowers/specs/2026-09-17-casca-sidebar-design.md). Responsiva
 * conforme docs/responsive.md:38-40 — drawer@375, rail@768 (md), completa
 * a partir de 1024 (lg — mesma aproximação de "1440" que TaskGroup.tsx já
 * usa nas colunas de Prioridade/Progresso, não existe breakpoint 1440
 * exato no Tailwind).
 */
export function Sidebar() {
  const [aberto, setAberto] = useState(false)
  const { pathname } = useLocation()
  const workspace = useWorkspaceAtual()
  const membros = useMembros()
  const { usuario } = useSessao()
  const eu = membros.data?.find((m) => m.id === usuario?.id)

  function itemDeNav(item: ItemNav, tipo: 'aside' | 'drawer') {
    const ativo = pathname === item.href
    return (
      <Link
        key={item.href}
        to={item.href}
        aria-current={ativo ? 'page' : undefined}
        onClick={() => setAberto(false)}
        title={item.rotulo}
        className={cn(
          'flex min-h-touch items-center gap-space-sm rounded px-space-md text-body',
          ativo ? 'bg-primary-soft font-semibold text-primary' : 'text-sidebar-fg-muted hover:bg-sidebar-hover',
        )}
      >
        <item.Icone aria-hidden="true" className="size-5 shrink-0" />
        <span className={classeRotulo(tipo)}>{item.rotulo}</span>
      </Link>
    )
  }

  function conteudo(tipo: 'aside' | 'drawer') {
    const rotulo = classeRotulo(tipo)
    return (
      <>
        <div className="px-space-md py-space-md">
          <p className={cn('text-title font-semibold text-sidebar-fg', rotulo)}>
            {workspace.data?.name ?? 'Workspace'}
          </p>
        </div>

        <div className="px-space-sm">
          <Button
            variant="primary"
            size="sm"
            className="w-full justify-start"
            iconStart={<Plus aria-hidden="true" className="size-4" />}
            disabled
            aria-label="Criar novo painel — em breve"
          >
            <span className={rotulo}>Novo Painel</span>
          </Button>
        </div>

        <nav aria-label="Navegação do workspace" className="flex flex-col gap-space-xs px-space-sm py-space-md">
          {ITENS_NAV.map((item) => itemDeNav(item, tipo))}
        </nav>

        <div className="mt-auto flex flex-col gap-space-xs border-t border-sidebar-hover px-space-sm py-space-md">
          {ITENS_RODAPE.map((item) => itemDeNav(item, tipo))}

          {eu && (
            <div className="flex items-center gap-space-sm px-space-md py-space-sm">
              <Avatar users={[eu]} size="sm" />
              <span className={cn('text-cell text-sidebar-fg', rotulo)}>{eu.full_name}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => void sair()}
            title="Sair"
            className="flex min-h-touch items-center gap-space-sm rounded px-space-md text-body text-sidebar-fg-muted hover:bg-sidebar-hover"
          >
            <LogOut aria-hidden="true" className="size-5 shrink-0" />
            <span className={rotulo}>Sair</span>
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Gatilho do drawer — a faixa em si é irrelevante em telas largas
          (não custa nada mantê-la simples e sempre presente; a sidebar
          completa/rail ao lado já cobre a navegação nesses tamanhos). */}
      <div className="flex items-center gap-space-sm border-b border-border bg-surface px-space-md py-space-sm md:hidden">
        <button
          type="button"
          aria-expanded={aberto}
          aria-label="Abrir menu"
          onClick={() => setAberto(true)}
          className="grid min-h-touch min-w-touch place-items-center rounded hover:bg-surface-2"
        >
          <MenuIcon aria-hidden="true" className="size-5" />
        </button>
        <span className="truncate text-body font-semibold text-ink">{workspace.data?.name ?? 'Workspace'}</span>
      </div>

      <aside className="hidden shrink-0 flex-col bg-sidebar md:flex md:w-16 lg:w-60">{conteudo('aside')}</aside>

      <Modal size="drawer" open={aberto} onClose={() => setAberto(false)} title={workspace.data?.name ?? 'Workspace'}>
        <div className="flex min-h-full flex-col bg-sidebar">{conteudo('drawer')}</div>
      </Modal>
    </>
  )
}
