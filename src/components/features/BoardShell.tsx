import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tabs, type ItemTab } from '@/components/ui/Tabs'
import { sair } from '@/services/auth'

/**
 * Layout comum das views do board (docs/components.md, Tabela 2).
 *
 * As quatro views são leituras do MESMO dado; o que muda é a renderização.
 * O que não muda — título e seletor de visão — vive aqui, uma vez só.
 */
const VIEWS: ItemTab[] = [
  { id: '/', rotulo: 'Tabela Principal', href: '/' },
  { id: '/kanban', rotulo: 'Kanban', href: '/kanban' },
  // F3 (Gantt) e F4 (Dashboard) acrescentam sua linha aqui quando existirem.
  // Aba que leva a 404 é pior que aba ausente.
]

interface Props {
  titulo: string
  children: ReactNode
}

export function BoardShell({ titulo, children }: Props) {
  const { pathname } = useLocation()

  return (
    <main className="mx-auto max-w-canvas p-gutter md:p-margin">
      <div className="mb-gutter flex items-center justify-between gap-space-md">
        <h1 className="text-display">{titulo}</h1>
        {/* ponytail: botao direto chamando o servico. Nao e leitura/escrita de
            dado em cache (TanStack Query) — e uma acao global, o
            SessaoProvider ja reage ao SIGNED_OUT e o RotaProtegida redireciona
            sozinho. Sem falha esperada em signOut que valha superficie de erro. */}
        <Button variant="ghost" size="sm" iconStart={<LogOut aria-hidden="true" className="size-4" />} onClick={() => void sair()}>
          Sair
        </Button>
      </div>
      <Tabs
        rotulo="Visões do quadro"
        items={VIEWS}
        value={pathname}
        className="mb-margin border-b border-border"
      />
      {children}
    </main>
  )
}
