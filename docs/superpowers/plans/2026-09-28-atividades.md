# Feed de Atividades — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline).
> Commits sem pedir OK (preferência registrada), mostrando o `--stat`. Steps em checkbox.

**Goal:** Feed de eventos (tarefa criada, status alterado, comentário) em `/atividades` e num
card do Dashboard, conforme `docs/superpowers/specs/2026-09-28-atividades-design.md`.

**Architecture:** Os eventos são gravados por gatilhos no banco (migration 0004); o app só
lê. Serviço `buscarAtividades` → hook `useAtividades` → `lib/atividade.ts` (texto puro) →
`FeedAtividades` (apresentação) usado por `AtividadesPage` e `DashboardPage`.

**Tech Stack:** React 19, TS strict, React Router v7, TanStack Query v5, Tailwind v4,
Vitest + RTL, lucide-react, Supabase (client não tipado).

## Global Constraints

- **Nenhuma task de código antes do gate da Task 0.**
- Só tokens; ícones `lucide-react` importados individualmente.
- Testes por role/label/texto; nunca por classe.
- Nenhum arquivo novo em `src/components/ui/`.
- Arquivo novo → `/graphify query` antes.
- Sucesso de comando: `cmd > log 2>&1; echo $?`, ler o código.
- Rótulos de status vêm de `STATUS` (`src/lib/status.ts`) — nenhum mapa novo.

---

### Task 0: Gate humano — migration 0004 no ar

- [ ] Confirmar com o usuário que `0004_activities.up.sql` foi aplicada. Checar com leitura
  anônima: `GET /rest/v1/activities?select=id&limit=1` → HTTP 200 (tabela existe).
- [ ] Se o usuário não rodou o teste SQL do `data-model.md`, verificar pela API com as contas
  A e B (script no scratchpad, mesmo formato do de favoritos): mudar status de uma tarefa de A
  → 1 evento `status_changed` com `actor_id = A`; comentar → `comment_added`; B não vê eventos
  de A; `POST /rest/v1/activities` como A → 403. **Limpeza:** voltar o status original e
  apagar o comentário de teste (os eventos gerados ficam — são históricos reais).
- [ ] `graphify update .`

---

### Task 1: Tipo, serviço e hook

**Files:** Modify `src/types/domain.ts`, `src/services/boards.ts`, `src/hooks/useQuadro.ts`;
Test `src/hooks/useQuadro.test.tsx`

**Produces:**
- `type ActivityKind = 'task_created' | 'status_changed' | 'comment_added'`
- `interface Atividade { id: number; board_id: string; task_id: string | null; kind: ActivityKind; task_title: string; from_status: TaskStatus | null; to_status: TaskStatus | null; comment_excerpt: string | null; created_at: string; ator: Pick<Profile, 'full_name' | 'avatar_url'> | null; board: { name: string } | null }`
- `buscarAtividades({ boardId?: string; limite: number }): Promise<Atividade[]>`
- `useAtividades(boardId: string | undefined, limite: number)` (chave `['atividades', boardId ?? 'todos', limite]`)
- `useAtualizarTarefa`, `useCriarTarefa`, `useCriarComentario` invalidam o prefixo `['atividades']`

- [ ] **Step 1: testes que falham** — em `useQuadro.test.tsx`, mock ganha `buscarAtividades: vi.fn(),`;
  importar `useAtividades`; no fim:

```ts
describe('atividades', () => {
  beforeEach(() => vi.resetAllMocks())

  it('useAtividades repassa boardId e limite ao serviço', async () => {
    vi.mocked(servico.buscarAtividades).mockResolvedValue([])
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useAtividades('b1', 10), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(servico.buscarAtividades).toHaveBeenCalledWith({ boardId: 'b1', limite: 10 })
  })

  it('mudar uma tarefa invalida o feed — o evento novo aparece sem esperar o staleTime', async () => {
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue(grupos())
    vi.mocked(servico.atualizarTarefa).mockResolvedValue({} as never)
    const { wrapper, client } = criarWrapper()
    const espiao = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useAtualizarTarefa('b1'), { wrapper })

    result.current.mutate({ id: 't1', campos: { status: 'done' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(espiao).toHaveBeenCalledWith({ queryKey: ['atividades'] })
  })

  it('comentar invalida o feed', async () => {
    vi.mocked(servico.criarComentario).mockResolvedValue({ id: 'c1' } as never)
    const { wrapper, client } = criarWrapper()
    const espiao = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCriarComentario('t1'), { wrapper })

    result.current.mutate({ authorId: 'u1', body: 'oi' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(espiao).toHaveBeenCalledWith({ queryKey: ['atividades'] })
  })
})
```

