import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Filter, Plus, Search, Star, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
  { id: '/gantt', rotulo: 'Gantt', href: '/gantt' },
  { id: '/dashboard', rotulo: 'Dashboard', href: '/dashboard' },
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
        {/*
          Ícones do Stitch (favoritar/buscar/filtrar/convidar/novo item),
          todos desabilitados por enquanto — cada um liga quando chegar a
          vez do seu sub-projeto ou item da auditoria
          (docs/superpowers/specs/2026-09-17-casca-sidebar-design.md,
          seção "Barra superior do board"). "Sair" saiu daqui — mora no
          rodapé da Sidebar agora (docs/components.md, nota de BoardShell).
        */}
        <div className="flex items-center gap-space-xs">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            disabled
            aria-label="Favoritar — em breve"
            iconStart={<Star aria-hidden="true" className="size-4" />}
          />
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            disabled
            aria-label="Buscar neste quadro — em breve"
            iconStart={<Search aria-hidden="true" className="size-4" />}
          />
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            disabled
            aria-label="Filtrar — em breve"
            iconStart={<Filter aria-hidden="true" className="size-4" />}
          />
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            disabled
            aria-label="Convidar integrantes — em breve"
            iconStart={<UserPlus aria-hidden="true" className="size-4" />}
          />
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            disabled
            aria-label="Novo item — em breve"
            iconStart={<Plus aria-hidden="true" className="size-4" />}
          />
        </div>
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
