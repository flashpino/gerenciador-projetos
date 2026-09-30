import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Filter, Plus, Search, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tabs, type ItemTab } from '@/components/ui/Tabs'
import { TextInput } from '@/components/ui/TextInput'
import { useBuscaDoBoard } from '@/hooks/useBuscaDoBoard'
import { useFiltroTarefas } from '@/hooks/useFiltroTarefas'
import { useBoard, useMembros } from '@/hooks/useQuadro'
import { contarFiltros } from '@/lib/filtro'
import { lembrarUltimoBoard } from '@/lib/ultimoBoard'
import { FavoritoToggle } from './FavoritoToggle'
import { FiltroTarefasModal } from './FiltroTarefasModal'
import { IntegrantesModal } from './IntegrantesModal'

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
  const board = useBoard(boardId)
  const membros = useMembros(board.data?.workspace_id)
  const { filtro, definir } = useFiltroTarefas()
  const busca = useBuscaDoBoard()
  const [integrantesAberto, setIntegrantesAberto] = useState(false)
  const [filtrosAberto, setFiltrosAberto] = useState(false)

  // Único ponto comum às 4 views — é aqui que a raiz `/` aprende pra onde voltar.
  useEffect(() => {
    if (boardId) lembrarUltimoBoard(boardId)
  }, [boardId])

  const base = `/boards/${boardId}`
  // A busca e os filtros moram na query da URL; as abas a levam junto, então trocar
  // de visão mantém o recorte (docs/superpowers/specs/2026-09-30-busca-filtros-design.md).
  const { search } = useLocation()
  const views: ItemTab[] = [
    { id: base, rotulo: 'Tabela Principal', href: `${base}${search}` },
    { id: `${base}/kanban`, rotulo: 'Kanban', href: `${base}/kanban${search}` },
    { id: `${base}/gantt`, rotulo: 'Gantt', href: `${base}/gantt${search}` },
    { id: `${base}/dashboard`, rotulo: 'Dashboard', href: `${base}/dashboard${search}` },
  ]
  // As métricas são do board inteiro: "taxa de conclusão" de um recorte enganaria.
  const podeFiltrar = pathname !== `${base}/dashboard`
  const nFiltros = contarFiltros(filtro)
  const rotuloFiltrar =
    nFiltros === 0 ? 'Filtrar' : `Filtrar, ${nFiltros} ${nFiltros === 1 ? 'filtro ativo' : 'filtros ativos'}`

  return (
    // <div>, não <main>: o AppShell já é o landmark main de toda rota autenticada.
    <div className="mx-auto max-w-canvas p-gutter md:p-margin">
      <div className="mb-gutter flex flex-wrap items-center justify-between gap-space-md">
        <div className="flex min-w-0 items-center gap-space-sm">
          <h1 className="min-w-0 truncate text-display">{titulo}</h1>
          <FavoritoToggle boardId={boardId} nome={titulo} />
        </div>
        {/*
          Estrela (sub-projeto 3), busca e filtros (sub-projeto 9) e convidar
          (sub-projeto 6) funcionam; "Novo item" segue desabilitado até ter vez
          (docs/superpowers/specs/2026-09-17-casca-sidebar-design.md, seção
          "Barra superior do board"). "Sair" mora no rodapé da Sidebar.
        */}
        <div className="glass flex items-center gap-space-xs rounded-full p-space-xs">
          {podeFiltrar && (
            <>
              <div className="relative flex items-center">
                <Search aria-hidden="true" className="pointer-events-none absolute left-space-md size-4 text-ink-muted" />
                <TextInput
                  type="search"
                  aria-label="Buscar neste quadro"
                  placeholder="Buscar tarefa…"
                  value={busca.texto}
                  onChange={(e) => busca.setTexto(e.target.value)}
                  className="w-40 rounded-full border-transparent bg-transparent pl-10 md:w-56"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label={rotuloFiltrar}
                aria-haspopup="dialog"
                onClick={() => setFiltrosAberto(true)}
                iconStart={<Filter aria-hidden="true" className="size-4" />}
              >
                <span aria-hidden="true">Filtrar</span>
                {nFiltros > 0 && (
                  <span
                    aria-hidden="true"
                    className="grid min-w-5 place-items-center rounded-full bg-primary px-space-xs text-micro text-primary-fg"
                  >
                    {nFiltros}
                  </span>
                )}
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            disabled={!board.data}
            onClick={() => setIntegrantesAberto(true)}
            aria-label="Convidar integrantes"
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
        variant="pill"
        rotulo="Visões do quadro"
        items={views}
        value={pathname}
        className="glass mb-margin w-fit max-w-full rounded-full p-space-xs"
      />
      {children}
      <FiltroTarefasModal
        aberto={filtrosAberto}
        aoFechar={() => setFiltrosAberto(false)}
        filtro={filtro}
        aoMudar={definir}
        membros={membros.data ?? []}
      />
      {board.data && (
        <IntegrantesModal
          aberto={integrantesAberto}
          aoFechar={() => setIntegrantesAberto(false)}
          workspaceId={board.data.workspace_id}
          donoId={board.data.owner_id}
        />
      )}
    </div>
  )
}