- [ ] **Step 2: RED** — `npx vitest run src/hooks/useQuadro.test.tsx` → exit 1.
- [ ] **Step 3: tipo** — em `src/types/domain.ts`, depois de `TaskComDetalhe`:

```ts
export type ActivityKind = 'task_created' | 'status_changed' | 'comment_added'

/** Linha de `activities` (0004), gravada por gatilho — o app só lê. */
export interface Atividade {
  id: number
  board_id: string
  task_id: string | null
  kind: ActivityKind
  /** Cópia: a tarefa pode ter sido renomeada ou apagada depois. */
  task_title: string
  from_status: TaskStatus | null
  to_status: TaskStatus | null
  comment_excerpt: string | null
  created_at: string
  ator: Pick<Profile, 'full_name' | 'avatar_url'> | null
  board: { name: string } | null
}
```

- [ ] **Step 4: serviço** — em `src/services/boards.ts`: importar `Atividade` no import de tipos;
  depois de `desfavoritar`:

```ts
/** Feed: os `limite` mais recentes, do workspace inteiro ou de um board. RLS isola. */
export async function buscarAtividades({ boardId, limite }: { boardId?: string; limite: number }): Promise<Atividade[]> {
  let consulta = supabase
    .from('activities')
    .select(
      'id, board_id, task_id, kind, task_title, from_status, to_status, comment_excerpt, created_at, ator:profiles(full_name, avatar_url), board:boards(name)',
    )
  if (boardId) consulta = consulta.eq('board_id', boardId)
  const { data, error } = await consulta.order('created_at', { ascending: false }).limit(limite)

  if (error) throw traduzirErro(error)
  return (data ?? []) as unknown as Atividade[]
}
```

- [ ] **Step 5: hook** — em `src/hooks/useQuadro.ts`:
  - import de `@/services/boards` ganha `buscarAtividades`;
  - `chaves` ganha `atividades: (boardId: string | undefined, limite: number) => ['atividades', boardId ?? 'todos', limite] as const,`
    e `todasAtividades: ['atividades'] as const,`;
  - `useMutacaoOtimista` ganha o 4º parâmetro e invalida também:

```ts
function useMutacaoOtimista<TDado, TVars>(
  chave: QueryKey,
  mutationFn: (vars: TVars) => Promise<unknown>,
  aplicar: (atual: TDado | undefined, vars: TVars) => TDado | undefined,
  /** Outras caches que a mudança torna velhas (ex.: o feed de atividades). */
  invalidarTambem: readonly QueryKey[] = [],
) {
```

    e no `onSettled`, depois do invalidate da `chave`:

```ts
      for (const outra of invalidarTambem) void qc.invalidateQueries({ queryKey: outra })
```

  - `useAtualizarTarefa` passa `[chaves.todasAtividades]` como 4º argumento;
  - `useCriarTarefa` e `useCriarComentario`: no `onSuccess`, acrescentar
    `void qc.invalidateQueries({ queryKey: chaves.todasAtividades })`;
  - novo hook, depois de `useAlternarFavorito`:

```ts
export function useAtividades(boardId: string | undefined, limite: number) {
  return useQuery({
    queryKey: chaves.atividades(boardId, limite),
    queryFn: () => buscarAtividades({ boardId, limite }),
  })
}
```

- [ ] **Step 6: GREEN** — testes → 0; `tsc -b` → 0; lint → 0.
- [ ] **Step 7: commit** `feat(atividades): tipo, serviço e hook do feed`.

---

### Task 2: `lib/atividade.ts` — o texto de cada evento

**Files:** Create `src/lib/atividade.ts`, `src/lib/atividade.test.ts`

**Produces:** `descreverAtividade(a: Pick<Atividade, 'kind' | 'to_status' | 'comment_excerpt' | 'ator'>): DescricaoAtividade`
com `{ icone: 'criada' | 'concluida' | 'travada' | 'status' | 'comentario'; ator: string; antes: string; depois: string; status: TaskStatus | null; trecho: string | null }`.
Frase montada pelo componente: `{ator} {antes} “{task_title}”{depois} [Badge status] [trecho]`.

