# Dashboard de Métricas (F4, Bloco A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a view `/dashboard` com os 4 critérios de aceite de F4 (docs/specs.md): taxa de conclusão, contagem de atrasadas, distribuição por status e progresso por grupo — todos derivados das tarefas reais, com alternativa em texto para o que é gráfico, e os quatro estados (loading/erro/vazio/sucesso).

**Architecture:** `DashboardPage` (nova) reusa os hooks já existentes `useBoardAtual`/`useGruposComTarefas` e as 4 funções puras já testadas em `src/lib/metrics.ts`. Três componentes novos em `src/components/features/` (`MetricTile`, `StatusDonut`, `GroupProgressList`) renderizam esses números — nenhum deles fala com o Supabase, nenhum tem hook próprio. Zero schema novo, zero migration.

**Tech Stack:** React 19 + TypeScript strict, TanStack Query (hooks existentes), Tailwind v4 (só tokens de `src/styles/tokens.css`), Vitest + React Testing Library.

## Global Constraints

- Zero valor hardcoded de cor, espaço, raio ou fonte — só tokens de `src/styles/tokens.css` (`CLAUDE.md`).
- Ícones importados individualmente de `lucide-react`, nunca por namespace (`CLAUDE.md`).
- Todo componente que busca dados trata os quatro estados — aqui só `DashboardPage` busca dado; os 3 componentes novos são puros/apresentacionais (`CLAUDE.md`).
- Consulta em teste por `getByRole`/`getByText`/`getByLabelText`, nunca por classe CSS (`CLAUDE.md`).
- Antes de criar cada arquivo novo desta lista, rode `/graphify query "já existe um MetricTile/StatusDonut/GroupProgressList/CORES_STATUS?"` — a resposta esperada é "não", já confirmado durante o brainstorm (`docs/components.md` já reserva os 3 nomes na Tabela 2, sem arquivo ainda), mas o passo continua obrigatório por protocolo de sessão (`CLAUDE.md`, "Protocolo obrigatório de início de sessão").
- Mostre o diff de cada tarefa **antes** de commitar (`CLAUDE.md`, "Como trabalhar comigo").
- Nenhuma tarefa deste plano toca Zona Vermelha (auth, RLS, validação de servidor, migration, cálculo de capacidade) — confirmado na revisão do plano.
- `npm run verify` (lint + typecheck + build + testes com cobertura + jscpd + knip) deve estar verde antes da tarefa final.

---

### Task 1: `CORES_STATUS` em `src/lib/status.ts`

**Files:**
- Modify: `src/lib/status.ts`
- Test: `src/lib/status.test.ts`

**Interfaces:**
- Consumes: `TaskStatus` (de `@/types/domain`), `ORDEM_STATUS` (já existe no próprio arquivo)
- Produces: `export const CORES_STATUS: Record<TaskStatus, string>` — usado pela Task 3 (`StatusDonut`) para colorir os arcos do SVG

- [ ] **Step 1: Escrever o teste que falha**

Adicione ao final de `src/lib/status.test.ts` (arquivo já existe, só acrescente este bloco):

```ts
import { CORES_STATUS, ORDEM_STATUS, PRIORIDADES, STATUS, rotuloPrioridade, rotuloStatus } from './status'

// ... (mantenha os describes existentes, acrescente este no final do arquivo)

describe('CORES_STATUS', () => {
  it('cobre exatamente os 5 valores do enum do banco', () => {
    expect(Object.keys(CORES_STATUS).toSorted()).toEqual(
      ['done', 'not_started', 'review', 'stuck', 'working'],
    )
  })

  it('aponta para variavel CSS, nunca cor literal — mesma fonte unica que STATUS.classe', () => {
    for (const s of ORDEM_STATUS) {
      expect(CORES_STATUS[s]).toMatch(/^var\(--color-status-/)
    }
  })
})
```

