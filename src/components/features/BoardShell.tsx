import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Tabs, type ItemTab } from '@/components/ui/Tabs'

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
      <h1 className="mb-gutter text-display">{titulo}</h1>
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
