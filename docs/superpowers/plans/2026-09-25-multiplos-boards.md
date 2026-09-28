# Múltiplos Boards — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline).
> **Não** usar superpowers:subagent-driven-development como está: ela faz o subagente
> commitar dentro da própria tarefa, e o `CLAUDE.md` exige mostrar o diff ao usuário
> **antes** do commit. Se usar subagentes, eles param no passo "Mostrar o diff" e quem
> commita é o controlador, depois do OK do usuário. Steps usam checkbox (`- [ ]`).

**Goal:** CRUD de boards no workspace (criar, listar, renomear, excluir) com rotas por
`/boards/:boardId`, conforme `docs/superpowers/specs/2026-09-25-multiplos-boards-design.md`.

**Architecture:** Serviço e hooks ganham 5 funções de board; `buscarBoardAtual`/`useBoardAtual`
somem. As 4 views passam a ler `:boardId` da URL; `/` vira um redirecionamento
(`AberturaPage`) que usa o último board guardado no `localStorage`. `/paineis` ganha a lista
real (`PaineisPage` + `BoardCard` + `BoardFormModal` + `ExcluirBoardDialog`). Sem migration.

**Tech Stack:** React 19, TypeScript strict, React Router v7, TanStack Query v5, Tailwind v4,
Vitest + RTL + user-event, lucide-react.

## Global Constraints

- Zero valor hardcoded de cor/espaço/fonte — só tokens de `src/styles/tokens.css`.
- Ícones de `lucide-react` importados individualmente, nunca por namespace.
- Testes consultam por `getByRole`/`getByLabelText`/`getByText` — nunca por classe CSS.
- Nenhum arquivo novo em `src/components/ui/` (teto de 12 primitivos atingido).
- Nome de board: 1–120 caracteres (constraint `boards.name` em `0001_init.up.sql`).
- Nenhuma migration. Nenhuma dependência nova.
- **Toda tarefa que cria arquivo novo começa com `/graphify query`** (manual §7.2).
- **Todo commit é precedido de mostrar o diff ao usuário e esperar o OK** (`CLAUDE.md`).
- Sucesso de comando: sempre `cmd > log 2>&1; echo $?` e ler o código de saída — nunca
  inferir de saída encanada (`CLAUDE.md`, "Erros já cometidos").

---

### Task 0: Atualizar o grafo

**Files:** nenhum.

O `graphify-out/` é de 2026-09-16 — anterior à Sidebar/AppShell. Query num grafo velho
responde com confiança sobre um código que não existe mais.

- [ ] **Step 1:** Run: `graphify update . > "$TEMP/graphify.log" 2>&1; echo $?` — Expected: `0`.

---

### Task 1: Serviço e hooks de board

**Files:**
- Modify: `src/types/domain.ts` (novo tipo `Board`)
- Modify: `src/services/boards.ts` (5 funções novas, depois de `buscarWorkspaceAtual`)
- Modify: `src/hooks/useQuadro.ts` (chaves + 5 hooks)
- Test: `src/hooks/useQuadro.test.tsx`

**Interfaces:**
- Produces:
  - `interface Board { id: string; name: string; created_at: string }` em `@/types/domain`
  - `buscarBoards(): Promise<Board[]>`, `buscarBoard(id: string): Promise<{ id: string; name: string }>`,
    `criarBoard(workspaceId: string, name: string): Promise<Board>`,
    `renomearBoard(id: string, name: string): Promise<Board>`, `removerBoard(id: string): Promise<void>`
  - `useBoards()`, `useBoard(boardId: string | undefined)`,
    `useCriarBoard()` → `mutate({ workspaceId, name })`,
    `useRenomearBoard()` → `mutate({ id, name })`, `useExcluirBoard()` → `mutate(id)`

- [ ] **Step 1: Escrever os testes que falham**

Em `src/hooks/useQuadro.test.tsx`, acrescente ao objeto do `vi.mock('@/services/boards', ...)`:

```ts
  buscarBoards: vi.fn(),
  buscarBoard: vi.fn(),
  criarBoard: vi.fn(),
  renomearBoard: vi.fn(),
  removerBoard: vi.fn(),
```

Acrescente ao import de `./useQuadro`: `useBoard`, `useBoards`, `useCriarBoard`,
`useExcluirBoard`, `useRenomearBoard`. No fim do arquivo:

```ts
describe('boards — lista, um board e CRUD', () => {
  beforeEach(() => vi.resetAllMocks())

  it('useBoards devolve a lista na ordem que o serviço entregou', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue([
      { id: 'b1', name: 'Sprint Alpha', created_at: '2026-09-01T10:00:00Z' },
      { id: 'b2', name: 'Roadmap', created_at: '2026-09-10T10:00:00Z' },
    ])
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useBoards(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map((b) => b.id)).toEqual(['b1', 'b2'])
  })

  it('useBoard não busca enquanto o boardId for indefinido', () => {
    const { wrapper } = criarWrapper()
    renderHook(() => useBoard(undefined), { wrapper })
    expect(servico.buscarBoard).not.toHaveBeenCalled()
  })

  it('useCriarBoard repassa workspaceId e nome ao serviço', async () => {
    vi.mocked(servico.criarBoard).mockResolvedValue({ id: 'b3', name: 'Novo', created_at: '' })
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useCriarBoard(), { wrapper })

    result.current.mutate({ workspaceId: 'w1', name: 'Novo' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(servico.criarBoard).toHaveBeenCalledWith('w1', 'Novo')
  })

  it('useRenomearBoard repassa id e nome', async () => {
    vi.mocked(servico.renomearBoard).mockResolvedValue({ id: 'b1', name: 'Outro', created_at: '' })
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useRenomearBoard(), { wrapper })

    result.current.mutate({ id: 'b1', name: 'Outro' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(servico.renomearBoard).toHaveBeenCalledWith('b1', 'Outro')
  })

  it('useExcluirBoard repassa o id', async () => {
    vi.mocked(servico.removerBoard).mockResolvedValue(undefined)
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useExcluirBoard(), { wrapper })

    result.current.mutate('b1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(servico.removerBoard).toHaveBeenCalledWith('b1')
  })
})
```

- [ ] **Step 2: Confirmar RED**

Run: `npx vitest run src/hooks/useQuadro.test.tsx > "$TEMP/t1.log" 2>&1; echo $?`
Expected: `1` — `useBoards`/`useBoard`/... não são exportados.

- [ ] **Step 3: Tipo `Board`**

Em `src/types/domain.ts`, logo depois da interface `Profile`:

```ts
export interface Board {
  id: string
  name: string
  created_at: string
}
```

- [ ] **Step 4: Serviço**

Em `src/services/boards.ts`, troque o import de tipos por:

```ts
import type { Board, Comment, GroupComTarefas, Profile, Subtask, Task, TaskComDetalhe } from '@/types/domain'
```

e, logo depois da função `buscarWorkspaceAtual`, adicione:

```ts
/** Boards do workspace (RLS isola). Ordem de criação: o primeiro é o fallback da raiz `/`. */
export async function buscarBoards(): Promise<Board[]> {
  const { data, error } = await supabase
    .from('boards')
    .select('id, name, created_at')
    .order('created_at', { ascending: true })

  if (error) throw traduzirErro(error)
  return data ?? []
}

export async function buscarBoard(id: string): Promise<{ id: string; name: string }> {
  const { data, error } = await supabase.from('boards').select('id, name').eq('id', id).single()
  if (error) throw traduzirErro(error)
  return data
}

/**
 * Board + grupo "A fazer", espelhando handle_new_user (0001_init.up.sql): sem
 * grupo, `tasks.group_id` NOT NULL deixa o board sem onde criar tarefa. Dois
 * inserts e não RPC — uma function atômica seria migration (Zona Vermelha).
 */
export async function criarBoard(workspaceId: string, name: string): Promise<Board> {
  const { data: board, error } = await supabase
    .from('boards')
    .insert({ workspace_id: workspaceId, name })
    .select('id, name, created_at')
    .single()
  if (error) throw traduzirErro(error)

  const { error: erroGrupo } = await supabase
    .from('groups')
    .insert({ board_id: board.id, name: 'A fazer', color: 'azure', position: 0 })
  if (erroGrupo) throw traduzirErro(erroGrupo)

  return board
}

export async function renomearBoard(id: string, name: string): Promise<Board> {
  const { data, error } = await supabase
    .from('boards')
    .update({ name })
    .eq('id', id)
    .select('id, name, created_at')
    .single()

  if (error) throw traduzirErro(error)
  return data
}

/** O `on delete cascade` do schema leva grupos, tarefas, subtarefas e comentários junto. */
export async function removerBoard(id: string): Promise<void> {
  const { error } = await supabase.from('boards').delete().eq('id', id)
  if (error) throw traduzirErro(error)
}
```

