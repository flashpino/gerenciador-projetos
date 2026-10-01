import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Filter, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tabs, type ItemTab } from '@/components/ui/Tabs'
import { TextInput } from '@/components/ui/TextInput'
import { cn } from '@/lib/cn'
import { useBuscaDoBoard } from '@/hooks/useBuscaDoBoard'
import { useFiltroTarefas } from '@/hooks/useFiltroTarefas'
import { useBoard, useGruposComTarefas, useMembros, useTrocarWorkspace } from '@/hooks/useQuadro'
import { contarFiltros } from '@/lib/filtro'
import { lembrarUltimoBoard } from '@/lib/ultimoBoard'
import { lerWorkspaceAtual } from '@/lib/workspaceAtual'
import { FavoritoToggle } from './FavoritoToggle'
import { FiltroTarefasModal } from './FiltroTarefasModal'
import { TaskModal } from './TaskModal'

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
  const [filtrosAberto, setFiltrosAberto] = useState(false)
  const [novoAberto, setNovoAberto] = useState(false)
  // Mesma consulta das visões (cache compartilhado), SEM o filtro: o modal oferece todos os grupos.
  const grupos = useGruposComTarefas(boardId)
  const opcoesGrupo = (grupos.data ?? []).map((g) => ({ id: g.id, name: g.name }))

  // Único ponto comum às 4 views — é aqui que a raiz `/` aprende pra onde voltar.
  useEffect(() => {
    if (boardId) lembrarUltimoBoard(boardId)
  }, [boardId])

  // Abrir um painel de outro workspace (link, favorito) torna ele o atual: menu e Meus Painéis acompanham.
  const trocarWorkspace = useTrocarWorkspace()
  const workspaceDoBoard = board.data?.workspace_id
  useEffect(() => {
    if (workspaceDoBoard && workspaceDoBoard !== lerWorkspaceAtual()) trocarWorkspace(workspaceDoBoard)
  }, [workspaceDoBoard, trocarWorkspace])

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
          {/* Quebra no celular (o nome inteiro importa mais que uma linha só); corta só de md em diante. */}
          <h1 className="min-w-0 break-words text-display md:truncate">{titulo}</h1>
          <FavoritoToggle boardId={boardId} nome={titulo} />
        </div>
        {/*
          Estrela (sub-projeto 3) e busca e filtros (sub-projeto 9). Compartilhar saiu daqui:
          é do workspace inteiro, no seletor do menu lateral. "Novo item" cria tarefa de qualquer visão, no
          primeiro grupo (trocável no modal). "Sair" mora no rodapé da Sidebar.
        */}
        <div className={cn('glass flex items-center gap-space-xs rounded-full p-space-xs', podeFiltrar && 'w-full md:w-auto')}>
          {podeFiltrar && (
            <>
              <div className="relative flex min-w-0 flex-1 items-center md:flex-none">
                <Search aria-hidden="true" className="pointer-events-none absolute left-space-md size-4 text-ink-muted" />
                <TextInput
                  type="search"
                  aria-label="Buscar neste quadro"
                  placeholder="Buscar tarefa…"
                  value={busca.texto}
                  onChange={(e) => busca.setTexto(e.target.value)}
                  className="w-full rounded-full border-transparent bg-transparent pl-10 md:w-56"
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
            // Sem grupo não há onde a tarefa morar (tasks.group_id NOT NULL).
            disabled={!board.data || opcoesGrupo.length === 0}
            onClick={() => setNovoAberto(true)}
            aria-label="Novo item"
            aria-haspopup="dialog"
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
      {/* key = aba: cada visão entra com o mesmo fade curto; título, busca e abas ficam parados. */}
      <div key={pathname} className="animate-entrar">
        {children}
      </div>
      <FiltroTarefasModal
        aberto={filtrosAberto}
        aoFechar={() => setFiltrosAberto(false)}
        filtro={filtro}
        aoMudar={definir}
        membros={membros.data ?? []}
      />
      {board.data && (
        <TaskModal
          aberto={novoAberto}
          aoFechar={() => setNovoAberto(false)}
          boardId={board.data.id}
          taskId={null}
          grupoInicialId={opcoesGrupo[0]?.id ?? ''}
          grupos={opcoesGrupo}
          membros={membros.data ?? []}
        />
      )}
    </div>
  )
}