- [ ] `/graphify query "já existe função que descreve evento/atividade em texto?"`
- [ ] **Teste que falha** — `src/lib/atividade.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { descreverAtividade } from './atividade'

const ANA = { full_name: 'Ana Lima', avatar_url: null }

describe('descreverAtividade', () => {
  it('tarefa criada', () => {
    expect(descreverAtividade({ kind: 'task_created', to_status: 'not_started', comment_excerpt: null, ator: ANA }))
      .toEqual({ icone: 'criada', ator: 'Ana Lima', antes: 'criou a tarefa', depois: '', status: null, trecho: null })
  })

  it('status → Pronto vira "concluiu", sem badge', () => {
    expect(descreverAtividade({ kind: 'status_changed', to_status: 'done', comment_excerpt: null, ator: ANA }))
      .toMatchObject({ icone: 'concluida', antes: 'concluiu', depois: '', status: null })
  })

  it('status → Travado vira "marcou … como travada"', () => {
    expect(descreverAtividade({ kind: 'status_changed', to_status: 'stuck', comment_excerpt: null, ator: ANA }))
      .toMatchObject({ icone: 'travada', antes: 'marcou', depois: ' como travada', status: null })
  })

  it('outros status: "mudou … para" + o status no badge', () => {
    expect(descreverAtividade({ kind: 'status_changed', to_status: 'review', comment_excerpt: null, ator: ANA }))
      .toMatchObject({ icone: 'status', antes: 'mudou', depois: ' para', status: 'review' })
  })

  it('comentário traz o trecho', () => {
    expect(descreverAtividade({ kind: 'comment_added', to_status: null, comment_excerpt: 'Figma exportado', ator: ANA }))
      .toMatchObject({ icone: 'comentario', antes: 'comentou em', depois: ':', trecho: 'Figma exportado' })
  })

  it('ator apagado (null) vira "Alguém"', () => {
    expect(descreverAtividade({ kind: 'task_created', to_status: null, comment_excerpt: null, ator: null }).ator).toBe('Alguém')
  })
})
```

- [ ] **RED** → exit 1.
- [ ] **Implementar** — `src/lib/atividade.ts`:

```ts
import type { Atividade, TaskStatus } from '@/types/domain'

export type IconeAtividade = 'criada' | 'concluida' | 'travada' | 'status' | 'comentario'

export interface DescricaoAtividade {
  icone: IconeAtividade
  ator: string
  /** Texto antes do título entre aspas. */
  antes: string
  /** Texto logo depois do título (começa com espaço ou pontuação). */
  depois: string
  /** Só em "mudou … para": o status novo, mostrado como Badge. */
  status: TaskStatus | null
  trecho: string | null
}

/**
 * Concluída e travada têm frase própria (são os eventos que o time mais quer
 * ver — Stitch, dashboard); os outros status saem como "mudou … para {badge}".
 */
export function descreverAtividade(
  a: Pick<Atividade, 'kind' | 'to_status' | 'comment_excerpt' | 'ator'>,
): DescricaoAtividade {
  const base = { ator: a.ator?.full_name ?? 'Alguém', depois: '', status: null, trecho: null }

  if (a.kind === 'task_created') return { ...base, icone: 'criada', antes: 'criou a tarefa' }
  if (a.kind === 'comment_added') {
    return { ...base, icone: 'comentario', antes: 'comentou em', depois: ':', trecho: a.comment_excerpt }
  }
  if (a.to_status === 'done') return { ...base, icone: 'concluida', antes: 'concluiu' }
  if (a.to_status === 'stuck') return { ...base, icone: 'travada', antes: 'marcou', depois: ' como travada' }
  return { ...base, icone: 'status', antes: 'mudou', depois: ' para', status: a.to_status }
}
```

- [ ] **GREEN**; tsc; lint. **Commit** `feat(lib): descreverAtividade — texto de cada evento do feed`.

---

### Task 3: `FeedAtividades`

**Files:** Create `src/components/features/FeedAtividades.tsx`, `FeedAtividades.test.tsx`

**Produces:** `FeedAtividades({ atividades: Atividade[]; mostrarBoard?: boolean })`.

- [ ] `/graphify query "já existe lista de eventos/histórico/timeline?"` (o `CommentList` é o
  parente mais próximo — lista de comentários de UMA tarefa, com autor e tempo; não serve de
  base porque renderiza corpo inteiro e é editável).
