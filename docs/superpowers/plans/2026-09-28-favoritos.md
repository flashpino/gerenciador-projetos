# Favoritos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline).
> Commits sem pedir OK (preferência registrada do usuário), mas mostrando o `--stat` e
> o resumo do que entra. Steps usam checkbox (`- [ ]`).

**Goal:** Favoritar board por pessoa (estrela no título e no card) e `/favoritos` listando
os favoritos, conforme `docs/superpowers/specs/2026-09-28-favoritos-design.md`.

**Architecture:** Tabela `board_favorites` (migration 0003, `user_id default auth.uid()`,
RLS por pessoa). Serviço `buscarFavoritos`/`favoritar`/`desfavoritar`; hook
`useAlternarFavorito` com update otimista. `FavoritoToggle({ boardId, nome })`
autossuficiente, usado no `BoardShell` e no `BoardCard`. `/favoritos` é a `PaineisPage`
com `filtro="favoritos"`.

**Tech Stack:** React 19, TS strict, React Router v7, TanStack Query v5, Tailwind v4,
Vitest + RTL + user-event, lucide-react, Supabase (client não tipado).

## Global Constraints

- **Nenhuma task de código começa antes do gate da Task 0.**
- Só tokens de `src/styles/tokens.css`; ícones `lucide-react` importados individualmente.
- Testes por role/label, nunca por classe.
- Nenhum arquivo novo em `src/components/ui/` (teto de 12).
- Arquivo novo → `/graphify query` antes (manual §7.2).
- Sucesso de comando: `cmd > log 2>&1; echo $?` e ler o código de saída.
- `renderHook` de `@testing-library/react`.

---

### Task 0: Gate humano — migration no ar

**Files:** nenhum.