Ajuste só a linha de import no topo do arquivo para incluir `CORES_STATUS` (o resto do arquivo não muda).

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/lib/status.test.ts`
Expected: FAIL — `CORES_STATUS` não está exportado por `./status`

- [ ] **Step 3: Implementar o mínimo**

Acrescente ao final de `src/lib/status.ts` (depois de `PRIORIDADES`, antes das funções `rotuloStatus`/`rotuloPrioridade`):

```ts
/**
 * Cor do arco do StatusDonut, por status. Aponta para a MESMA variavel CSS
 * que STATUS[s].classe usa via Tailwind — fonte unica, sem duplicar hex aqui.
 * SVG nao aceita classe Tailwind em `stroke`, so string de cor — por isso
 * este mapa existe separado de STATUS.classe.
 */
export const CORES_STATUS: Record<TaskStatus, string> = {
  not_started: 'var(--color-status-not-started)',
  working: 'var(--color-status-working)',
  review: 'var(--color-status-review)',
  done: 'var(--color-status-done)',
  stuck: 'var(--color-status-stuck)',
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/lib/status.test.ts`
Expected: PASS (todos os testes do arquivo, incluindo os pré-existentes)

- [ ] **Step 5: Mostrar o diff e commitar**

Run: `git diff src/lib/status.ts src/lib/status.test.ts` — mostre ao usuário antes de commitar.

```bash
git add src/lib/status.ts src/lib/status.test.ts
git commit -m "feat(dashboard): CORES_STATUS para o donut do dashboard"
```

---

### Task 2: `MetricTile`

**Files:**
- Create: `src/components/features/MetricTile.tsx`
- Test: `src/components/features/MetricTile.test.tsx`

**Interfaces:**
- Consumes: `Badge` de `@/components/ui/Badge` (props: `tone?: string`, `children`), `ProgressBar` de `@/components/ui/ProgressBar` (props: `value?: number`, `label: string`)
- Produces:
```ts
interface Props {
  titulo: string
  valor: string
  progresso?: number
  atencao?: boolean
}
export function MetricTile(props: Props): JSX.Element
```
Usado pela Task 5 (`DashboardPage`).

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/components/features/MetricTile.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MetricTile } from './MetricTile'

describe('MetricTile', () => {
  it('mostra titulo e valor', () => {
    render(<MetricTile titulo="Taxa de Conclusão" valor="78.4%" />)
    expect(screen.getByText('Taxa de Conclusão')).toBeInTheDocument()
    expect(screen.getByText('78.4%')).toBeInTheDocument()
  })

  it('mostra selo de atencao quando atencao=true', () => {
    render(<MetricTile titulo="Tarefas Atrasadas" valor="3" atencao />)
    expect(screen.getByText('Atenção')).toBeInTheDocument()
  })

  it('nao mostra selo de atencao por padrao', () => {
    render(<MetricTile titulo="Taxa de Conclusão" valor="78.4%" />)
    expect(screen.queryByText('Atenção')).not.toBeInTheDocument()
  })

  it('mostra barra de progresso quando a prop progresso e passada', () => {
    render(<MetricTile titulo="Taxa de Conclusão" valor="78.4%" progresso={78.4} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '78.4')
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/components/features/MetricTile.test.tsx`
Expected: FAIL — Cannot find module './MetricTile'

- [ ] **Step 3: Implementar o mínimo**

Crie `src/components/features/MetricTile.tsx`:

```tsx
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface Props {
  titulo: string
  valor: string
  /** 0 a 100. Quando presente, mostra uma ProgressBar simples sob o valor. */
  progresso?: number
  /** Verdadeiro quando o número pede atenção (ex.: existem tarefas atrasadas). */
  atencao?: boolean
}

/**
 * Um KPI: título + valor grande, com selo opcional de atenção e barra de
 * progresso opcional. docs/components.md, Tabela 2 (Dashboard).
 */
export function MetricTile({ titulo, valor, progresso, atencao }: Props) {
  return (
    <div className="rounded-md border border-border bg-surface p-space-md">
      <div className="flex items-center justify-between gap-space-sm">
        <span className="text-label text-ink-muted">{titulo}</span>
        {atencao && <Badge tone="bg-danger-soft text-danger-ink">Atenção</Badge>}
      </div>
      <p className="mt-space-xs text-display text-ink">{valor}</p>
      {progresso !== undefined && (
        <ProgressBar value={progresso} label={`${titulo}: ${valor}`} className="mt-space-sm" />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/components/features/MetricTile.test.tsx`
Expected: PASS (4 testes)

- [ ] **Step 5: Mostrar o diff e commitar**

Run: `git diff --stat src/components/features/MetricTile.tsx src/components/features/MetricTile.test.tsx` — mostre ao usuário antes de commitar.

```bash
git add src/components/features/MetricTile.tsx src/components/features/MetricTile.test.tsx
git commit -m "feat(dashboard): componente MetricTile"
```

---

### Task 3: `StatusDonut`

**Files:**
- Create: `src/components/features/StatusDonut.tsx`
- Test: `src/components/features/StatusDonut.test.tsx`

**Interfaces:**
- Consumes: `FatiaStatus` de `@/lib/metrics` (`{ status: TaskStatus; quantidade: number; percentual: number }`), `CORES_STATUS` e `STATUS` de `@/lib/status` (Task 1 e já existente)
- Produces:
```ts
interface Props { fatias: FatiaStatus[] }
export function StatusDonut(props: Props): JSX.Element | null
```
Usado pela Task 5 (`DashboardPage`).

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/components/features/StatusDonut.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FatiaStatus } from '@/lib/metrics'
import { StatusDonut } from './StatusDonut'