- [ ] **Teste que falha** — `FeedAtividades.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { Atividade } from '@/types/domain'
import { FeedAtividades } from './FeedAtividades'

const base: Atividade = {
  id: 1, board_id: 'b1', task_id: 't1', kind: 'status_changed', task_title: 'Deploy',
  from_status: 'working', to_status: 'review', comment_excerpt: null,
  created_at: new Date().toISOString(),
  ator: { full_name: 'Ana Lima', avatar_url: null }, board: { name: 'Sprint Alpha' },
}

function renderizar(atividades: Atividade[], mostrarBoard = false) {
  render(
    <MemoryRouter>
      <FeedAtividades atividades={atividades} mostrarBoard={mostrarBoard} />
    </MemoryRouter>,
  )
}

describe('FeedAtividades', () => {
  it('um item de lista por evento, com a frase e o status no badge', () => {
    renderizar([base, { ...base, id: 2, kind: 'task_created', task_title: 'Setup', to_status: 'not_started' }])
    const itens = screen.getAllByRole('listitem')
    expect(itens).toHaveLength(2)
    expect(itens[0]).toHaveTextContent('Ana Lima mudou “Deploy” para Em revisão')
    expect(itens[1]).toHaveTextContent('Ana Lima criou a tarefa “Setup”')
  })

  it('comentário mostra o trecho', () => {
    renderizar([{ ...base, kind: 'comment_added', to_status: null, comment_excerpt: 'Figma exportado' }])
    expect(screen.getByRole('listitem')).toHaveTextContent('Ana Lima comentou em “Deploy”: Figma exportado')
  })

  it('com mostrarBoard, o nome do board é link para ele', () => {
    renderizar([base], true)
    expect(within(screen.getByRole('listitem')).getByRole('link', { name: 'Sprint Alpha' }))
      .toHaveAttribute('href', '/boards/b1')
  })

  it('sem mostrarBoard, não repete o board (o widget já está dentro dele)', () => {
    renderizar([base])
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
```

- [ ] **RED** → exit 1.
- [ ] **Implementar** — `src/components/features/FeedAtividades.tsx`:

```tsx
import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightLeft, Ban, Check, MessageSquare, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { descreverAtividade, type IconeAtividade } from '@/lib/atividade'
import { tempoRelativo } from '@/lib/date'
import { STATUS } from '@/lib/status'
import type { Atividade } from '@/types/domain'

const ICONES: Record<IconeAtividade, ComponentType<{ className?: string }>> = {
  criada: Plus,
  concluida: Check,
  travada: Ban,
  status: ArrowRightLeft,
  comentario: MessageSquare,
}

interface Props {
  atividades: Atividade[]
  /** No /atividades (workspace inteiro); o widget do Dashboard já está dentro do board. */
  mostrarBoard?: boolean
}

export function FeedAtividades({ atividades, mostrarBoard = false }: Props) {
  return (
    <ol className="flex flex-col gap-space-md">
      {atividades.map((a) => {
        const d = descreverAtividade(a)
        const Icone = ICONES[d.icone]
        return (
          <li key={a.id} className="flex items-start gap-space-sm">
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-muted">
              <Icone className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-body text-ink">
                <strong>{d.ator}</strong> {d.antes} “{a.task_title}”{d.depois}
                {d.status && (
                  <>
                    {' '}
                    <Badge tone={STATUS[d.status].classe}>{STATUS[d.status].rotulo}</Badge>
                  </>
                )}
                {d.trecho && <span className="italic text-ink-muted"> {d.trecho}</span>}
              </p>
              <p className="text-label text-ink-muted">
                {tempoRelativo(a.created_at)}
                {mostrarBoard && a.board && (
                  <>
                    {' · '}
                    <Link to={`/boards/${a.board_id}`} className="underline hover:text-ink">
                      {a.board.name}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
```

- [ ] **GREEN**; tsc; lint. **Commit** `feat(features): FeedAtividades`.

---

### Task 4: `/atividades`

**Files:** Create `src/pages/AtividadesPage.tsx`, `AtividadesPage.test.tsx`; Modify `src/App.tsx`, `src/test/a11y.test.tsx`