- [ ] **Step 5: Hooks**

Em `src/hooks/useQuadro.ts`, acrescente ao import de `@/services/boards`: `buscarBoard`,
`buscarBoards`, `criarBoard`, `removerBoard`, `renomearBoard` (ordem alfabética, como já está).
Troque o objeto `chaves` por:

```ts
const chaves = {
  workspace: ['workspace'] as const,
  boards: ['boards'] as const,
  board: (boardId: string) => ['board', boardId] as const,
  membros: ['membros'] as const,
  grupos: (boardId: string) => ['grupos', boardId] as const,
  tarefa: (taskId: string) => ['tarefa', taskId] as const,
}
```

`useBoardAtual` usava `chaves.board` como array fixo; até a Task 3 removê-lo, troque a chave dele:

```ts
export function useBoardAtual() {
  return useQuery({ queryKey: ['board-atual'] as const, queryFn: buscarBoardAtual })
}
```

Logo depois de `useBoardAtual`, adicione:

```ts
export function useBoards() {
  return useQuery({ queryKey: chaves.boards, queryFn: buscarBoards })
}

export function useBoard(boardId: string | undefined) {
  return useQuery({
    queryKey: chaves.board(boardId ?? ''),
    queryFn: () => buscarBoard(boardId as string),
    enabled: Boolean(boardId),
  })
}

/**
 * Criar/renomear/excluir board são ações deliberadas, com botão em `loading` —
 * sem update otimista, mesmo motivo de useCriarTarefa.
 */
export function useCriarBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, name }: { workspaceId: string; name: string }) => criarBoard(workspaceId, name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaves.boards })
    },
  })
}

export function useRenomearBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renomearBoard(id, name),
    onSuccess: (_board, { id }) => {
      void qc.invalidateQueries({ queryKey: chaves.boards })
      void qc.invalidateQueries({ queryKey: chaves.board(id) })
    },
  })
}

export function useExcluirBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => removerBoard(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaves.boards })
    },
  })
}
```

- [ ] **Step 6: Confirmar GREEN**

Run: `npx vitest run src/hooks/useQuadro.test.tsx > "$TEMP/t1.log" 2>&1; echo $?` — Expected: `0`.
Run: `npx tsc -b > "$TEMP/tsc.log" 2>&1; echo $?` — Expected: `0`.

- [ ] **Step 7: Mostrar o diff ao usuário e esperar o OK**

Run: `git add src/types/domain.ts src/services/boards.ts src/hooks/useQuadro.ts src/hooks/useQuadro.test.tsx && git diff --staged`

- [ ] **Step 8: Commit (só depois do OK)**

```bash
git commit -m "feat(boards): serviço e hooks de listar, buscar, criar, renomear e excluir board"
```

---

### Task 2: `AberturaPage` — a raiz `/` redireciona pro último board

**Files:**
- Create: `src/lib/ultimoBoard.ts`
- Create: `src/pages/AberturaPage.tsx`
- Test: `src/pages/AberturaPage.test.tsx`

**Interfaces:**
- Consumes: `useBoards()` (Task 1).
- Produces: `lerUltimoBoard(): string | null`, `lembrarUltimoBoard(id: string): void`
  (Task 3 usa no `BoardShell`); `AberturaPage` (default export, Task 3 liga em `App.tsx`).

- [ ] **Step 1: Checar se já existe**

`/graphify query "já existe algo que redireciona a raiz ou guarda o último board visitado em localStorage?"`
Se a resposta apontar algo existente (confirme lendo o arquivo — aresta `INFERRED` não é prova), pare e reporte.

- [ ] **Step 2: Escrever o teste que falha**

Crie `src/pages/AberturaPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({ buscarBoards: vi.fn() }))

import * as servico from '@/services/boards'
import AberturaPage from './AberturaPage'

const BOARDS = [
  { id: 'b1', name: 'Primeiro', created_at: '2026-09-01T10:00:00Z' },
  { id: 'b2', name: 'Segundo', created_at: '2026-09-10T10:00:00Z' },
]

function renderizar() {
  const { wrapper: QueryWrapper } = criarWrapper()
  return render(
    <QueryWrapper>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<AberturaPage />} />
          <Route path="/boards/b1" element={<p>board b1</p>} />
          <Route path="/boards/b2" element={<p>board b2</p>} />
          <Route path="/paineis" element={<p>lista de painéis</p>} />
        </Routes>
      </MemoryRouter>
    </QueryWrapper>,
  )
}

describe('AberturaPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  it('vai pro último board visitado quando ele ainda existe', async () => {
    localStorage.setItem('ultimoBoardId', 'b2')
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    renderizar()
    expect(await screen.findByText('board b2')).toBeInTheDocument()
  })

  it('cai no primeiro board quando o último visitado foi apagado', async () => {
    localStorage.setItem('ultimoBoardId', 'apagado')
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    renderizar()
    expect(await screen.findByText('board b1')).toBeInTheDocument()
  })

  it('cai no primeiro board quando nunca visitou nenhum', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    renderizar()
    expect(await screen.findByText('board b1')).toBeInTheDocument()
  })

  it('sem nenhum board, manda pra lista — é ela quem oferece "Criar painel"', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue([])
    renderizar()
    expect(await screen.findByText('lista de painéis')).toBeInTheDocument()
  })

  it('erro ao buscar mostra o estado de erro com "Tentar de novo"', async () => {
    vi.mocked(servico.buscarBoards).mockRejectedValue(new Error('Sem conexão.'))
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão.')
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Confirmar RED**

Run: `npx vitest run src/pages/AberturaPage.test.tsx > "$TEMP/t2.log" 2>&1; echo $?`
Expected: `1` — `./AberturaPage` não existe.

- [ ] **Step 4: Implementar**

Crie `src/lib/ultimoBoard.ts`:

```ts
const CHAVE = 'ultimoBoardId'

// localStorage lança em modo privado / armazenamento bloqueado. Perder a
// lembrança do último board é aceitável; quebrar a navegação, não.
export function lerUltimoBoard(): string | null {
  try {
    return localStorage.getItem(CHAVE)
  } catch {
    return null
  }
}

export function lembrarUltimoBoard(id: string): void {
  try {
    localStorage.setItem(CHAVE, id)
  } catch {
    // idem acima
  }
}
```

Crie `src/pages/AberturaPage.tsx`:

```tsx
import { Navigate } from 'react-router-dom'
import { StateView } from '@/components/ui/StateView'
import { useBoards } from '@/hooks/useQuadro'
import { lerUltimoBoard } from '@/lib/ultimoBoard'

/**
 * Raiz `/`: vai direto pro trabalho — último board visitado se ainda existir,
 * senão o mais antigo (docs/superpowers/specs/2026-09-25-multiplos-boards-design.md).
 */
export default function AberturaPage() {
  const boards = useBoards()

  if (boards.isPending) return <StateView estado={{ tipo: 'carregando' }}>{null}</StateView>

  if (boards.isError) {
    return (
      <StateView
        estado={{ tipo: 'erro', mensagem: boards.error.message, aoTentarDeNovo: () => void boards.refetch() }}
      >
        {null}
      </StateView>
    )
  }

  const ultimo = lerUltimoBoard()
  const alvo = boards.data.find((b) => b.id === ultimo) ?? boards.data[0]
  // Sem nenhum board, a lista é quem oferece "Criar painel" — um lugar só.
  return <Navigate to={alvo ? `/boards/${alvo.id}` : '/paineis'} replace />
}
```

- [ ] **Step 5: Confirmar GREEN**

Run: `npx vitest run src/pages/AberturaPage.test.tsx > "$TEMP/t2.log" 2>&1; echo $?` — Expected: `0`.

- [ ] **Step 6: Mostrar o diff ao usuário e esperar o OK**

Run: `git add src/lib/ultimoBoard.ts src/pages/AberturaPage.tsx src/pages/AberturaPage.test.tsx && git diff --staged`

- [ ] **Step 7: Commit (só depois do OK)**

```bash
git commit -m "feat(pages): AberturaPage redireciona a raiz pro último board visitado"
```

---

### Task 3: As 4 views passam a ler `:boardId` da URL

Uma tarefa só porque não há estado intermediário válido: com o `BoardShell` já em
`/boards/:id` e as páginas ainda em `/`, as abas apontariam para `/boards/undefined`.

**Files:**
- Modify: `src/components/features/BoardShell.tsx`, `src/components/features/BoardShell.test.tsx`
- Modify: `src/pages/BoardPage.tsx`, `KanbanPage.tsx`, `GanttPage.tsx`, `DashboardPage.tsx`
- Modify: `src/pages/DashboardPage.test.tsx`, `src/test/a11y.test.tsx`, `src/hooks/useQuadro.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/hooks/useQuadro.ts`, `src/services/boards.ts` (remove `useBoardAtual`/`buscarBoardAtual`)
- Create: `src/pages/boardInexistente.test.tsx`

**Interfaces:**
- Consumes: `useBoard` (Task 1), `lembrarUltimoBoard` e `AberturaPage` (Task 2).
- Produces: rotas `/boards/:boardId`, `/boards/:boardId/kanban`, `/gantt`, `/dashboard`.

- [ ] **Step 1: Checar se já existe** (a task cria `boardInexistente.test.tsx`)

`/graphify query "já existe teste parametrizado que cobre as 4 páginas de view do board?"`

- [ ] **Step 2: Escrever os testes que falham**

Crie `src/pages/boardInexistente.test.tsx` (um caso por página — a regra nova é idêntica
nas 4, então um `it.each` em vez de 4 arquivos com o mesmo corpo):

```tsx
import type { ComponentType } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarBoard: vi.fn(),
  buscarGruposComTarefas: vi.fn(),
  buscarMembros: vi.fn(),
}))

