import { useEffect, type ReactNode } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Filter, Plus, Search, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tabs, type ItemTab } from '@/components/ui/Tabs'
import { lembrarUltimoBoard } from '@/lib/ultimoBoard'
import { FavoritoToggle } from './FavoritoToggle'

interface Props {
  titulo: string
  children: ReactNode
}

/**
 * Layout comum das views do board (docs/components.md, Tabela 2).
 *
 * As quatro views são leituras do MESMO dado; o que muda é a renderização.
 * O que não muda — título e seletor de visão — vive aqui, uma vez só.
 */
export function BoardShell({ titulo, children }: Props) {
  const { pathname } = useLocation()
  const { boardId = '' } = useParams<{ boardId: string }>()

  // Único ponto comum às 4 views — é aqui que a raiz `/` aprende pra onde voltar.
  useEffect(() => {
    if (boardId) lembrarUltimoBoard(boardId)
  }, [boardId])

  const base = `/boards/${boardId}`
  const views: ItemTab[] = [
    { id: base, rotulo: 'Tabela Principal', href: base },
    { id: `${base}/kanban`, rotulo: 'Kanban', href: `${base}/kanban` },
    { id: `${base}/gantt`, rotulo: 'Gantt', href: `${base}/gantt` },
    { id: `${base}/dashboard`, rotulo: 'Dashboard', href: `${base}/dashboard` },
  ]

  return (
    // <div>, não <main>: o AppShell já é o landmark main de toda rota autenticada.
    <div className="mx-auto max-w-canvas p-gutter md:p-margin">
      <div className="mb-gutter flex items-center justify-between gap-space-md">
        <h1 className="text-display">{titulo}</h1>
        {/*
          Ícones do Stitch (buscar/filtrar/convidar/novo item) desabilitados
          por enquanto — a estrela de favorito já funciona (sub-projeto 3).
          Cada um liga quando chegar a vez do seu sub-projeto ou item da auditoria
          (docs/superpowers/specs/2026-09-17-casca-sidebar-design.md,
          seção "Barra superior do board"). "Sair" saiu daqui — mora no
          rodapé da Sidebar agora (docs/components.md, nota de BoardShell).
        */}
        <div className="flex items-center gap-space-xs">
          <FavoritoToggle boardId={boardId} nome={titulo} />
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
        items={views}
        value={pathname}
        className="mb-margin border-b border-border"
      />
      {children}
    </div>
  )
}