- [ ] `/graphify query "já existe página de histórico/atividades?"`
- [ ] **Teste que falha** — `AtividadesPage.test.tsx`: mock `@/services/boards` com
  `buscarAtividades: vi.fn()`; casos:
  - carregando: `mockImplementation(() => new Promise(() => {}))` → `getByRole('status')` com "Carregando";
  - erro: rejeita `new Error('Sem conexão.')` → `findByRole('alert')` com o texto;
  - vazio: `[]` → `findByText('Nenhuma atividade ainda')`;
  - pronto: 1 evento (fixture igual à da Task 3) → `findByRole('heading', { name: 'Atividades' })`
    e `findByRole('link', { name: 'Sprint Alpha' })` (board aparece — `mostrarBoard`);
  - chamada: `expect(servico.buscarAtividades).toHaveBeenCalledWith({ boardId: undefined, limite: 50 })`.
  Render: `<QueryWrapper><MemoryRouter><AtividadesPage /></MemoryRouter></QueryWrapper>`.
- [ ] **RED** → exit 1.
- [ ] **Implementar** — `src/pages/AtividadesPage.tsx`:

```tsx
import { FeedAtividades } from '@/components/features/FeedAtividades'
import { StateView } from '@/components/ui/StateView'
import { useAtividades } from '@/hooks/useQuadro'
import { estadoDaQuery } from '@/lib/estadoDaQuery'

/** Workspace inteiro, 50 mais recentes (docs/superpowers/specs/2026-09-28-atividades-design.md). */
export default function AtividadesPage() {
  const atividades = useAtividades(undefined, 50)
  const estado = estadoDaQuery(
    atividades,
    { titulo: 'Nenhuma atividade ainda', descricao: 'Criar tarefas, mudar status e comentar aparece aqui.' },
    () => void atividades.refetch(),
  )

  return (
    <div className="mx-auto max-w-canvas p-gutter md:p-margin">
      <h1 className="mb-gutter text-display">Atividades</h1>
      <StateView estado={estado}>
        <FeedAtividades atividades={atividades.data ?? []} mostrarBoard />
      </StateView>
    </div>
  )
}
```

- [ ] **Rota** — `App.tsx`: `import AtividadesPage from '@/pages/AtividadesPage'` e o bloco
  `<Route path="/atividades" element={<EmConstrucaoPage … />} />` vira
  `<Route path="/atividades" element={<AtividadesPage />} />`.
- [ ] **a11y** — `a11y.test.tsx`: mock ganha `buscarAtividades: vi.fn(),`; no `beforeEach`,
  `vi.mocked(servico.buscarAtividades).mockResolvedValue([])`; caso novo "AtividadesPage não
  tem violação WCAG" com 2 eventos (um `status_changed`, um `comment_added`), esperando
  `findByText(/Deploy/)` antes do `axe`.
- [ ] **GREEN**; tsc; lint. **Commit** `feat(pages): /atividades com o feed do workspace`.

---

### Task 5: Card no Dashboard

**Files:** Modify `src/pages/DashboardPage.tsx`, `src/pages/DashboardPage.test.tsx`,
`src/pages/boardInexistente.test.tsx`

- [ ] **Testes que falham** — `DashboardPage.test.tsx`: mock ganha `buscarAtividades: vi.fn(),`;
  `beforeEach` ganha `vi.mocked(servico.buscarAtividades).mockResolvedValue([])`; casos novos:

```tsx
  it('card "Atividades recentes" mostra os eventos DESTE board (10 mais recentes)', async () => {
    vi.mocked(servico.buscarBoard).mockResolvedValue({ id: 'b1', name: 'Meu Board' })
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue([])
    vi.mocked(servico.buscarAtividades).mockResolvedValue([
      {
        id: 1, board_id: 'b1', task_id: 't1', kind: 'task_created', task_title: 'Setup',
        from_status: null, to_status: 'not_started', comment_excerpt: null,
        created_at: new Date().toISOString(), ator: { full_name: 'Ana Lima', avatar_url: null },
        board: { name: 'Meu Board' },
      },
    ])
    renderizar()

    const card = await screen.findByRole('region', { name: 'Atividades recentes' })
    expect(await within(card).findByText(/criou a tarefa/)).toBeInTheDocument()
    expect(servico.buscarAtividades).toHaveBeenCalledWith({ boardId: 'b1', limite: 10 })
  })

  it('card de atividades tem vazio próprio e aparece mesmo com o board sem tarefas', async () => {
    vi.mocked(servico.buscarBoard).mockResolvedValue({ id: 'b1', name: 'Meu Board' })
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue([])
    renderizar()

    const card = await screen.findByRole('region', { name: 'Atividades recentes' })
    expect(await within(card).findByText('Nenhuma atividade ainda')).toBeInTheDocument()
  })
```

  (importar `within` de `@testing-library/react`.) Em `boardInexistente.test.tsx`: mock ganha
  `buscarAtividades: vi.fn(),` e o `beforeEach` `mockResolvedValue([])`.