import * as servico from '@/services/boards'
import BoardPage from './BoardPage'
import DashboardPage from './DashboardPage'
import GanttPage from './GanttPage'
import KanbanPage from './KanbanPage'

const PAGINAS: [string, ComponentType][] = [
  ['BoardPage', BoardPage],
  ['KanbanPage', KanbanPage],
  ['GanttPage', GanttPage],
  ['DashboardPage', DashboardPage],
]

describe('board da URL que não existe mais (apagado, ou de outro workspace)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(servico.buscarBoard).mockRejectedValue(new Error('Não encontrado.'))
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue([])
    vi.mocked(servico.buscarMembros).mockResolvedValue([])
  })

  it.each(PAGINAS)('%s redireciona para /paineis em vez de oferecer "tentar de novo"', async (_nome, Pagina) => {
    const { wrapper: QueryWrapper } = criarWrapper()
    render(
      <QueryWrapper>
        <MemoryRouter initialEntries={['/boards/nao-existe']}>
          <Routes>
            <Route path="/boards/:boardId" element={<Pagina />} />
            <Route path="/paineis" element={<p>lista de painéis</p>} />
          </Routes>
        </MemoryRouter>
      </QueryWrapper>,
    )

    expect(await screen.findByText('lista de painéis')).toBeInTheDocument()
  })
})
```

Substitua **todo** o `src/components/features/BoardShell.test.tsx` por:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { BoardShell } from './BoardShell'

function renderizar(rota = '/boards/b1') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/boards/:boardId/*" element={<BoardShell titulo="Sprint Alpha">conteudo</BoardShell>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BoardShell', () => {
  beforeEach(() => localStorage.clear())

  it('abas apontam para as views DESTE board', () => {
    renderizar()
    expect(screen.getByRole('link', { name: 'Tabela Principal' })).toHaveAttribute('href', '/boards/b1')
    expect(screen.getByRole('link', { name: 'Kanban' })).toHaveAttribute('href', '/boards/b1/kanban')
    expect(screen.getByRole('link', { name: 'Gantt' })).toHaveAttribute('href', '/boards/b1/gantt')
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/boards/b1/dashboard')
  })

  it('marca a aba da view atual', () => {
    renderizar('/boards/b1/kanban')
    expect(screen.getByRole('link', { name: 'Kanban' })).toHaveAttribute('aria-current', 'page')
  })

  it('lembra o board visitado, pra raiz / voltar nele', () => {
    renderizar()
    expect(localStorage.getItem('ultimoBoardId')).toBe('b1')
  })

  it('mostra os ícones da barra superior desabilitados, cada um com aria-label explicando o motivo', () => {
    renderizar()
    for (const nome of [
      'Favoritar — em breve',
      'Buscar neste quadro — em breve',
      'Filtrar — em breve',
      'Convidar integrantes — em breve',
      'Novo item — em breve',
    ]) {
      expect(screen.getByRole('button', { name: nome })).toBeDisabled()
    }
  })
})
```

(O teste antigo "não tem mais botão Sair" sai: verificava uma migração do plano anterior,
já concluída e sem caminho de volta.)

- [ ] **Step 3: Confirmar RED**

Run: `npx vitest run src/pages/boardInexistente.test.tsx src/components/features/BoardShell.test.tsx > "$TEMP/t3.log" 2>&1; echo $?`
Expected: `1` — páginas não leem `:boardId`; abas ainda apontam para `/`, `/kanban`...

- [ ] **Step 4: `BoardShell`**

Em `src/components/features/BoardShell.tsx`, troque os imports do topo por:

```tsx
import { useEffect, type ReactNode } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Filter, Plus, Search, Star, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tabs, type ItemTab } from '@/components/ui/Tabs'
import { lembrarUltimoBoard } from '@/lib/ultimoBoard'
```

Apague a constante de módulo `VIEWS` inteira. No começo da função, troque
`const { pathname } = useLocation()` por:

```tsx
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
```

e no `<Tabs>`, troque `items={VIEWS}` por `items={views}`.

- [ ] **Step 5: As 4 páginas**

**`src/pages/BoardPage.tsx`** — troque os imports e o início do componente até a linha
`const editar = ...` por:

```tsx
import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { StateView } from '@/components/ui/StateView'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import { Button } from '@/components/ui/Button'
import { BoardShell } from '@/components/features/BoardShell'
import { TaskGroup } from '@/components/features/TaskGroup'
import { TaskModal } from '@/components/features/TaskModal'
import { useAtualizarTarefa, useBoard, useGruposComTarefas, useMembros } from '@/hooks/useQuadro'
import type { Task } from '@/types/domain'

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const board = useBoard(boardId)
  const grupos = useGruposComTarefas(boardId)
  const membros = useMembros()
  const editar = useAtualizarTarefa(boardId)
```

e, logo antes de `// Os QUATRO estados, num lugar so.`, insira:

```tsx
  // Board apagado ou de outro workspace: "tentar de novo" não o traz de volta.
  if (board.isError) return <Navigate to="/paineis" replace />

```

**`src/pages/KanbanPage.tsx`** — troque os imports e o início do componente até a linha
`const [taskIdModal, ...]` por:

```tsx
import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { BoardShell } from '@/components/features/BoardShell'
import { KanbanBoard } from '@/components/features/KanbanBoard'
import { TaskModal } from '@/components/features/TaskModal'
import { Button } from '@/components/ui/Button'
import { StateView } from '@/components/ui/StateView'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import { useAtualizarTarefa, useBoard, useGruposComTarefas, useMembros } from '@/hooks/useQuadro'

export default function KanbanPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const board = useBoard(boardId)
  const grupos = useGruposComTarefas(boardId)
  const membros = useMembros()
  const editar = useAtualizarTarefa(boardId)
  const [taskIdModal, setTaskIdModal] = useState<string | null>(null)

  // Board apagado ou de outro workspace: "tentar de novo" não o traz de volta.
  if (board.isError) return <Navigate to="/paineis" replace />
```

**`src/pages/GanttPage.tsx`** — troque os imports e o início do componente até a linha
`const grupos = ...` por:

```tsx
import { Navigate, useParams } from 'react-router-dom'
import { BoardShell } from '@/components/features/BoardShell'
import { GanttChart } from '@/components/features/GanttChart'
import { Button } from '@/components/ui/Button'
import { StateView } from '@/components/ui/StateView'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import { useBoard, useGruposComTarefas } from '@/hooks/useQuadro'

export default function GanttPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const board = useBoard(boardId)
  const grupos = useGruposComTarefas(boardId)

  // Board apagado ou de outro workspace: "tentar de novo" não o traz de volta.
  if (board.isError) return <Navigate to="/paineis" replace />
```

**`src/pages/DashboardPage.tsx`** — troque os imports e o início do componente até a linha
`const tarefas = ...` por:

```tsx
import { Navigate, useParams } from 'react-router-dom'
import { BoardShell } from '@/components/features/BoardShell'
import { GroupProgressList } from '@/components/features/GroupProgressList'
import { MetricTile } from '@/components/features/MetricTile'
import { StatusDonut } from '@/components/features/StatusDonut'
import { Button } from '@/components/ui/Button'
import { StateView } from '@/components/ui/StateView'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import { contarAtrasadas, distribuicaoStatus, taxaDeConclusao } from '@/lib/metrics'
import { useBoard, useGruposComTarefas } from '@/hooks/useQuadro'

export default function DashboardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const board = useBoard(boardId)
  const grupos = useGruposComTarefas(boardId)

  // Board apagado ou de outro workspace: "tentar de novo" não o traz de volta.
  if (board.isError) return <Navigate to="/paineis" replace />

  const tarefas = grupos.data?.flatMap((g) => g.tasks)
```