- [ ] **Step 1:** Confirmar com o usuário que `0003_board_favorites.up.sql` foi aplicada e
  que o teste de isolamento de `docs/data-model.md` ("Teste de isolamento —
  `board_favorites`") imprimiu os 5 `NOTICE ... OK`. **Sem essa confirmação, parar.**
- [ ] **Step 2:** `graphify update . > "$TEMP/graphify.log" 2>&1; echo $?` — Expected `0`.

---

### Task 1: Serviço e hooks de favorito

**Files:**
- Modify: `src/services/boards.ts` (3 funções, depois de `removerBoard`)
- Modify: `src/hooks/useQuadro.ts` (chave `favoritos`, 2 hooks; `useExcluirBoard` invalida favoritos)
- Test: `src/hooks/useQuadro.test.tsx`

**Interfaces — Produces:**
- `buscarFavoritos(): Promise<string[]>`, `favoritar(boardId: string): Promise<void>`,
  `desfavoritar(boardId: string): Promise<void>`
- `useFavoritos()` → `UseQueryResult<string[]>` (chave `['favoritos']`)
- `useAlternarFavorito()` → `mutate({ boardId: string, favorito: boolean })` — `favorito`
  é o **novo** estado desejado

- [ ] **Step 1: Testes que falham** — em `src/hooks/useQuadro.test.tsx`, acrescente ao mock
  de `@/services/boards`: `buscarFavoritos: vi.fn(), favoritar: vi.fn(), desfavoritar: vi.fn(),`;
  importe `useAlternarFavorito` e `useFavoritos` de `./useQuadro`; no fim do arquivo:

```ts
describe('favoritos — alternância otimista', () => {
  beforeEach(() => vi.resetAllMocks())

  it('favoritar aparece IMEDIATAMENTE, antes da resposta do servidor', async () => {
    vi.mocked(servico.buscarFavoritos).mockResolvedValue([])
    vi.mocked(servico.favoritar).mockImplementation(() => new Promise(() => {}))
    const { wrapper } = criarWrapper()
    const { result } = renderHook(
      () => ({ lista: useFavoritos(), alternar: useAlternarFavorito() }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.lista.isSuccess).toBe(true))

    result.current.alternar.mutate({ boardId: 'b1', favorito: true })

    await waitFor(() => expect(result.current.lista.data).toEqual(['b1']))
    expect(servico.favoritar).toHaveBeenCalledWith('b1')
  })

  it('desfaz quando o servidor falha', async () => {
    vi.mocked(servico.buscarFavoritos).mockResolvedValue(['b1'])
    vi.mocked(servico.desfavoritar).mockRejectedValue(new Error('500'))
    const { wrapper } = criarWrapper()
    const { result } = renderHook(
      () => ({ lista: useFavoritos(), alternar: useAlternarFavorito() }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.lista.isSuccess).toBe(true))

    result.current.alternar.mutate({ boardId: 'b1', favorito: false })

    await waitFor(() => expect(result.current.alternar.isError).toBe(true))
    expect(result.current.lista.data).toEqual(['b1'])
    expect(servico.desfavoritar).toHaveBeenCalledWith('b1')
  })
})
```

- [ ] **Step 2: RED** — `npx vitest run src/hooks/useQuadro.test.tsx > "$TEMP/f1.log" 2>&1; echo $?` → `1` (`useFavoritos is not a function`).

- [ ] **Step 3: Serviço** — em `src/services/boards.ts`, depois de `removerBoard`:

```ts
/** Ids dos boards favoritados pela pessoa logada — o RLS de board_favorites filtra. */
export async function buscarFavoritos(): Promise<string[]> {
  const { data, error } = await supabase.from('board_favorites').select('board_id')
  if (error) throw traduzirErro(error)
  return (data ?? []).map((f) => f.board_id as string)
}

/** Sem user_id: o `default auth.uid()` preenche e a policy confere (0003). */
export async function favoritar(boardId: string): Promise<void> {
  const { error } = await supabase.from('board_favorites').insert({ board_id: boardId })
  if (error) throw traduzirErro(error)
}

/** Filtra só por board: o RLS já restringe o delete aos favoritos da própria pessoa. */
export async function desfavoritar(boardId: string): Promise<void> {
  const { error } = await supabase.from('board_favorites').delete().eq('board_id', boardId)
  if (error) throw traduzirErro(error)
}
```

- [ ] **Step 4: Hooks** — em `src/hooks/useQuadro.ts`: acrescente `buscarFavoritos`,
  `desfavoritar`, `favoritar` ao import de `@/services/boards` (ordem alfabética); em
  `chaves`, depois de `board`, acrescente `favoritos: ['favoritos'] as const,`; em
  `useExcluirBoard`, troque o `onSuccess` por:

```ts
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaves.boards })
      // A cascata do banco apagou o favorito junto (0003).
      void qc.invalidateQueries({ queryKey: chaves.favoritos })
    },
```

  e, logo depois de `useExcluirBoard`, adicione:

```ts
export function useFavoritos() {
  return useQuery({ queryKey: chaves.favoritos, queryFn: buscarFavoritos })
}

/**
 * Estrela é clique de alternância, como a célula da F1: UPDATE OTIMISTA —
 * muda na hora e volta se o servidor recusar.
 */
export function useAlternarFavorito() {
  const qc = useQueryClient()
  const chave = chaves.favoritos

  return useMutation({
    mutationFn: ({ boardId, favorito }: { boardId: string; favorito: boolean }) =>
      favorito ? favoritar(boardId) : desfavoritar(boardId),

    onMutate: async ({ boardId, favorito }) => {
      await qc.cancelQueries({ queryKey: chave })
      const anterior = qc.getQueryData<string[]>(chave)
      qc.setQueryData<string[]>(chave, (ids = []) =>
        favorito ? [...ids, boardId] : ids.filter((id) => id !== boardId),
      )
      return { anterior }
    },

    onError: (_erro, _vars, ctx) => {
      if (ctx?.anterior) qc.setQueryData(chave, ctx.anterior)
    },

    onSettled: () => {
      void qc.invalidateQueries({ queryKey: chave })
    },
  })
}
```

- [ ] **Step 5: GREEN** — mesmo comando do Step 2 → `0`; `npx tsc -b > "$TEMP/tsc.log" 2>&1; echo $?` → `0`.
- [ ] **Step 6: Commit** — `git add src/services/boards.ts src/hooks/useQuadro.ts src/hooks/useQuadro.test.tsx`,
  mostrar `git diff --staged --stat`, commit `feat(favoritos): serviço e hooks com alternância otimista`.

---

### Task 2: `FavoritoToggle`

**Files:** Create `src/components/features/FavoritoToggle.tsx`, `src/components/features/FavoritoToggle.test.tsx`

**Interfaces:** Consumes `useFavoritos`, `useAlternarFavorito` (Task 1), `Button` (ui).
Produces `FavoritoToggle({ boardId: string, nome: string })` — botão com
`aria-label` `"Favoritar {nome}"` e `aria-pressed`.

- [ ] **Step 1:** `/graphify query "já existe botão de alternância / toggle com aria-pressed?"` — confirmar lendo o arquivo se apontar algo.
- [ ] **Step 2: Teste que falha** — `src/components/features/FavoritoToggle.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarFavoritos: vi.fn(),
  favoritar: vi.fn(),
  desfavoritar: vi.fn(),
}))

import * as servico from '@/services/boards'
import { FavoritoToggle } from './FavoritoToggle'

function renderizar() {
  const { wrapper: QueryWrapper } = criarWrapper()
  render(
    <QueryWrapper>
      <FavoritoToggle boardId="b1" nome="Sprint Alpha" />
    </QueryWrapper>,
  )
}

async function botaoPronto() {
  const botao = await screen.findByRole('button', { name: 'Favoritar Sprint Alpha' })
  await vi.waitFor(() => expect(botao).toBeEnabled())
  return botao
}

describe('FavoritoToggle', () => {
  beforeEach(() => vi.resetAllMocks())

  it('fora dos favoritos: aria-pressed=false; clique favorita', async () => {
    // 1ª leitura: vazio. Depois do clique o refetch já devolve com o b1.
    vi.mocked(servico.buscarFavoritos).mockResolvedValueOnce([]).mockResolvedValue(['b1'])
    vi.mocked(servico.favoritar).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderizar()

    const botao = await botaoPronto()
    expect(botao).toHaveAttribute('aria-pressed', 'false')

    await user.click(botao)

    expect(botao).toHaveAttribute('aria-pressed', 'true')
    expect(servico.favoritar).toHaveBeenCalledWith('b1')
  })

  it('já favoritado: aria-pressed=true; clique desfavorita', async () => {
    vi.mocked(servico.buscarFavoritos).mockResolvedValueOnce(['b1']).mockResolvedValue([])
    vi.mocked(servico.desfavoritar).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderizar()

    const botao = await botaoPronto()
    await vi.waitFor(() => expect(botao).toHaveAttribute('aria-pressed', 'true'))

    await user.click(botao)

    expect(botao).toHaveAttribute('aria-pressed', 'false')
    expect(servico.desfavoritar).toHaveBeenCalledWith('b1')
  })

  it('servidor recusa: a estrela volta e o erro é anunciado', async () => {
    vi.mocked(servico.buscarFavoritos).mockResolvedValue([])
    vi.mocked(servico.favoritar).mockRejectedValue(new Error('500'))
    const user = userEvent.setup()
    renderizar()

    await user.click(await botaoPronto())

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível atualizar o favorito de Sprint Alpha.')
    expect(screen.getByRole('button', { name: 'Favoritar Sprint Alpha' })).toHaveAttribute('aria-pressed', 'false')
  })
})
```

- [ ] **Step 3: RED** — `npx vitest run src/components/features/FavoritoToggle.test.tsx > "$TEMP/f2.log" 2>&1; echo $?` → `1` (módulo não existe).
- [ ] **Step 4: Implementar** — `src/components/features/FavoritoToggle.tsx`:

```tsx
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAlternarFavorito, useFavoritos } from '@/hooks/useQuadro'
import { cn } from '@/lib/cn'

interface Props {
  boardId: string
  nome: string
}

/**
 * Estrela de favorito — autossuficiente: lê e alterna sozinha, quem usa só passa
 * id e nome (docs/superpowers/specs/2026-09-28-favoritos-design.md).
 */
export function FavoritoToggle({ boardId, nome }: Props) {
  const favoritos = useFavoritos()
  const alternar = useAlternarFavorito()
  const ativo = favoritos.data?.includes(boardId) ?? false

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        aria-label={`Favoritar ${nome}`}
        aria-pressed={ativo}
        disabled={favoritos.isPending}
        onClick={() => alternar.mutate({ boardId, favorito: !ativo })}
        iconStart={<Star aria-hidden="true" className={cn('size-4', ativo && 'fill-current text-primary')} />}
      />
      {alternar.isError && (
        <span role="alert" className="sr-only">
          Não foi possível atualizar o favorito de {nome}.
        </span>
      )}
    </>
  )
}
```

- [ ] **Step 5: GREEN** — mesmo comando → `0`; `tsc` → `0`; `npm run lint > "$TEMP/lint.log" 2>&1; echo $?` → `0`.
- [ ] **Step 6: Commit** — os 2 arquivos, `feat(features): FavoritoToggle — estrela de favorito`.

---

### Task 3: Estrela no `BoardShell` e no `BoardCard`

**Files:**
- Modify: `src/components/features/BoardShell.tsx`, `src/components/features/BoardCard.tsx`
- Modify (testes): `BoardShell.test.tsx`, `BoardCard.test.tsx`, `src/pages/boardInexistente.test.tsx`,
  `src/pages/DashboardPage.test.tsx`, `src/pages/PaineisPage.test.tsx`, `src/test/a11y.test.tsx`

Todo teste que renderiza `BoardShell` ou `BoardCard` passa a precisar de
`QueryClientProvider` e de `buscarFavoritos` no mock de serviço (o toggle consulta sozinho).

- [ ] **Step 1: Testes que falham**

`BoardShell.test.tsx` — substitua o arquivo por:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarFavoritos: vi.fn(),
  favoritar: vi.fn(),
  desfavoritar: vi.fn(),
}))