- [ ] **RED** → exit 1.
- [ ] **Implementar** — `DashboardPage.tsx`: importar `FeedAtividades` e `useAtividades`;
  logo depois de `const grupos = useGruposComTarefas(boardId)`:

```tsx
  // Chamado ANTES do early return de board inexistente — ordem de hooks fixa.
  const atividades = useAtividades(boardId, 10)
```

  e, depois do `const estado = estadoDaQuery(...)` das métricas:

```tsx
  const estadoAtividades = estadoDaQuery(
    atividades,
    { titulo: 'Nenhuma atividade ainda', descricao: 'Criar tarefas, mudar status e comentar aparece aqui.' },
    () => void atividades.refetch(),
  )
```

  e, dentro do `<BoardShell>`, **depois** do `</StateView>` das métricas (fora dele — o card
  não depende de haver tarefas):

```tsx
      <section
        aria-labelledby="titulo-atividades"
        className="mt-margin rounded-md border border-border bg-surface p-space-md"
      >
        <h2 id="titulo-atividades" className="mb-space-md text-title text-ink">
          Atividades recentes
        </h2>
        <StateView estado={estadoAtividades}>
          <FeedAtividades atividades={atividades.data ?? []} />
        </StateView>
      </section>
```

- [ ] **GREEN** na suíte inteira; tsc; lint. **Commit** `feat(dashboard): card de atividades recentes do board`.

---

### Task 6: Documentação

- [ ] `docs/components.md`, Tabela 2: `EmConstrucaoPage` → "4 rotas … (Modelos, Notificações,
  Ajuda, Configurações)"; linha nova `| \`FeedAtividades\` | Badge | lista de eventos — /atividades e card do Dashboard |`.
- [ ] `docs/progresso.md`: seção "Sub-projeto 4/6 — Feed de Atividades ✅" (formato das anteriores;
  cortados: tempo real, paginação, filtro, eventos de outros campos).
- [ ] `docs/data-model.md`: tabela de migrations — `0004_activities` "aplicada e verificada";
  "10 tabelas" → "11"; índices ganha `activities (board_id, created_at desc)`. **Stage só os
  próprios trechos** (a edição do usuário com ids reais continua fora — filtrar o hunk com
  `73492e36`, como nos commits anteriores).
- [ ] `docs/specs.md`, "Fora de escopo": a linha "Feed de atividades no dashboard" deixa de ser
  corte — trocar por nota "entregue no sub-projeto 4 (2026-09-28), ver spec"; `docs/specs.md`
  também não pode mais dizer que nenhuma tabela registra log.
- [ ] Commit `docs: registra o feed de atividades`.

---

### Task 7: Fase 6 + verify + navegador

- [ ] `npm run dup` e `npm run dead` isolados (logs lidos).
- [ ] `/ponytail-review` sobre `git diff <commit do plano>..HEAD -- src/`; `/ponytail-debt`.
- [ ] `npm run arch`; §8.4 (componentes novos no `components.md`; `specs.md` coerente).
- [ ] `npm run verify` → 0, log lido.
- [ ] Navegador, conta C: criar tarefa no board → evento no card do Dashboard e em `/atividades`
  (com o nome do board como link); mudar status para Pronto → "concluiu"; comentar → trecho;
  `/atividades` com a conta C mostra só eventos do workspace de C. Encerrar o servidor (porta 5173).
- [ ] `graphify update .`; resumo; próximo: sub-projeto 5 (Modelos).

---

## Self-Review

**Cobertura do spec:** eventos e onde (T4, T5), sem tempo real (nenhuma task de realtime),
limites 50/10 (T4, T5), texto por kind com os 3 ramos de status e ator nulo (T2), ícones (T3),
invalidação ao mudar tarefa/criar/comentar (T1), card fora do estado das métricas (T5),
docs incluindo `specs.md` (T6), verificação da migration (T0).

**Consistência:** `buscarAtividades({ boardId, limite })`, `useAtividades(boardId, limite)`,
`descreverAtividade` → `{ icone, ator, antes, depois, status, trecho }`, `IconeAtividade`,
`FeedAtividades({ atividades, mostrarBoard })` iguais em T1–T5. Textos de vazio iguais em T4 e T5.