(o resto de cada arquivo fica igual — `board.data?.name`, `board.isPending` e
`board.data.id` continuam valendo com `useBoard`.)

- [ ] **Step 6: Rotas**

Em `src/App.tsx`, adicione `import AberturaPage from '@/pages/AberturaPage'` junto aos outros
imports de página, e troque as 4 rotas do board por:

```tsx
                  <Route path="/" element={<AberturaPage />} />
                  <Route path="/boards/:boardId" element={<BoardPage />} />
                  <Route path="/boards/:boardId/kanban" element={<KanbanPage />} />
                  <Route
                    path="/boards/:boardId/gantt"
                    element={
                      <Suspense fallback={carregandoRota}>
                        <GanttPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/boards/:boardId/dashboard"
                    element={
                      <Suspense fallback={carregandoRota}>
                        <DashboardPage />
                      </Suspense>
                    }
                  />
```

- [ ] **Step 7: Remover o que ficou morto**

Em `src/hooks/useQuadro.ts`: apague `useBoardAtual` inteiro e tire `buscarBoardAtual` do import.
Em `src/services/boards.ts`: apague `buscarBoardAtual` inteira, com o comentário dela. No
comentário de `buscarWorkspaceAtual`, troque o texto por:

```ts
/**
 * Workspace do usuario. Na v1 ha um workspace por usuario — usado pela Sidebar
 * pra mostrar o nome e pelo BoardFormModal pra criar board nele.
 */
```

- [ ] **Step 8: Atualizar os testes que usavam o board fixo**

`src/hooks/useQuadro.test.tsx`: remova a linha `buscarBoardAtual: vi.fn(),` do mock.

`src/pages/DashboardPage.test.tsx`: no mock, troque `buscarBoardAtual: vi.fn(),` por
`buscarBoard: vi.fn(),`; troque `import { MemoryRouter } from 'react-router-dom'` por
`import { MemoryRouter, Route, Routes } from 'react-router-dom'`; troque a função `renderizar` por:

```tsx
function renderizar() {
  const { wrapper: QueryWrapper } = criarWrapper()
  return render(
    <MemoryRouter initialEntries={['/boards/b1/dashboard']}>
      <QueryWrapper>
        <Routes>
          <Route path="/boards/:boardId/dashboard" element={<DashboardPage />} />
        </Routes>
      </QueryWrapper>
    </MemoryRouter>,
  )
}
```

e, nos dois testes, troque `vi.mocked(servico.buscarBoardAtual)` por `vi.mocked(servico.buscarBoard)`.

`src/test/a11y.test.tsx`: no mock, troque `buscarBoardAtual: vi.fn(),` por `buscarBoard: vi.fn(),`;
troque o import do router por `import { MemoryRouter, Route, Routes } from 'react-router-dom'`;
no `beforeEach`, troque `vi.mocked(servico.buscarBoardAtual)` por `vi.mocked(servico.buscarBoard)`;
e troque `renderComProviders` por:

```tsx
function renderComProviders(ui: React.ReactElement) {
  const { wrapper: QueryWrapper } = criarWrapper()
  return render(
    <MemoryRouter initialEntries={['/boards/b1']}>
      <QueryWrapper>
        <Routes>
          <Route path="/boards/:boardId" element={ui} />
        </Routes>
      </QueryWrapper>
    </MemoryRouter>,
  )
}
```

- [ ] **Step 9: Confirmar GREEN na suíte inteira**

Run: `npx vitest run > "$TEMP/t3.log" 2>&1; echo $?` — Expected: `0`.
Run: `npx tsc -b > "$TEMP/tsc.log" 2>&1; echo $?` — Expected: `0`.
Grep (ferramenta Grep) por `buscarBoardAtual|useBoardAtual` em `src/` — Expected: nenhuma ocorrência.

- [ ] **Step 10: Mostrar o diff ao usuário e esperar o OK**

Run: `git add -A src && git status --short && git diff --staged`
(confira no `status` que só entraram os arquivos listados em **Files** desta task)

- [ ] **Step 11: Commit (só depois do OK)**

```bash
git commit -m "feat(rotas): views do board passam a viver em /boards/:boardId

Raiz / redireciona via AberturaPage; board inexistente na URL volta pra
/paineis. Remove buscarBoardAtual/useBoardAtual, que assumiam board único."
```

---

### Task 4: `BoardFormModal` — criar e renomear

**Files:**
- Create: `src/components/features/BoardFormModal.tsx`
- Test: `src/components/features/BoardFormModal.test.tsx`

**Interfaces:**
- Consumes: `useWorkspaceAtual`, `useCriarBoard`, `useRenomearBoard` (Task 1); `Modal`, `Field`, `TextInput`, `Button`.
- Produces: `BoardFormModal({ aberto, aoFechar, board }: { aberto: boolean; aoFechar: () => void; board: { id: string; name: string } | null })`
  — `board: null` = criar (navega pro board novo ao salvar); presente = renomear.
  Títulos do diálogo: `'Novo painel'` / `'Renomear painel'`. Usado nas Tasks 7 e 8.

- [ ] **Step 1: Checar se já existe**

`/graphify query "já existe formulário ou modal para criar ou renomear board?"`

- [ ] **Step 2: Escrever os testes que falham**

Crie `src/components/features/BoardFormModal.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarWorkspaceAtual: vi.fn(),
  criarBoard: vi.fn(),
  renomearBoard: vi.fn(),
}))

import * as servico from '@/services/boards'
import { BoardFormModal } from './BoardFormModal'

function renderizar(board: { id: string; name: string } | null, aoFechar = vi.fn()) {
  const { wrapper: QueryWrapper } = criarWrapper()
  render(
    <QueryWrapper>
      <MemoryRouter initialEntries={['/paineis']}>
        <Routes>
          <Route path="/paineis" element={<BoardFormModal aberto aoFechar={aoFechar} board={board} />} />
          <Route path="/boards/:boardId" element={<p>board aberto</p>} />
        </Routes>
      </MemoryRouter>
    </QueryWrapper>,
  )
  return aoFechar
}

describe('BoardFormModal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(servico.buscarWorkspaceAtual).mockResolvedValue({ id: 'w1', name: 'Meu Workspace' })
  })

  it('cria o board no workspace atual e abre o board novo', async () => {
    vi.mocked(servico.criarBoard).mockResolvedValue({ id: 'b9', name: 'Roadmap Q4', created_at: '' })
    const user = userEvent.setup()
    renderizar(null)

    await screen.findByRole('dialog', { name: 'Novo painel' })
    await user.type(screen.getByLabelText('Nome do painel'), 'Roadmap Q4')
    await user.click(await screen.findByRole('button', { name: 'Criar painel' }))

    expect(servico.criarBoard).toHaveBeenCalledWith('w1', 'Roadmap Q4')
    expect(await screen.findByText('board aberto')).toBeInTheDocument()
  })

  it('nome vazio (só espaços) bloqueia e explica, sem chamar o serviço', async () => {
    const user = userEvent.setup()
    renderizar(null)

    await screen.findByRole('dialog', { name: 'Novo painel' })
    await user.type(screen.getByLabelText('Nome do painel'), '   ')
    await user.click(await screen.findByRole('button', { name: 'Criar painel' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('O nome não pode ficar vazio.')
    expect(servico.criarBoard).not.toHaveBeenCalled()
  })

  it('renomear vem com o nome atual preenchido e salva o novo', async () => {
    vi.mocked(servico.renomearBoard).mockResolvedValue({ id: 'b1', name: 'Sprint Beta', created_at: '' })
    const user = userEvent.setup()
    const aoFechar = renderizar({ id: 'b1', name: 'Sprint Alpha' })

    await screen.findByRole('dialog', { name: 'Renomear painel' })
    const campo = screen.getByLabelText('Nome do painel')
    expect(campo).toHaveValue('Sprint Alpha')

    await user.clear(campo)
    await user.type(campo, 'Sprint Beta')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(servico.renomearBoard).toHaveBeenCalledWith('b1', 'Sprint Beta')
    await vi.waitFor(() => expect(aoFechar).toHaveBeenCalled())
  })

  it('erro do servidor aparece no formulário, sem fechar', async () => {
    vi.mocked(servico.criarBoard).mockRejectedValue(new Error('Não foi possível salvar.'))
    const user = userEvent.setup()
    const aoFechar = renderizar(null)

    await screen.findByRole('dialog', { name: 'Novo painel' })
    await user.type(screen.getByLabelText('Nome do painel'), 'Roadmap')
    await user.click(await screen.findByRole('button', { name: 'Criar painel' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar.')
    expect(aoFechar).not.toHaveBeenCalled()
  })
})
```