const fatias: FatiaStatus[] = [
  { status: 'done', quantidade: 2, percentual: 50 },
  { status: 'working', quantidade: 2, percentual: 50 },
]

describe('StatusDonut', () => {
  it('mostra os numeros reais em texto, nao so no grafico (criterio F4.2)', () => {
    render(<StatusDonut fatias={fatias} />)
    expect(screen.getByText('Pronto: 2 (50%)')).toBeInTheDocument()
    expect(screen.getByText('Em andamento: 2 (50%)')).toBeInTheDocument()
  })

  it('o total de tarefas tambem aparece em texto', () => {
    render(<StatusDonut fatias={fatias} />)
    expect(screen.getByText('4 tarefas no total')).toBeInTheDocument()
  })

  it('nao renderiza nada para lista vazia (o StateView do pai ja cobre o vazio)', () => {
    const { container } = render(<StatusDonut fatias={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/components/features/StatusDonut.test.tsx`
Expected: FAIL — Cannot find module './StatusDonut'

- [ ] **Step 3: Implementar o mínimo**

Crie `src/components/features/StatusDonut.tsx`:

```tsx
import { CORES_STATUS, STATUS } from '@/lib/status'
import type { FatiaStatus } from '@/lib/metrics'

interface Props {
  fatias: FatiaStatus[]
}

// r = 100 / (2*pi) faz a circunferencia dar ~100: strokeDasharray usa a
// porcentagem direto, sem calcular o perimetro à parte.
const RAIO = 15.9155

/**
 * Sem lib de grafico (docs/components.md, "Sem gráficos de terceiros"): anel
 * feito com circles de SVG e stroke-dasharray. A legenda ao lado é texto
 * visivel normal — nao sr-only — porque ja e a forma "em texto" que o
 * criterio F4.2 pede, sem duplicar numero escondido.
 */
export function StatusDonut({ fatias }: Props) {
  if (fatias.length === 0) return null

  let acumulado = 0
  const arcos = fatias.map((f) => {
    const offset = -acumulado
    acumulado += f.percentual
    return { ...f, offset }
  })
  const total = fatias.reduce((soma, f) => soma + f.quantidade, 0)

  return (
    <div className="flex items-center gap-space-lg">
      <svg viewBox="0 0 36 36" aria-hidden="true" className="size-36 shrink-0 -rotate-90">
        <circle cx="18" cy="18" r={RAIO} fill="none" stroke="var(--color-surface-3)" strokeWidth="4" />
        {arcos.map((a) => (
          <circle
            key={a.status}
            cx="18"
            cy="18"
            r={RAIO}
            fill="none"
            stroke={CORES_STATUS[a.status]}
            strokeWidth="4"
            strokeDasharray={`${a.percentual} ${100 - a.percentual}`}
            strokeDashoffset={a.offset}
          />
        ))}
      </svg>
      <ul className="flex flex-col gap-space-xs">
        <li className="text-label text-ink-muted">{total} tarefas no total</li>
        {fatias.map((f) => (
          <li key={f.status} className="flex items-center gap-space-sm text-body text-ink">
            <span
              aria-hidden="true"
              className="size-3 rounded-sm"
              style={{ backgroundColor: CORES_STATUS[f.status] }}
            />
            <span>
              {STATUS[f.status].rotulo}: {f.quantidade} ({f.percentual}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/components/features/StatusDonut.test.tsx`
Expected: PASS (3 testes)

- [ ] **Step 5: Mostrar o diff e commitar**

Run: `git diff --stat src/components/features/StatusDonut.tsx src/components/features/StatusDonut.test.tsx` — mostre ao usuário antes de commitar.

```bash
git add src/components/features/StatusDonut.tsx src/components/features/StatusDonut.test.tsx
git commit -m "feat(dashboard): componente StatusDonut, sem lib de grafico"
```

---

### Task 4: `GroupProgressList`

**Files:**
- Create: `src/components/features/GroupProgressList.tsx`
- Test: `src/components/features/GroupProgressList.test.tsx`

**Interfaces:**
- Consumes: `progressoDoGrupo` de `@/lib/metrics` (já existe: `(tarefas: readonly Task[]) => number`), `GroupComTarefas` de `@/types/domain`, `ProgressBar` de `@/components/ui/ProgressBar`
- Produces:
```ts
interface Props { grupos: GroupComTarefas[] }
export function GroupProgressList(props: Props): JSX.Element
```
Usado pela Task 5 (`DashboardPage`).

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/components/features/GroupProgressList.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GroupComTarefas, Task } from '@/types/domain'
import { GroupProgressList } from './GroupProgressList'

function tarefa(progress: number, extra: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(), board_id: 'b', group_id: 'g', title: 't',
    description: null, status: 'working', priority: 'medium', assignee_id: null,
    start_date: null, due_date: null, progress, estimated_hours: null,
    logged_hours: null, is_milestone: false, tags: [], position: 0,
    created_at: '', updated_at: '', ...extra,
  }
}

function grupo(nome: string, progressos: number[]): GroupComTarefas {
  return {
    id: nome, board_id: 'b', name: nome, color: 'azure', position: 0,
    tasks: progressos.map((p) => tarefa(p)),
  }
}

describe('GroupProgressList', () => {
  it('mostra uma linha por grupo com o progresso medio', () => {
    render(<GroupProgressList grupos={[grupo('Backend', [40, 60]), grupo('Frontend', [100])]} />)

    expect(screen.getByText('Backend')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('Frontend')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/components/features/GroupProgressList.test.tsx`
Expected: FAIL — Cannot find module './GroupProgressList'

- [ ] **Step 3: Implementar o mínimo**

Crie `src/components/features/GroupProgressList.tsx`:

```tsx
import { ProgressBar } from '@/components/ui/ProgressBar'
import { progressoDoGrupo } from '@/lib/metrics'
import type { GroupComTarefas } from '@/types/domain'

interface Props {
  grupos: GroupComTarefas[]
}

/** Uma linha por grupo, progresso medio das tarefas dele. docs/components.md, Tabela 2. */
export function GroupProgressList({ grupos }: Props) {
  return (
    <ul className="flex flex-col gap-space-md">
      {grupos.map((g) => {
        const progresso = progressoDoGrupo(g.tasks)
        return (
          <li key={g.id}>
            <div className="mb-space-xs flex items-center justify-between text-body text-ink">
              <span className="font-semibold">{g.name}</span>
              <span className="text-ink-muted">{progresso}%</span>
            </div>
            <ProgressBar value={progresso} label={`Progresso de ${g.name}`} />
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/components/features/GroupProgressList.test.tsx`
Expected: PASS (1 teste)

- [ ] **Step 5: Mostrar o diff e commitar**

Run: `git diff --stat src/components/features/GroupProgressList.tsx src/components/features/GroupProgressList.test.tsx` — mostre ao usuário antes de commitar.

```bash
git add src/components/features/GroupProgressList.tsx src/components/features/GroupProgressList.test.tsx
git commit -m "feat(dashboard): componente GroupProgressList"
```

---

### Task 5: `DashboardPage` + rota `/dashboard`

**Files:**
- Create: `src/pages/DashboardPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/features/BoardShell.tsx`

**Interfaces:**
- Consumes: `useBoardAtual`, `useGruposComTarefas` de `@/hooks/useQuadro` (já existem); `estadoDaQuery` de `@/lib/estadoDaQuery` (já existe); `taxaDeConclusao`, `contarAtrasadas`, `distribuicaoStatus` de `@/lib/metrics` (já existem); `MetricTile` (Task 2), `StatusDonut` (Task 3), `GroupProgressList` (Task 4); `BoardShell`, `StateView`, `Button` (já existem)
- Produces: rota `/dashboard`, nova aba "Dashboard" em `BoardShell`. Não há tarefas depois desta — é a última do plano.

Sem teste de página isolado — mesmo padrão de `BoardPage`/`KanbanPage`/`GanttPage` (nenhuma tem teste próprio; a cobertura vem de `MetricTile`/`StatusDonut`/`GroupProgressList`/`metrics.test.ts`, já escritos). A verificação desta tarefa é manual (rodar `npm run dev` e abrir `/dashboard`) + `npm run build` (typecheck) + `npm run verify` no final.

- [ ] **Step 1: Criar `src/pages/DashboardPage.tsx`**

```tsx
import { BoardShell } from '@/components/features/BoardShell'
import { GroupProgressList } from '@/components/features/GroupProgressList'
import { MetricTile } from '@/components/features/MetricTile'
import { StatusDonut } from '@/components/features/StatusDonut'
import { Button } from '@/components/ui/Button'
import { StateView } from '@/components/ui/StateView'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import { contarAtrasadas, distribuicaoStatus, taxaDeConclusao } from '@/lib/metrics'
import { useBoardAtual, useGruposComTarefas } from '@/hooks/useQuadro'

export default function DashboardPage() {
  const board = useBoardAtual()
  const grupos = useGruposComTarefas(board.data?.id)
  const tarefas = grupos.data?.flatMap((g) => g.tasks)

  // "Vazio" aqui e ZERO TAREFAS, nao zero grupos (diferente de BoardPage/GanttPage) —
  // criterio F4.3 fala de board sem tarefas, e um board pode ter grupos vazios.
  const consultaTarefas = { ...grupos, data: tarefas }
  const estado = estadoDaQuery(
    board.isPending ? { ...consultaTarefas, isPending: true } : consultaTarefas,
    {
      titulo: 'Nenhuma tarefa ainda',
      descricao: 'Crie tarefas no board para ver as métricas aqui.',
      acao: <Button variant="primary">Ver Tabela Principal</Button>,
    },
    () => void grupos.refetch(),
  )

  const conclusao = taxaDeConclusao(tarefas ?? [])
  const atrasadas = contarAtrasadas(tarefas ?? [])

  return (
    <BoardShell titulo={board.data?.name ?? 'Quadro'}>
      <StateView estado={estado}>
        <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
          <MetricTile titulo="Taxa de Conclusão" valor={`${conclusao}%`} progresso={conclusao} />
          <MetricTile titulo="Tarefas Atrasadas" valor={String(atrasadas)} atencao={atrasadas > 0} />
        </div>
        <div className="mt-margin grid grid-cols-1 gap-space-md md:grid-cols-2">
          <div className="rounded-md border border-border bg-surface p-space-md">
            <h2 className="mb-space-md text-title text-ink">Distribuição por Status</h2>
            <StatusDonut fatias={distribuicaoStatus(tarefas ?? [])} />
          </div>
          <div className="rounded-md border border-border bg-surface p-space-md">
            <h2 className="mb-space-md text-title text-ink">Progresso por Grupo</h2>
            <GroupProgressList grupos={grupos.data ?? []} />
          </div>
        </div>
      </StateView>
    </BoardShell>
  )
}
```

- [ ] **Step 2: Adicionar a rota em `src/App.tsx`**

Modifique `src/App.tsx`. Troque a linha do comentário e o lazy import (linha 13-15):

```tsx
// Gantt e Dashboard carregam por rota — nao pesam na primeira tela
// (docs/specs.md, requisito de performance).
const GanttPage = lazy(() => import('@/pages/GanttPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
```

E adicione a rota depois da rota `/gantt` (dentro do bloco `<Route element={<RotaProtegida />}>`, antes do `</Route>` de fechamento):

```tsx
                <Route
                  path="/gantt"
                  element={
                    <Suspense fallback={carregandoRota}>
                      <GanttPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <Suspense fallback={carregandoRota}>
                      <DashboardPage />
                    </Suspense>
                  }
                />
```

- [ ] **Step 3: Adicionar a aba em `src/components/features/BoardShell.tsx`**

Modifique o array `VIEWS` (linhas 14-20), substituindo o comentário reservado:

```tsx
const VIEWS: ItemTab[] = [
  { id: '/', rotulo: 'Tabela Principal', href: '/' },
  { id: '/kanban', rotulo: 'Kanban', href: '/kanban' },
  { id: '/gantt', rotulo: 'Gantt', href: '/gantt' },
  { id: '/dashboard', rotulo: 'Dashboard', href: '/dashboard' },
]
```

- [ ] **Step 4: Verificar manualmente**

Run: `npm run dev`

Abra `http://localhost:5173/dashboard` (ajuste a porta se o Vite escolher outra) e confirme:
- A aba "Dashboard" aparece na navegação e fica marcada como atual.
- Com tarefas reais no board: os 2 `MetricTile`, o donut e a lista de progresso aparecem com números coerentes.
- Critério F4.3: um board/grupo sem nenhuma tarefa mostra o estado vazio ("Nenhuma tarefa ainda"), nunca "0%"/"NaN".

Pare o servidor depois (Ctrl+C).

- [ ] **Step 5: Rodar a suíte inteira e o build**

Run: `npx vitest run`
Expected: PASS — todos os testes, incluindo os das Tasks 1-4

Run: `npm run build`
Expected: exit 0 — typecheck (`tsc --noEmit`) e build de produção passam

- [ ] **Step 6: `npm run verify` completo**

Run: `npm run verify > verify.log 2>&1; echo "EXIT: $?"`

Leia `verify.log` e confirme `EXIT: 0`. **Não leia o exit code de um pipe encanado** (`| head` etc.) — é o erro já documentado em `CLAUDE.md`.

Se `EXIT` não for `0`, corrija antes de prosseguir — não commite com o verify vermelho. `verify.log` é um artefato local — não commitar (acrescente `verify.log` ao `.gitignore` se ainda não estiver lá).

- [ ] **Step 7: Mostrar o diff e commitar**

Run: `git diff --stat src/pages/DashboardPage.tsx src/App.tsx src/components/features/BoardShell.tsx` — mostre ao usuário antes de commitar.

```bash
git add src/pages/DashboardPage.tsx src/App.tsx src/components/features/BoardShell.tsx
git commit -m "feat(dashboard): pagina do dashboard, rota /dashboard e aba no BoardShell (F4 bloco A)"
```

- [ ] **Step 8: Atualizar `docs/progresso.md`**

Marque F4 como concluída (bloco A) na tabela de visão geral e acrescente a seção `## F4 — Dashboard de Métricas` com os 4 critérios testados e o commit desta tarefa, no mesmo padrão das seções F1-F3/F5 já existentes. Registre também, na mesma seção, a nota "Cortado do stitch": feed de atividades, carga de trabalho e filtros de período — apontando para o adendo em `docs/specs.md`.

```bash
git add docs/progresso.md
git commit -m "docs(progresso): F4 bloco A concluida"
```

---

## Depois deste plano

Blocos B (carga de trabalho — Zona Vermelha), C (feed de atividades — schema novo) e D (filtros de período) ficam como specs separados, só quando o usuário decidir investir neles (ver `docs/specs.md`, seção "Fora de escopo da v1").