import * as servico from '@/services/boards'
import { BoardShell } from './BoardShell'

function renderizar(rota = '/boards/b1') {
  const { wrapper: QueryWrapper } = criarWrapper()
  return render(
    <QueryWrapper>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/boards/:boardId/*" element={<BoardShell titulo="Sprint Alpha">conteudo</BoardShell>} />
        </Routes>
      </MemoryRouter>
    </QueryWrapper>,
  )
}

describe('BoardShell', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
    vi.mocked(servico.buscarFavoritos).mockResolvedValue([])
  })

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

  it('estrela de favorito funcional, com o nome do board', async () => {
    renderizar()
    const estrela = await screen.findByRole('button', { name: 'Favoritar Sprint Alpha' })
    expect(estrela).toHaveAttribute('aria-pressed', 'false')
  })

  it('os ícones ainda não implementados seguem desabilitados, com o motivo', () => {
    renderizar()
    for (const nome of [
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

`BoardCard.test.tsx` — acrescente, antes do `import { BoardCard }`:

```tsx
vi.mock('@/services/boards', () => ({
  buscarFavoritos: vi.fn().mockResolvedValue(['b1']),
  favoritar: vi.fn(),
  desfavoritar: vi.fn(),
}))
```

acrescente `import { criarWrapper } from '@/test/query'`; troque a função `renderizar` por:

```tsx
function renderizar() {
  const aoRenomear = vi.fn()
  const aoExcluir = vi.fn()
  const { wrapper: QueryWrapper } = criarWrapper()
  render(
    <QueryWrapper>
      <MemoryRouter>
        <BoardCard board={BOARD} aoRenomear={aoRenomear} aoExcluir={aoExcluir} />
      </MemoryRouter>
    </QueryWrapper>,
  )
  return { aoRenomear, aoExcluir }
}
```

e acrescente o caso:

```tsx
  it('mostra a estrela de favorito do board, já marcada quando favoritado', async () => {
    renderizar()
    const estrela = await screen.findByRole('button', { name: 'Favoritar Sprint Alpha' })
    await vi.waitFor(() => expect(estrela).toHaveAttribute('aria-pressed', 'true'))
  })
```

(`vi.fn().mockResolvedValue` dentro do factory: o `BoardCard.test` não usa `resetAllMocks`, então o valor persiste.)

Nos arquivos abaixo, acrescente `buscarFavoritos: vi.fn(),` ao mock de `@/services/boards`
e, **no `beforeEach` depois do `vi.resetAllMocks()`**, `vi.mocked(servico.buscarFavoritos).mockResolvedValue([])`:
- `src/pages/boardInexistente.test.tsx`
- `src/pages/DashboardPage.test.tsx` — o `beforeEach(() => vi.resetAllMocks())` vira
  `beforeEach(() => { vi.resetAllMocks(); vi.mocked(servico.buscarFavoritos).mockResolvedValue([]) })`
- `src/pages/PaineisPage.test.tsx`
- `src/test/a11y.test.tsx`

- [ ] **Step 2: RED** — `npx vitest run src/components/features/BoardShell.test.tsx src/components/features/BoardCard.test.tsx > "$TEMP/f3.log" 2>&1; echo $?` → `1`
  (não existe botão "Favoritar Sprint Alpha").

- [ ] **Step 3: `BoardShell`** — acrescente `import { FavoritoToggle } from './FavoritoToggle'`;
  tire `Star` do import de `lucide-react`; troque o `<Button ... aria-label="Favoritar — em breve" .../>` inteiro por:

```tsx
          <FavoritoToggle boardId={boardId} nome={titulo} />
```

  e, no comentário acima dos ícones, troque `Ícones do Stitch (favoritar/buscar/filtrar/convidar/novo item),
  todos desabilitados por enquanto` por `Ícones do Stitch (buscar/filtrar/convidar/novo item)
  desabilitados por enquanto — a estrela de favorito já funciona (sub-projeto 3)`.

- [ ] **Step 4: `BoardCard`** — acrescente `import { FavoritoToggle } from './FavoritoToggle'` e,
  entre o `</Link>` e o `<Menu`, insira:

```tsx
      <FavoritoToggle boardId={board.id} nome={board.name} />
```

- [ ] **Step 5: GREEN na suíte inteira** — `npx vitest run > "$TEMP/f3.log" 2>&1; echo $?` → `0`;
  `tsc` → `0`; lint → `0`.
- [ ] **Step 6: Commit** — os 8 arquivos, `feat(favoritos): estrela no título do board e no card de Meus Painéis`.

---

### Task 4: `/favoritos` — variante da `PaineisPage`

**Files:** Modify `src/pages/PaineisPage.tsx`, `src/pages/PaineisPage.test.tsx`, `src/App.tsx`, `src/test/a11y.test.tsx`

**Interfaces:** `PaineisPage({ filtro = 'todos' }: { filtro?: 'todos' | 'favoritos' })`.

- [ ] **Step 1: Testes que falham** — no fim do `describe` de `PaineisPage.test.tsx`:

```tsx
  it('variante favoritos: título próprio e só os boards favoritados', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    vi.mocked(servico.buscarFavoritos).mockResolvedValue(['b2'])
    const { wrapper: QueryWrapper } = criarWrapper()
    render(
      <QueryWrapper>
        <MemoryRouter>
          <PaineisPage filtro="favoritos" />
        </MemoryRouter>
      </QueryWrapper>,
    )

    expect(screen.getByRole('heading', { name: 'Favoritos' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Roadmap/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Sprint Alpha/ })).not.toBeInTheDocument()
  })

  it('variante favoritos sem nenhum favorito: estado vazio próprio, com link pra Meus Painéis', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    vi.mocked(servico.buscarFavoritos).mockResolvedValue([])
    const { wrapper: QueryWrapper } = criarWrapper()
    render(
      <QueryWrapper>
        <MemoryRouter>
          <PaineisPage filtro="favoritos" />
        </MemoryRouter>
      </QueryWrapper>,
    )

    expect(await screen.findByText('Nenhum favorito ainda')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver Meus Painéis' })).toHaveAttribute('href', '/paineis')
  })
```

- [ ] **Step 2: RED** — `npx vitest run src/pages/PaineisPage.test.tsx > "$TEMP/f4.log" 2>&1; echo $?` → `1`.

- [ ] **Step 3: Implementar** — em `src/pages/PaineisPage.tsx`: acrescente
  `import { Link } from 'react-router-dom'`; troque `useBoards` do import por
  `useBoards, useFavoritos`; troque do `export default function PaineisPage() {` até o fim
  do `const estado = estadoDaQuery(...)` (inclusive) por:

```tsx
interface Props {
  /** '/favoritos' é esta mesma página filtrada — reusa os modais sem duplicar estado. */
  filtro?: 'todos' | 'favoritos'
}

export default function PaineisPage({ filtro = 'todos' }: Props) {
  const boards = useBoards()
  const favoritos = useFavoritos()
  const soFavoritos = filtro === 'favoritos'
  // null = fechado, 'novo' = criando, um Board = renomeando.
  const [form, setForm] = useState<Board | 'novo' | null>(null)
  const [boardParaExcluir, setBoardParaExcluir] = useState<Board | null>(null)
  const abrirCriacao = () => setForm('novo')

  const lista = soFavoritos ? boards.data?.filter((b) => favoritos.data?.includes(b.id)) : boards.data
  // Na variante favoritos, os quatro estados dependem das duas queries.
  const consulta = soFavoritos
    ? {
        isPending: boards.isPending || favoritos.isPending,
        isError: boards.isError || favoritos.isError,
        error: boards.error ?? favoritos.error,
        data: lista,
      }
    : boards

  const estado = estadoDaQuery(
    consulta,
    soFavoritos
      ? {
          titulo: 'Nenhum favorito ainda',
          descricao: 'Marque a estrela de um painel para vê-lo aqui.',
          acao: (
            <Link to="/paineis" className="text-body font-semibold text-primary underline">
              Ver Meus Painéis
            </Link>
          ),
        }
      : {
          titulo: 'Nenhum painel ainda',
          descricao: 'Crie um painel para organizar o trabalho da squad.',
          acao: (
            <Button variant="primary" onClick={abrirCriacao}>
              Criar painel
            </Button>
          ),
        },
    () => {
      void boards.refetch()
      if (soFavoritos) void favoritos.refetch()
    },
  )
```

  troque `<h1 className="text-display">Meus Painéis</h1>` por
  `<h1 className="text-display">{soFavoritos ? 'Favoritos' : 'Meus Painéis'}</h1>`;
  e troque `{boards.data?.map((b) => (` por `{lista?.map((b) => (`.
  (`ehOUltimo` continua lendo `boards.data` — a trava é sobre o workspace, não sobre a lista filtrada.)

- [ ] **Step 4: Rota** — em `src/App.tsx`, troque o bloco `<Route path="/favoritos" element={<EmConstrucaoPage titulo="Favoritos" ... />} />` por:

```tsx
                  <Route path="/favoritos" element={<PaineisPage filtro="favoritos" />} />
```

- [ ] **Step 5: a11y** — em `src/test/a11y.test.tsx`, acrescente o caso:

```tsx
  it('PaineisPage variante Favoritos não tem violação WCAG', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue([
      { id: 'b1', name: 'Sprint Alpha Q3', created_at: '2026-09-01T10:00:00Z' },
      { id: 'b2', name: 'Roadmap', created_at: '2026-09-10T10:00:00Z' },
    ])
    vi.mocked(servico.buscarFavoritos).mockResolvedValue(['b2'])
    vi.mocked(servico.buscarWorkspaceAtual).mockResolvedValue({ id: 'w1', name: 'Meu Workspace' })
    const { wrapper: QueryWrapper } = criarWrapper()
    const { container, findByText } = render(
      <MemoryRouter>
        <QueryWrapper>
          <PaineisPage filtro="favoritos" />
        </QueryWrapper>
      </MemoryRouter>,
    )
    await findByText('Roadmap')
    expect(await axe(container)).toHaveNoViolations()
  })
```

- [ ] **Step 6: GREEN** — `npx vitest run src/pages/PaineisPage.test.tsx src/test/a11y.test.tsx > "$TEMP/f4.log" 2>&1; echo $?` → `0`; `tsc` → `0`; lint → `0`.
- [ ] **Step 7: Commit** — os 4 arquivos, `feat(pages): /favoritos como variante da PaineisPage`.

---

### Task 5: Documentação

- [ ] `docs/components.md`, Tabela 2: linha do `EmConstrucaoPage` passa a "5 rotas … (Atividades,
  Modelos, Notificações, Ajuda, Configurações)"; depois dela:
  `| \`FavoritoToggle\` | Button (\`ghost\`, \`iconOnly\`) | estrela de favorito autossuficiente — BoardShell e BoardCard |`.
  Na linha do `BoardShell`, "ícones desabilitados da barra superior" vira "estrela de favorito + ícones desabilitados da barra superior".
- [ ] `docs/progresso.md`: seção "Sub-projeto 3/6 — Favoritos ✅" antes de `## Como isto é mantido`,
  no mesmo formato da seção do sub-projeto 2 (spec, plano, itens, cortados: atalhos na Sidebar,
  ordenar favoritos, favoritar tarefa).
- [ ] `docs/data-model.md`: no topo, a tabela de migrations ganha `0003_board_favorites` e a frase
  "9 tabelas, 9 `enable row level security`" vira "10 … 10"; na tabela de índices,
  `board_favorites (board_id)` → cascata ao excluir board.
- [ ] Commit `docs: registra favoritos`.

---

### Task 6: Fase 6 do manual + verify + navegador

- [ ] `npm run dup` e `npm run dead` **isolados**, lendo os logs. `useAlternarFavorito` repete o
  formato onMutate/onError/onSettled pela **3ª vez** (depois de `useAtualizarTarefa` e
  `useAtualizarSubtarefa`) — é o gatilho da regra dos três. Se o jscpd apontar, **propor** ao
  usuário extrair um helper de mutação otimista; não extrair sem avisar.
- [ ] `/ponytail-review` em `git diff 782e02b..HEAD -- src/`; `/ponytail-debt` (busca manual incluindo JSX).
- [ ] `npm run arch`; reauditoria §8.4 (componentes novos em `components.md`, rotas vs `specs.md`).
- [ ] `npm run verify > "$TEMP/verify.log" 2>&1; echo $?` → `0`, log lido inteiro.
- [ ] Navegador, conta C: favoritar pelo card em Meus Painéis → aparece em `/favoritos`;
  desfavoritar no título do board → some de `/favoritos`; recarregar mantém o estado (veio do banco);
  `/favoritos` vazio mostra o estado próprio; excluir um board favoritado → some de `/favoritos`.
  Encerrar o servidor que subir (checar a porta 5173 no fim).
- [ ] `graphify update .`; resumo ao usuário; próximo da fila: sub-projeto 4 (Feed de Atividades).

---

## Self-Review

**Cobertura do spec:** serviço/hooks (T1), `FavoritoToggle` autossuficiente (T2), estrela no
título e no card (T3), `/favoritos` como variante com vazio próprio (T4), `useExcluirBoard`
invalidando favoritos (T1), erro anunciado com `role="alert"` (T2), docs incluindo
`data-model.md` (T5), migration fora deste plano (já escrita, gate na T0).

**Consistência:** `buscarFavoritos`/`favoritar`/`desfavoritar`/`useFavoritos`/`useAlternarFavorito`
iguais em T1–T4; nome acessível `"Favoritar {nome}"` igual em T2, T3 e nos testes; `filtro="favoritos"`
igual em T4 e na rota.

**Risco conhecido:** qualquer teste novo que renderize `BoardShell`/`BoardCard` sem
`buscarFavoritos` no mock falha com "No export defined on the mock" — T3 lista os 6 arquivos.