(`findByRole` no botão "Criar painel": ele fica desabilitado até `useWorkspaceAtual` resolver.
Se o clique cair antes, confira que o botão está habilitado com
`await vi.waitFor(() => expect(botao).toBeEnabled())` antes de clicar.)

- [ ] **Step 3: Confirmar RED**

Run: `npx vitest run src/components/features/BoardFormModal.test.tsx > "$TEMP/t4.log" 2>&1; echo $?` — Expected: `1`.

- [ ] **Step 4: Implementar**

Crie `src/components/features/BoardFormModal.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { TextInput } from '@/components/ui/TextInput'
import { useCriarBoard, useRenomearBoard, useWorkspaceAtual } from '@/hooks/useQuadro'

interface BoardEditavel {
  id: string
  name: string
}

interface Props {
  aberto: boolean
  aoFechar: () => void
  /** null = criar. Presente = renomear. Mesma dualidade do TaskModal. */
  board: BoardEditavel | null
}

export function BoardFormModal({ aberto, aoFechar, board }: Props) {
  return (
    <Modal open={aberto} onClose={aoFechar} title={board ? 'Renomear painel' : 'Novo painel'}>
      {/* key: reabrir para outro board (ou para criar) começa com o campo certo, não com o texto anterior. */}
      {aberto && <FormularioBoard key={board?.id ?? 'novo'} board={board} aoConcluir={aoFechar} />}
    </Modal>
  )
}

function FormularioBoard({ board, aoConcluir }: { board: BoardEditavel | null; aoConcluir: () => void }) {
  const [nome, setNome] = useState(board?.name ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const workspace = useWorkspaceAtual()
  const criar = useCriarBoard()
  const renomear = useRenomearBoard()
  const navigate = useNavigate()
  const mutacao = board ? renomear : criar

  function aoSubmeter(e: FormEvent) {
    e.preventDefault()
    const limpo = nome.trim()
    if (!limpo) {
      setErro('O nome não pode ficar vazio.')
      return
    }
    setErro(null)

    if (board) {
      renomear.mutate({ id: board.id, name: limpo }, { onSuccess: aoConcluir })
      return
    }
    if (!workspace.data) return
    criar.mutate(
      { workspaceId: workspace.data.id, name: limpo },
      {
        onSuccess: (novo) => {
          aoConcluir()
          navigate(`/boards/${novo.id}`)
        },
      },
    )
  }

  return (
    <form onSubmit={aoSubmeter} className="flex flex-col gap-space-md">
      <Field label="Nome do painel" error={erro ?? undefined}>
        {/* maxLength nativo cobre o limite de 120 do banco — sem validação à mão. */}
        <TextInput value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} />
      </Field>

      {mutacao.isError && (
        <p role="alert" className="rounded bg-danger-soft px-space-md py-space-sm text-body text-danger-ink">
          {mutacao.error.message}
        </p>
      )}

      <div className="flex justify-end gap-space-sm">
        <Button variant="secondary" onClick={aoConcluir}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={mutacao.isPending} disabled={!board && !workspace.data}>
          {board ? 'Salvar' : 'Criar painel'}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 5: Confirmar GREEN**

Run: `npx vitest run src/components/features/BoardFormModal.test.tsx > "$TEMP/t4.log" 2>&1; echo $?` — Expected: `0`.

- [ ] **Step 6: Mostrar o diff ao usuário e esperar o OK**

Run: `git add src/components/features/BoardFormModal.tsx src/components/features/BoardFormModal.test.tsx && git diff --staged`

- [ ] **Step 7: Commit (só depois do OK)**

```bash
git commit -m "feat(features): BoardFormModal cria e renomeia board"
```

---

### Task 5: `ExcluirBoardDialog` — exclusão com confirmação por digitação

**Files:**
- Create: `src/components/features/ExcluirBoardDialog.tsx`
- Test: `src/components/features/ExcluirBoardDialog.test.tsx`

**Interfaces:**
- Consumes: `useExcluirBoard` (Task 1); `Modal`, `Field`, `TextInput`, `Button`.
- Produces: `ExcluirBoardDialog({ board, aoFechar, ehOUltimo }: { board: { id: string; name: string } | null; aoFechar: () => void; ehOUltimo: boolean })`
  — aberto quando `board !== null`. Título: `'Excluir painel'`. Usado na Task 7.

- [ ] **Step 1: Checar se já existe**

`/graphify query "já existe diálogo de confirmação de exclusão?"`

- [ ] **Step 2: Escrever os testes que falham**

Crie `src/components/features/ExcluirBoardDialog.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({ removerBoard: vi.fn() }))

import * as servico from '@/services/boards'
import { ExcluirBoardDialog } from './ExcluirBoardDialog'

const BOARD = { id: 'b1', name: 'Sprint Alpha' }
const ROTULO = 'Digite "Sprint Alpha" para confirmar'

function renderizar(board: typeof BOARD | null, ehOUltimo = false) {
  const aoFechar = vi.fn()
  const { wrapper: QueryWrapper } = criarWrapper()
  render(
    <QueryWrapper>
      <ExcluirBoardDialog board={board} aoFechar={aoFechar} ehOUltimo={ehOUltimo} />
    </QueryWrapper>,
  )
  return aoFechar
}

describe('ExcluirBoardDialog', () => {
  beforeEach(() => vi.resetAllMocks())

  it('"Excluir painel" fica desabilitado até digitar o nome exato do board', async () => {
    const user = userEvent.setup()
    renderizar(BOARD)

    const botao = screen.getByRole('button', { name: 'Excluir painel' })
    expect(botao).toBeDisabled()

    await user.type(screen.getByLabelText(ROTULO), 'Sprint Alph')
    expect(botao).toBeDisabled()

    await user.type(screen.getByLabelText(ROTULO), 'a')
    expect(botao).toBeEnabled()
  })

  it('confirmar exclui e fecha', async () => {
    vi.mocked(servico.removerBoard).mockResolvedValue(undefined)
    const user = userEvent.setup()
    const aoFechar = renderizar(BOARD)

    await user.type(screen.getByLabelText(ROTULO), 'Sprint Alpha')
    await user.click(screen.getByRole('button', { name: 'Excluir painel' }))

    expect(servico.removerBoard).toHaveBeenCalledWith('b1')
    await vi.waitFor(() => expect(aoFechar).toHaveBeenCalled())
  })

  it('último board do workspace: não oferece excluir e explica por quê', () => {
    renderizar(BOARD, true)

    expect(screen.queryByRole('button', { name: 'Excluir painel' })).not.toBeInTheDocument()
    expect(screen.getByText(/único painel do workspace/)).toBeInTheDocument()
  })

  it('sem board selecionado, o diálogo fica fechado', () => {
    renderizar(null)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Confirmar RED**

Run: `npx vitest run src/components/features/ExcluirBoardDialog.test.tsx > "$TEMP/t5.log" 2>&1; echo $?` — Expected: `1`.

- [ ] **Step 4: Implementar**

Crie `src/components/features/ExcluirBoardDialog.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { TextInput } from '@/components/ui/TextInput'
import { useExcluirBoard } from '@/hooks/useQuadro'

interface BoardAlvo {
  id: string
  name: string
}

interface Props {
  /** null = fechado. */
  board: BoardAlvo | null
  aoFechar: () => void
  /** A raiz `/` precisa de ao menos um board pra onde ir. */
  ehOUltimo: boolean
}

/**
 * Exclusão definitiva: o cascade do banco leva grupos, tarefas, subtarefas e
 * comentários junto (docs/superpowers/specs/2026-09-25-multiplos-boards-design.md).
 * Digitar o nome é o freio pra uma ação que não tem desfazer.
 */
export function ExcluirBoardDialog({ board, aoFechar, ehOUltimo }: Props) {
  return (
    <Modal open={board !== null} onClose={aoFechar} title="Excluir painel">
      {board &&
        (ehOUltimo ? (
          <UnicoBoard aoFechar={aoFechar} />
        ) : (
          <ConfirmarExclusao key={board.id} board={board} aoConcluir={aoFechar} />
        ))}
    </Modal>
  )
}

function UnicoBoard({ aoFechar }: { aoFechar: () => void }) {
  return (
    <div className="flex flex-col gap-space-md">
      <p className="text-body text-ink">Este é o único painel do workspace. Crie outro antes de excluir este.</p>
      <div className="flex justify-end">
        <Button variant="secondary" onClick={aoFechar}>
          Fechar
        </Button>
      </div>
    </div>
  )
}

function ConfirmarExclusao({ board, aoConcluir }: { board: BoardAlvo; aoConcluir: () => void }) {
  const [digitado, setDigitado] = useState('')
  const excluir = useExcluirBoard()

  function aoSubmeter(e: FormEvent) {
    e.preventDefault()
    excluir.mutate(board.id, { onSuccess: aoConcluir })
  }

  return (
    <form onSubmit={aoSubmeter} className="flex flex-col gap-space-md">
      <p className="text-body text-ink">
        Todas as tarefas, subtarefas e comentários de <strong>{board.name}</strong> serão apagados. Não dá
        para desfazer.
      </p>

      <Field label={`Digite "${board.name}" para confirmar`}>
        <TextInput value={digitado} onChange={(e) => setDigitado(e.target.value)} autoComplete="off" />
      </Field>

      {excluir.isError && (
        <p role="alert" className="rounded bg-danger-soft px-space-md py-space-sm text-body text-danger-ink">
          {excluir.error.message}
        </p>
      )}

      <div className="flex justify-end gap-space-sm">
        <Button variant="secondary" onClick={aoConcluir}>
          Cancelar
        </Button>
        <Button type="submit" variant="danger" loading={excluir.isPending} disabled={digitado !== board.name}>
          Excluir painel
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 5: Confirmar GREEN**

Run: `npx vitest run src/components/features/ExcluirBoardDialog.test.tsx > "$TEMP/t5.log" 2>&1; echo $?` — Expected: `0`.

- [ ] **Step 6: Contraste do botão `danger`** — primeira vez que `variant="danger"` aparece em
tela real. Run: `npm run contrast > "$TEMP/contrast.log" 2>&1; echo $?` — Expected: `0`, e o log
contém a linha `danger + danger-fg` (o script descobre os pares `-fg` sozinho,
`scripts/check-contrast.mjs:52-56`). Não citar o "6.46:1" do comentário do `tokens.css` — citar o
número medido no log.

- [ ] **Step 7: Mostrar o diff ao usuário e esperar o OK**

Run: `git add src/components/features/ExcluirBoardDialog.tsx src/components/features/ExcluirBoardDialog.test.tsx && git diff --staged`

- [ ] **Step 8: Commit (só depois do OK)**

```bash
git commit -m "feat(features): ExcluirBoardDialog com confirmação por digitação do nome"
```

---

### Task 6: `BoardCard`

**Files:**
- Create: `src/components/features/BoardCard.tsx`
- Test: `src/components/features/BoardCard.test.tsx`

**Interfaces:**
- Consumes: `Board` (Task 1); `Menu`; `tempoRelativo` de `@/lib/date` (já existe).
- Produces: `BoardCard({ board, aoRenomear, aoExcluir }: { board: Board; aoRenomear: (b: Board) => void; aoExcluir: (b: Board) => void })`. Usado na Task 7.

- [ ] **Step 1: Checar se já existe**

`/graphify query "já existe card clicável com menu de ações que eu possa reusar para um board?"`
(`TaskCard` é o parente mais próximo, mas é arrastável e conhece `Task` — não serve de base;
só o padrão do gatilho do `Menu` é copiado dele.)

- [ ] **Step 2: Escrever os testes que falham**

Crie `src/components/features/BoardCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { BoardCard } from './BoardCard'

const BOARD = { id: 'b1', name: 'Sprint Alpha', created_at: '2026-09-01T10:00:00Z' }

function renderizar() {
  const aoRenomear = vi.fn()
  const aoExcluir = vi.fn()
  render(
    <MemoryRouter>
      <BoardCard board={BOARD} aoRenomear={aoRenomear} aoExcluir={aoExcluir} />
    </MemoryRouter>,
  )
  return { aoRenomear, aoExcluir }
}

describe('BoardCard', () => {
  it('o card é um link para o board', () => {
    renderizar()
    expect(screen.getByRole('link', { name: /Sprint Alpha/ })).toHaveAttribute('href', '/boards/b1')
  })

  it('"Renomear" no menu entrega o board', async () => {
    const user = userEvent.setup()
    const { aoRenomear } = renderizar()

    await user.click(screen.getByRole('button', { name: 'Ações de Sprint Alpha' }))
    await user.click(screen.getByRole('menuitem', { name: 'Renomear' }))

    expect(aoRenomear).toHaveBeenCalledWith(BOARD)
  })

  it('"Excluir" no menu entrega o board', async () => {
    const user = userEvent.setup()
    const { aoExcluir } = renderizar()

    await user.click(screen.getByRole('button', { name: 'Ações de Sprint Alpha' }))
    await user.click(screen.getByRole('menuitem', { name: 'Excluir' }))

    expect(aoExcluir).toHaveBeenCalledWith(BOARD)
  })
})
```

- [ ] **Step 3: Confirmar RED**

Run: `npx vitest run src/components/features/BoardCard.test.tsx > "$TEMP/t6.log" 2>&1; echo $?` — Expected: `1`.

- [ ] **Step 4: Implementar**

Crie `src/components/features/BoardCard.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { EllipsisVertical } from 'lucide-react'
import { Menu } from '@/components/ui/Menu'
import { tempoRelativo } from '@/lib/date'
import type { Board } from '@/types/domain'

interface Props {
  board: Board
  aoRenomear: (board: Board) => void
  aoExcluir: (board: Board) => void
}

/**
 * Um board na lista "Meus Painéis". O Menu fica FORA do Link: botão dentro
 * de link é HTML inválido e o clique no menu navegaria junto.
 */
export function BoardCard({ board, aoRenomear, aoExcluir }: Props) {
  return (
    <div className="flex items-start gap-space-sm rounded-md border border-border bg-surface p-space-md hover:bg-surface-2">
      <Link
        to={`/boards/${board.id}`}
        className="flex min-h-touch min-w-0 flex-1 flex-col justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="truncate text-title text-ink">{board.name}</span>
        <span className="text-label text-ink-muted">Criado {tempoRelativo(board.created_at)}</span>
      </Link>

      <Menu
        rotulo={`Ações de ${board.name}`}
        align="end"
        items={[
          { id: 'renomear', rotulo: 'Renomear', aoEscolher: () => aoRenomear(board) },
          { id: 'excluir', rotulo: 'Excluir', aoEscolher: () => aoExcluir(board) },
        ]}
        trigger={(p) => (
          <button
            {...p}
            type="button"
            className="grid min-h-touch min-w-touch place-items-center rounded hover:bg-surface-3 md:min-h-8 md:min-w-8"
          >
            <span className="sr-only">Ações de {board.name}</span>
            <EllipsisVertical aria-hidden="true" className="size-4" />
          </button>
        )}
      />
    </div>
  )
}
```

(`surface-3` existe em `tokens.css:60`.)

- [ ] **Step 5: Confirmar GREEN**

Run: `npx vitest run src/components/features/BoardCard.test.tsx > "$TEMP/t6.log" 2>&1; echo $?` — Expected: `0`.

- [ ] **Step 6: Mostrar o diff ao usuário e esperar o OK**

Run: `git add src/components/features/BoardCard.tsx src/components/features/BoardCard.test.tsx && git diff --staged`

- [ ] **Step 7: Commit (só depois do OK)**

```bash
git commit -m "feat(features): BoardCard com link pro board e menu renomear/excluir"
```

---

### Task 7: `PaineisPage` — a lista "Meus Painéis"

**Files:**
- Create: `src/pages/PaineisPage.tsx`
- Test: `src/pages/PaineisPage.test.tsx`
- Modify: `src/App.tsx` (rota `/paineis`)
- Modify: `src/test/a11y.test.tsx` (caso novo)

**Interfaces:**
- Consumes: `useBoards` (Task 1), `BoardFormModal` (Task 4), `ExcluirBoardDialog` (Task 5), `BoardCard` (Task 6).
- Produces: `PaineisPage` (default export).

- [ ] **Step 1: Checar se já existe**

`/graphify query "já existe página que lista boards ou grid de cards?"`

- [ ] **Step 2: Escrever os testes que falham**

Crie `src/pages/PaineisPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarBoards: vi.fn(),
  buscarWorkspaceAtual: vi.fn(),
  criarBoard: vi.fn(),
  renomearBoard: vi.fn(),
  removerBoard: vi.fn(),
}))

import * as servico from '@/services/boards'
import PaineisPage from './PaineisPage'

const BOARDS = [
  { id: 'b1', name: 'Sprint Alpha', created_at: '2026-09-01T10:00:00Z' },
  { id: 'b2', name: 'Roadmap', created_at: '2026-09-10T10:00:00Z' },
]

function renderizar() {
  const { wrapper: QueryWrapper } = criarWrapper()
  return render(
    <QueryWrapper>
      <MemoryRouter>
        <PaineisPage />
      </MemoryRouter>
    </QueryWrapper>,
  )
}

describe('PaineisPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(servico.buscarWorkspaceAtual).mockResolvedValue({ id: 'w1', name: 'Meu Workspace' })
  })

  it('carregando', () => {
    vi.mocked(servico.buscarBoards).mockImplementation(() => new Promise(() => {}))
    renderizar()
    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
  })

  it('erro', async () => {
    vi.mocked(servico.buscarBoards).mockRejectedValue(new Error('Sem conexão.'))
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão.')
  })

  it('vazio oferece criar o primeiro painel', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue([])
    renderizar()
    expect(await screen.findByText('Nenhum painel ainda')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar painel' })).toBeInTheDocument()
  })

  it('lista um link por board', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    renderizar()
    expect(await screen.findByRole('link', { name: /Sprint Alpha/ })).toHaveAttribute('href', '/boards/b1')
    expect(screen.getByRole('link', { name: /Roadmap/ })).toHaveAttribute('href', '/boards/b2')
  })

  it('"Novo Painel" abre o formulário de criação', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    const user = userEvent.setup()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Novo Painel' }))
    expect(await screen.findByRole('dialog', { name: 'Novo painel' })).toBeInTheDocument()
  })

  it('"Renomear" no card abre o formulário com o nome do board', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    const user = userEvent.setup()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Ações de Roadmap' }))
    await user.click(screen.getByRole('menuitem', { name: 'Renomear' }))

    await screen.findByRole('dialog', { name: 'Renomear painel' })
    expect(screen.getByLabelText('Nome do painel')).toHaveValue('Roadmap')
  })

  it('"Excluir" no card abre a confirmação daquele board', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    const user = userEvent.setup()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Ações de Roadmap' }))
    await user.click(screen.getByRole('menuitem', { name: 'Excluir' }))

    await screen.findByRole('dialog', { name: 'Excluir painel' })
    expect(screen.getByLabelText('Digite "Roadmap" para confirmar')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Confirmar RED**

Run: `npx vitest run src/pages/PaineisPage.test.tsx > "$TEMP/t7.log" 2>&1; echo $?` — Expected: `1`.

- [ ] **Step 4: Implementar**

Crie `src/pages/PaineisPage.tsx`:

```tsx
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { BoardCard } from '@/components/features/BoardCard'
import { BoardFormModal } from '@/components/features/BoardFormModal'
import { ExcluirBoardDialog } from '@/components/features/ExcluirBoardDialog'
import { Button } from '@/components/ui/Button'
import { StateView } from '@/components/ui/StateView'
import { useBoards } from '@/hooks/useQuadro'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import type { Board } from '@/types/domain'

export default function PaineisPage() {
  const boards = useBoards()
  const [formAberto, setFormAberto] = useState(false)
  // null com o form aberto = criando. Mesma ideia de taskIdModal em BoardPage.
  const [boardEmEdicao, setBoardEmEdicao] = useState<Board | null>(null)
  const [boardParaExcluir, setBoardParaExcluir] = useState<Board | null>(null)

  function abrirCriacao() {
    setBoardEmEdicao(null)
    setFormAberto(true)
  }

  function abrirRenomear(board: Board) {
    setBoardEmEdicao(board)
    setFormAberto(true)
  }

  const estado = estadoDaQuery(
    boards,
    {
      titulo: 'Nenhum painel ainda',
      descricao: 'Crie um painel para organizar o trabalho da squad.',
      acao: (
        <Button variant="primary" onClick={abrirCriacao}>
          Criar painel
        </Button>
      ),
    },
    () => void boards.refetch(),
  )

  return (
    <div className="mx-auto max-w-canvas p-gutter md:p-margin">
      <div className="mb-gutter flex items-center justify-between gap-space-md">
        <h1 className="text-display">Meus Painéis</h1>
        <Button
          variant="primary"
          size="sm"
          iconStart={<Plus aria-hidden="true" className="size-4" />}
          onClick={abrirCriacao}
        >
          Novo Painel
        </Button>
      </div>

      <StateView estado={estado}>
        <ul className="grid grid-cols-1 gap-space-md md:grid-cols-2 lg:grid-cols-3">
          {boards.data?.map((b) => (
            <li key={b.id}>
              <BoardCard board={b} aoRenomear={abrirRenomear} aoExcluir={setBoardParaExcluir} />
            </li>
          ))}
        </ul>
      </StateView>

      <BoardFormModal aberto={formAberto} aoFechar={() => setFormAberto(false)} board={boardEmEdicao} />
      <ExcluirBoardDialog
        board={boardParaExcluir}
        aoFechar={() => setBoardParaExcluir(null)}
        ehOUltimo={(boards.data?.length ?? 0) <= 1}
      />
    </div>
  )
}
```

- [ ] **Step 5: Rota**

Em `src/App.tsx`, adicione `import PaineisPage from '@/pages/PaineisPage'` e troque o bloco
`<Route path="/paineis" element={<EmConstrucaoPage titulo="Meus Painéis" ... />} />` inteiro por:

```tsx
                  <Route path="/paineis" element={<PaineisPage />} />
```

- [ ] **Step 6: a11y da tela nova**

Em `src/test/a11y.test.tsx`, acrescente ao mock de `@/services/boards`: `buscarBoards: vi.fn(),`
e `buscarWorkspaceAtual: vi.fn(),`; importe `import PaineisPage from '@/pages/PaineisPage'`; e,
dentro do `describe`, acrescente:

```tsx
  it('PaineisPage (Meus Painéis) não tem violação WCAG', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue([
      { id: 'b1', name: 'Sprint Alpha Q3', created_at: '2026-09-01T10:00:00Z' },
      { id: 'b2', name: 'Roadmap', created_at: '2026-09-10T10:00:00Z' },
    ])
    vi.mocked(servico.buscarWorkspaceAtual).mockResolvedValue({ id: 'w1', name: 'Meu Workspace' })
    const { wrapper: QueryWrapper } = criarWrapper()
    const { container, findByText } = render(
      <MemoryRouter>
        <QueryWrapper>
          <PaineisPage />
        </QueryWrapper>
      </MemoryRouter>,
    )
    await findByText('Roadmap')
    expect(await axe(container)).toHaveNoViolations()
  })
```

- [ ] **Step 7: Confirmar GREEN**

Run: `npx vitest run src/pages/PaineisPage.test.tsx src/test/a11y.test.tsx > "$TEMP/t7.log" 2>&1; echo $?` — Expected: `0`.

- [ ] **Step 8: Mostrar o diff ao usuário e esperar o OK**

Run: `git add src/pages/PaineisPage.tsx src/pages/PaineisPage.test.tsx src/App.tsx src/test/a11y.test.tsx && git diff --staged`

- [ ] **Step 9: Commit (só depois do OK)**

```bash
git commit -m "feat(pages): PaineisPage substitui o 'em construção' de Meus Painéis"
```

---

### Task 8: Sidebar — "Novo Painel" funcional

**Files:**
- Modify: `src/components/features/Sidebar.tsx`
- Test: `src/components/features/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `BoardFormModal` (Task 4).

- [ ] **Step 1: Escrever o teste que falha**

Em `src/components/features/Sidebar.test.tsx`, acrescente ao mock de `@/services/boards`:
`criarBoard: vi.fn(),` e `renomearBoard: vi.fn(),`. No fim do `describe`:

```tsx
  it('"Novo Painel" abre o formulário de criação e cria no workspace atual', async () => {
    vi.mocked(servico.criarBoard).mockResolvedValue({ id: 'b9', name: 'Roadmap', created_at: '' })
    const user = userEvent.setup()
    renderizar()

    const botao = await screen.findByRole('button', { name: 'Novo Painel' })
    expect(botao).toBeEnabled()
    await user.click(botao)

    await screen.findByRole('dialog', { name: 'Novo painel' })
    await user.type(screen.getByLabelText('Nome do painel'), 'Roadmap')
    await user.click(await screen.findByRole('button', { name: 'Criar painel' }))

    expect(servico.criarBoard).toHaveBeenCalledWith('w1', 'Roadmap')
  })
```

- [ ] **Step 2: Confirmar RED**

Run: `npx vitest run src/components/features/Sidebar.test.tsx > "$TEMP/t8.log" 2>&1; echo $?`
Expected: `1` — o botão tem nome "Criar novo painel — em breve" e está desabilitado.

- [ ] **Step 3: Implementar**

Em `src/components/features/Sidebar.tsx`:

Acrescente o import `import { BoardFormModal } from './BoardFormModal'`.

Logo depois de `const [aberto, setAberto] = useState(false)`:

```tsx
  const [criandoBoard, setCriandoBoard] = useState(false)
```

Troque o `<Button ... disabled aria-label="Criar novo painel — em breve">...</Button>` inteiro por:

```tsx
          <Button
            variant="primary"
            size="sm"
            className="w-full justify-start"
            iconStart={<Plus aria-hidden="true" className="size-4" />}
            onClick={() => {
              // Fecha o drawer antes: dois <dialog> modais empilhados no mobile.
              setAberto(false)
              setCriandoBoard(true)
            }}
          >
            <span className={rotulo}>Novo Painel</span>
          </Button>
```

E, dentro do fragmento de retorno, depois do `<Modal size="drawer" ...>...</Modal>`:

```tsx
      {/* Fora de conteudo(): ele renderiza duas vezes (aside + drawer) e o formulário é um só. */}
      <BoardFormModal aberto={criandoBoard} aoFechar={() => setCriandoBoard(false)} board={null} />
```

- [ ] **Step 4: Confirmar GREEN**

Run: `npx vitest run src/components/features/Sidebar.test.tsx src/components/features/AppShell.test.tsx > "$TEMP/t8.log" 2>&1; echo $?` — Expected: `0`.

- [ ] **Step 5: Mostrar o diff ao usuário e esperar o OK**

Run: `git add src/components/features/Sidebar.tsx src/components/features/Sidebar.test.tsx && git diff --staged`

- [ ] **Step 6: Commit (só depois do OK)**

```bash
git commit -m "feat(sidebar): Novo Painel abre o formulário de criação de board"
```

---

### Task 9: Documentação

**Files:**
- Modify: `docs/components.md`, `docs/progresso.md`

- [ ] **Step 1: `docs/components.md`, Tabela 2**

Troque a linha do `EmConstrucaoPage` por (Meus Painéis saiu da lista):

```
| `EmConstrucaoPage` | StateView | 6 rotas "em construção" (Favoritos, Atividades, Modelos, Notificações, Ajuda, Configurações) |
```

e logo depois dela acrescente:

```
| `BoardCard` | Menu | um board em Meus Painéis — link pro board + menu Renomear/Excluir |
| `BoardFormModal` | Modal, Field, TextInput, Button | criar e renomear board (PaineisPage, Sidebar) — mesma dualidade criar/editar do TaskModal |
| `ExcluirBoardDialog` | Modal, Field, TextInput, Button (`danger`) | exclusão definitiva de board, confirmada digitando o nome. Separado do BoardFormModal: regra destrutiva diferente, nada em comum além do Modal |
```

Páginas (`AberturaPage`, `PaineisPage`) não entram: `components.md` nunca inventariou `src/pages/`.

- [ ] **Step 2: `docs/progresso.md`**

Antes de `## Como isto é mantido`, acrescente:

```markdown
## Sub-projeto 2/6 — Múltiplos boards ✅

Spec: `docs/superpowers/specs/2026-09-25-multiplos-boards-design.md` · Plano: `docs/superpowers/plans/2026-09-25-multiplos-boards.md`

- [x] Rotas por board: `/boards/:boardId` (+ `/kanban`, `/gantt`, `/dashboard`); `/` redireciona pro último board visitado
- [x] Meus Painéis (`/paineis`): lista, criar, renomear, excluir com confirmação por digitação
- [x] "Novo Painel" da Sidebar funcional
- [x] Board inexistente na URL volta pra `/paineis`
- [x] Sem migration — schema e cascade já suportavam

**Cortado:** arquivar (exigiria migration), contagem de tarefas no card, reordenar boards.
**Limitação aceita:** o bloqueio de excluir o último board é só no cliente.
```

- [ ] **Step 3: Mostrar o diff ao usuário e esperar o OK**

Run: `git add docs/components.md docs/progresso.md && git diff --staged`

- [ ] **Step 4: Commit (só depois do OK)**

```bash
git commit -m "docs: registra múltiplos boards em components.md e progresso.md"
```

---

### Task 10: Fase 6 do manual + verify final

**Files:** nenhum, salvo correções apontadas abaixo (cada correção vira commit próprio, com diff
mostrado antes).

- [ ] **Step 1: Detecção determinística, isolada, antes de qualquer revisão conceitual (§8.1)**

Run: `npm run dup > "$TEMP/dup.log" 2>&1; echo $?` — ler o relatório. Esperado: os 2 clones
pré-existentes (`useQuadro.ts` onMutate/onError; `BoardPage`×`KanbanPage`). Clone novo entre
`BoardFormModal` e `ExcluirBoardDialog` (bloco de erro + botões) é caso de regra dos três —
reportar, **não** unificar agora.

Run: `npm run dead > "$TEMP/dead.log" 2>&1; echo $?` — Expected: `0`, sem achados.

- [ ] **Step 2: `/ponytail-review`** sobre o diff do sub-projeto inteiro (`git diff c1cc144..HEAD`).
Reportar os achados ao usuário; aplicar só com aprovação.

- [ ] **Step 3: `/ponytail-debt`.** O grep padrão da skill não pega `{/* ponytail: */}` em JSX
(`docs/auditoria-fases-6-10.md` §3) — ampliar a busca à mão.

- [ ] **Step 4: Reauditoria de arquitetura código-vs-doc (§8.4)**

Run: `npm run arch > "$TEMP/arch.log" 2>&1; echo $?` — Expected: `0`. Depois, à mão: todo
componente novo de `features/` está em `docs/components.md`? `docs/specs.md` contradiz alguma rota
nova? Para cada divergência, dizer se o errado é o código ou o documento.

- [ ] **Step 5: Verify completo**

Run: `npm run verify > "$TEMP/verify.log" 2>&1; echo $?` — Expected: `0`. Ler o log inteiro:
lint 0 warnings, build, testes + cobertura ≥ 80%, dup, dead, arch, contrast.

- [ ] **Step 6: Checagem manual no navegador** (`npm run dev`, logar):
- `/` cai no último board aberto; abrir outro board, voltar a `/`, cai no novo.
- Meus Painéis: criar (navega pro board novo, com grupo "A fazer"), renomear, excluir (botão só
  habilita com o nome exato; com um board só, não oferece).
- Abrir `/boards/00000000-0000-0000-0000-000000000000` → volta pra `/paineis`.
- 375px: "Novo Painel" no drawer fecha o drawer e abre o formulário.

Se não houver navegador disponível nesta sessão, **dizer isso** — não declarar a feature verificada.

- [ ] **Step 7: Atualizar o grafo**

Run: `graphify update . > "$TEMP/graphify.log" 2>&1; echo $?` — Expected: `0`.

- [ ] **Step 8:** Resumo ao usuário: o que entrou, achados do ponytail-review/debt, e o próximo
sub-projeto da fila (3 — Favoritos), que precisa do próprio brainstorm.

---

## Self-Review

**Cobertura do spec:** rotas (Task 3), AberturaPage + localStorage (Task 2), serviço/hooks
(Task 1), remoção de `buscarBoardAtual`/`useBoardAtual` (Task 3), BoardFormModal (Task 4),
ExcluirBoardDialog com digitação e último board (Task 5), BoardCard (Task 6), PaineisPage (Task 7),
Sidebar (Task 8), board inexistente → `/paineis` (Task 3), docs (Task 9), testes atualizados
levantados por grep (Task 3 Step 8), try/catch no localStorage (Task 2).

**Desvios do spec, deliberados:**
- `AberturaPage` com lista vazia **redireciona para `/paineis`** em vez de mostrar o próprio
  estado vazio — o "Criar painel" fica num lugar só (`PaineisPage`), sem duplicar botão e modal.
- Os testes "board inexistente" das 4 páginas ficam num `it.each` em `boardInexistente.test.tsx`,
  não um arquivo por página — a regra é idêntica nas 4.
- Limite de 120 caracteres via `maxLength` nativo, não validação à mão (rung 4 do ponytail).
- `AberturaPage`/`PaineisPage` não entram em `docs/components.md`: o inventário nunca listou páginas.

**Consistência de nomes:** `useBoard`/`useBoards`/`useCriarBoard`/`useRenomearBoard`/`useExcluirBoard`
iguais nas Tasks 1–5 e 7. Títulos de diálogo `'Novo painel'`/`'Renomear painel'`/`'Excluir painel'`
e rótulos `'Nome do painel'`/`'Criar painel'`/`'Salvar'`/`'Excluir painel'` iguais entre
implementação e testes das Tasks 4, 5, 7, 8. Chave `ultimoBoardId` igual em `lib/ultimoBoard.ts` e
nos testes das Tasks 2 e 3.
