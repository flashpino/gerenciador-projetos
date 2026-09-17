# Casca do App — Sidebar + Barra Superior — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a casca do app (sidebar responsiva + barra superior do board) contratada em `docs/responsive.md` e nunca implementada, conforme `docs/superpowers/specs/2026-09-17-casca-sidebar-design.md`.

**Architecture:** `AppShell` (novo) embrulha toda rota autenticada com uma `Sidebar` (novo) persistente; `BoardShell` continua só para as 4 views do board. Drawer mobile reusa `Modal` com uma variante `drawer` nova (nenhum 13º primitivo). 7 rotas novas "em construção" compartilham um único componente `EmConstrucaoPage`.

**Tech Stack:** React 19, TypeScript strict, React Router v7, TanStack Query, Tailwind v4, Vitest + RTL, lucide-react (ícones importados individualmente).

## Global Constraints

- Zero valor hardcoded de cor/espaço/fonte — só tokens de `src/styles/tokens.css`.
- Ícones importados individualmente de `lucide-react`, nunca por namespace.
- Consulta por `getByRole`/`getByLabelText`/`getByText` nos testes — nunca por classe CSS.
- `renderHook` (se precisar) vem de `@testing-library/react`.
- Nenhum componente novo em `src/components/ui/` — teto de 12 primitivos já atingido (`docs/components.md`). Toda extensão é variante de primitivo existente.
- `npm run verify` tem que passar (lint zero warnings, build, testes com cobertura, dup, dead, arch, contrast) antes do commit final.
- Mostrar o diff antes de cada commit (regra do usuário).

---

### Task 1: `Modal` ganha a variante `drawer` + fecha ao clicar fora

**Files:**
- Modify: `src/components/ui/Modal.tsx`
- Modify: `src/components/ui/Modal.test.tsx`

**Interfaces:**
- Consumes: nada de outra task.
- Produces: `Modal` aceita `size="drawer"` (além de `md`/`lg`/`full` já existentes) e fecha sozinho quando o clique acontece fora do conteúdo (`e.target === dialogElement`). Task 5 (`Sidebar`) usa `<Modal size="drawer" open={aberto} onClose={...} title={...}>`.

- [ ] **Step 1: Escrever os dois testes que falham**

Abra `src/components/ui/Modal.test.tsx` e adicione, dentro do `describe('Modal', ...)` já existente, dois testes novos e o import de `fireEvent`:

```tsx
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
```

(troque a linha de import existente `import { render, screen, waitFor, within } from '@testing-library/react'` por essa, acrescentando `fireEvent`.)

```tsx
  it('size="drawer" renderiza normalmente, ocupando a lateral', () => {
    render(
      <Modal open size="drawer" title="Menu" onClose={vi.fn()}>
        <p>conteudo do menu</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument()
    expect(screen.getByText('conteudo do menu')).toBeInTheDocument()
  })

  it('clique fora do conteúdo (no backdrop) fecha e devolve o foco à origem', async () => {
    const user = userEvent.setup()

    function Cenario() {
      const [aberto, setAberto] = useState(false)
      return (
        <>
          <button onClick={() => setAberto(true)}>Abrir menu</button>
          <Modal open={aberto} size="drawer" title="Menu" onClose={() => setAberto(false)}>
            <p>conteudo</p>
          </Modal>
        </>
      )
    }

    render(<Cenario />)
    await user.click(screen.getByRole('button', { name: 'Abrir menu' }))
    const dialog = await screen.findByRole('dialog')

    // Clicar no próprio elemento <dialog> (não em um descendente) é
    // exatamente o que acontece quando o clique cai no backdrop nativo —
    // é o padrão documentado pela MDN pra detectar clique fora.
    fireEvent.click(dialog)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveFocus())
  })
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/components/ui/Modal.test.tsx`
Expected: FAIL — `size="drawer"` não existe no tipo `Tamanho`, e nada fecha no clique no backdrop.

- [ ] **Step 3: Implementar `size="drawer"` e o fechamento por clique fora**

Substitua o conteúdo de `src/components/ui/Modal.tsx` por:

```tsx
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

type Tamanho = 'md' | 'lg' | 'full' | 'drawer'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: Tamanho
}

const TAMANHOS: Record<Tamanho, string> = {
  md: 'w-[min(28rem,calc(100vw-2rem))]',
  lg: 'w-[min(42rem,calc(100vw-2rem))]',
  full: 'h-[calc(100vh-2rem)] w-[calc(100vw-2rem)]',
  // Ocupa a lateral inteira — usado pelo drawer de navegação em 375px
  // (docs/responsive.md:38, docs/superpowers/specs/2026-09-17-casca-
  // sidebar-design.md). Mesmo <dialog>, trap de foco e Esc de graça; só a
  // posição/tamanho mudam.
  drawer: 'fixed inset-y-0 left-0 m-0 flex h-dvh w-[min(20rem,85vw)] max-w-none flex-col rounded-none',
}

// O conteúdo do drawer precisa preencher a altura toda, não ficar limitado
// a 70vh como os tamanhos centralizados (md/lg/full mantêm o comportamento
// de sempre — isto só adiciona um caso, não muda os outros três).
const ALTURA_CONTEUDO: Partial<Record<Tamanho, string>> = {
  drawer: 'flex-1 overflow-y-auto p-space-lg',
}

/**
 * `<dialog>` nativo (docs/components.md #9): trap de foco, Esc e camada
 * superior vem de graca do navegador. Devolver o foco a origem e a UNICA
 * parte manual (F5.1) — guardamos o elemento ativo no instante em que o
 * modal abre e focamos ele de volta quando o evento `close` dispara, seja
 * por Esc, pelo botao "Fechar", por clique fora ou por uma chamada a
 * close() vinda de fora.
 */
export function Modal({ open, onClose, title, children, footer, size = 'md' }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const origemRef = useRef<HTMLElement | null>(null)
  const idTitulo = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      origemRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const aoFecharNativo = () => {
      onClose()
      origemRef.current?.focus()
    }
    dialog.addEventListener('close', aoFecharNativo)
    return () => dialog.removeEventListener('close', aoFecharNativo)
  }, [onClose])

  // Clique no backdrop nativo chega como clique no próprio <dialog> (não
  // num descendente) — o ::backdrop não é um nó do DOM. Padrão documentado
  // pela MDN. Atachado uma vez só; um dialog fechado não recebe clique.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const aoClicarFora = (e: MouseEvent) => {
      if (e.target === dialog) dialog.close()
    }
    dialog.addEventListener('click', aoClicarFora)
    return () => dialog.removeEventListener('click', aoClicarFora)
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={idTitulo}
      className={cn(
        'rounded-md border border-border bg-surface p-0 text-ink shadow-overlay backdrop:bg-ink/40',
        TAMANHOS[size],
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-space-lg py-space-md">
        <h2 id={idTitulo} className="text-title">
          {title}
        </h2>
        <button
          type="button"
          aria-label="Fechar"
          onClick={() => dialogRef.current?.close()}
          className="rounded p-space-xs hover:bg-surface-2"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className={ALTURA_CONTEUDO[size] ?? 'max-h-[70vh] overflow-y-auto p-space-lg'}>{children}</div>

      {footer && (
        <div className="flex justify-end gap-space-sm border-t border-border px-space-lg py-space-md">{footer}</div>
      )}
    </dialog>
  )
}
```

- [ ] **Step 4: Rodar os testes de novo**

Run: `npx vitest run src/components/ui/Modal.test.tsx`
Expected: PASS — 6 testes (4 já existentes + 2 novos).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Modal.tsx src/components/ui/Modal.test.tsx
git commit -m "feat(modal): adiciona variante drawer e fecha ao clicar fora

Preparação pro drawer de navegação mobile (docs/superpowers/specs/
2026-09-17-casca-sidebar-design.md). Fechar no clique fora é
comportamento genérico do Modal — passa a valer também pro TaskModal,
consistente com o Esc que já fecha sem confirmação."
```

---

### Task 2: `buscarWorkspaceAtual` no serviço de boards

**Files:**
- Modify: `src/services/boards.ts`

**Interfaces:**
- Consumes: `supabase` de `@/lib/supabase`, `traduzirErro` de `./erros` (já importados no arquivo).
- Produces: `buscarWorkspaceAtual(): Promise<{ id: string; name: string }>`, usado pela Task 3.

Sem teste isolado aqui: `services/boards.ts` não tem teste próprio no projeto (0% de cobertura documentado no `vite.config.ts`) — a cobertura vem de quem consome via hook, mockando o serviço. Mesmo padrão de `buscarBoardAtual`.

- [ ] **Step 1: Adicionar a função**

Em `src/services/boards.ts`, logo depois de `buscarBoardAtual` (depois da linha `}` que fecha essa função, antes de `buscarGruposComTarefas`), adicione:

```ts
/**
 * Workspace do usuario. Na v1 ha um workspace e um board por usuario
 * (mesma nota de buscarBoardAtual) — usado pela Sidebar pra mostrar o
 * nome (docs/superpowers/specs/2026-09-17-casca-sidebar-design.md).
 */
export async function buscarWorkspaceAtual(): Promise<{ id: string; name: string }> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('id, name')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (error) throw traduzirErro(error)
  return data
}
```

- [ ] **Step 2: Confirmar que compila**

Run: `npx tsc -b --noEmit`
Expected: sem erro novo relacionado a `boards.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/services/boards.ts
git commit -m "feat(services): adiciona buscarWorkspaceAtual

Lê a tabela workspaces (já existe, RLS já cobre leitura por membro —
0001_init.up.sql). Sem migration."
```

---

### Task 3: `useWorkspaceAtual` no hook de dados

**Files:**
- Modify: `src/hooks/useQuadro.ts`

**Interfaces:**
- Consumes: `buscarWorkspaceAtual` de `@/services/boards` (Task 2).
- Produces: `useWorkspaceAtual()` — `UseQueryResult<{ id: string; name: string }>`, usado pela Task 5 (`Sidebar`).

- [ ] **Step 1: Adicionar o import e a chave de cache**

Em `src/hooks/useQuadro.ts`, no bloco de import do topo, adicione `buscarWorkspaceAtual` à lista já importada de `@/services/boards`:

```ts
import {
  atualizarSubtarefa,
  atualizarTarefa,
  buscarBoardAtual,
  buscarGruposComTarefas,
  buscarMembros,
  buscarTarefaDetalhe,
  buscarWorkspaceAtual,
  criarComentario,
  criarSubtarefa,
  criarTarefa,
  removerSubtarefa,
} from '@/services/boards'
```

No objeto `chaves`, adicione uma entrada:

```ts
const chaves = {
  workspace: ['workspace'] as const,
  board: ['board'] as const,
  membros: ['membros'] as const,
  grupos: (boardId: string) => ['grupos', boardId] as const,
  tarefa: (taskId: string) => ['tarefa', taskId] as const,
}
```

- [ ] **Step 2: Adicionar o hook**

Logo antes de `export function useBoardAtual()`, adicione:

```ts
export function useWorkspaceAtual() {
  return useQuery({ queryKey: chaves.workspace, queryFn: buscarWorkspaceAtual })
}
```

- [ ] **Step 3: Confirmar que compila e a suíte existente continua passando**

Run: `npx vitest run src/hooks/useQuadro.test.tsx`
Expected: PASS — nada quebrou (o mock em `useQuadro.test.tsx` já usa `vi.mock('@/services/boards', () => ({ ... }))` listando funções específicas; como o teste não importa `useWorkspaceAtual`, não precisa mockar `buscarWorkspaceAtual` para esses testes passarem).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useQuadro.ts
git commit -m "feat(hooks): adiciona useWorkspaceAtual

Mesmo padrão de useBoardAtual — useQuery direto sobre o serviço, sem
lógica própria."
```

---

### Task 4: `EmConstrucaoPage` — uma página para as 7 rotas futuras

**Files:**
- Create: `src/components/features/EmConstrucaoPage.tsx`
- Create: `src/components/features/EmConstrucaoPage.test.tsx`

**Interfaces:**
- Consumes: `StateView`, `type Estado` de `@/components/ui/StateView` (já existe).
- Produces: `EmConstrucaoPage({ titulo, descricao }: { titulo: string; descricao: string })`, usado pela Task 7 (rotas em `App.tsx`).

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/components/features/EmConstrucaoPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmConstrucaoPage } from './EmConstrucaoPage'

describe('EmConstrucaoPage', () => {
  it('mostra o título e a descrição recebidos por prop', () => {
    render(<EmConstrucaoPage titulo="Meus Painéis" descricao="Chega no próximo sub-projeto." />)

    expect(screen.getByText('Meus Painéis')).toBeInTheDocument()
    expect(screen.getByText('Chega no próximo sub-projeto.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/components/features/EmConstrucaoPage.test.tsx`
Expected: FAIL — módulo `./EmConstrucaoPage` não existe.

- [ ] **Step 3: Implementar**

Crie `src/components/features/EmConstrucaoPage.tsx`:

```tsx
import { StateView, type Estado } from '@/components/ui/StateView'

interface Props {
  titulo: string
  descricao: string
}

/**
 * Uma página, montada em 7 rotas (Meus Painéis, Favoritos, Atividades,
 * Modelos, Notificações, Ajuda, Configurações — docs/superpowers/specs/
 * 2026-09-17-casca-sidebar-design.md). Cada sub-projeto futuro substitui a
 * sua própria rota por conteúdo real, sem tocar nas outras 6.
 */
export function EmConstrucaoPage({ titulo, descricao }: Props) {
  const estado: Estado = { tipo: 'vazio', titulo, descricao }

  return (
    <div className="mx-auto max-w-canvas p-gutter md:p-margin">
      <StateView estado={estado}>{null}</StateView>
    </div>
  )
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/components/features/EmConstrucaoPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/features/EmConstrucaoPage.tsx src/components/features/EmConstrucaoPage.test.tsx
git commit -m "feat(features): adiciona EmConstrucaoPage

Componente único reusado em 7 rotas — evita 7 arquivos quase idênticos."
```

---

### Task 5: `Sidebar`

**Files:**
- Create: `src/components/features/Sidebar.tsx`
- Create: `src/components/features/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `Avatar`, `Button` (`@/components/ui`), `Modal` com `size="drawer"` (Task 1), `useWorkspaceAtual` (Task 3), `useMembros` (já existe em `@/hooks/useQuadro`), `useSessao` (`@/hooks/useSessao`), `sair` (`@/services/auth`).
- Produces: `Sidebar()` — sem props —, usado pela Task 6 (`AppShell`).

- [ ] **Step 1: Escrever os testes que falham**

Crie `src/components/features/Sidebar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Profile } from '@/types/domain'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarWorkspaceAtual: vi.fn(),
  buscarMembros: vi.fn(),
}))
vi.mock('@/services/auth', () => ({ sair: vi.fn() }))
vi.mock('@/hooks/useSessao', () => ({ useSessao: vi.fn() }))

import * as servicoAuth from '@/services/auth'
import * as servico from '@/services/boards'
import { useSessao } from '@/hooks/useSessao'
import { Sidebar } from './Sidebar'

const MEMBROS: Profile[] = [{ id: 'u1', full_name: 'Ana Lima', avatar_url: null }]

function renderizar(rota = '/') {
  const { wrapper: QueryWrapper } = criarWrapper()
  return render(
    <QueryWrapper>
      <MemoryRouter initialEntries={[rota]}>
        <Sidebar />
      </MemoryRouter>
    </QueryWrapper>,
  )
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(servico.buscarWorkspaceAtual).mockResolvedValue({ id: 'w1', name: 'Meu Workspace' })
    vi.mocked(servico.buscarMembros).mockResolvedValue(MEMBROS)
    vi.mocked(useSessao).mockReturnValue({ usuario: { id: 'u1', email: 'a@x.com' }, carregando: false })
  })

  it('marca o item de nav da rota atual com aria-current', async () => {
    renderizar('/favoritos')
    expect(await screen.findByRole('link', { name: 'Favoritos' })).toHaveAttribute('aria-current', 'page')
  })

  it('não marca os outros itens de nav', async () => {
    renderizar('/favoritos')
    await screen.findByRole('link', { name: 'Favoritos' })
    expect(screen.getByRole('link', { name: 'Meus Painéis' })).not.toHaveAttribute('aria-current')
  })

  it('mostra nome e avatar do próprio usuário no rodapé', async () => {
    renderizar()
    expect(await screen.findByText('Ana Lima')).toBeInTheDocument()
  })

  it('botão Sair chama o serviço de logout', async () => {
    vi.mocked(servicoAuth.sair).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Sair' }))
    expect(servicoAuth.sair).toHaveBeenCalled()
  })

  it('drawer fechado por padrão, abre no gatilho e fecha em Esc', async () => {
    const user = userEvent.setup()
    renderizar()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/components/features/Sidebar.test.tsx`
Expected: FAIL — módulo `./Sidebar` não existe.

- [ ] **Step 3: Implementar**

Crie `src/components/features/Sidebar.tsx`:

```tsx
import { useState, type ComponentType } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Activity,
  Bell,
  HelpCircle,
  LayoutGrid,
  LayoutTemplate,
  LogOut,
  Menu as MenuIcon,
  Plus,
  Settings,
  Star,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'
import { useMembros, useWorkspaceAtual } from '@/hooks/useQuadro'
import { useSessao } from '@/hooks/useSessao'
import { sair } from '@/services/auth'

interface ItemNav {
  href: string
  rotulo: string
  Icone: ComponentType<{ 'aria-hidden'?: boolean | 'true'; className?: string }>
}

const ITENS_NAV: ItemNav[] = [
  { href: '/paineis', rotulo: 'Meus Painéis', Icone: LayoutGrid },
  { href: '/favoritos', rotulo: 'Favoritos', Icone: Star },
  { href: '/atividades', rotulo: 'Atividades', Icone: Activity },
  { href: '/modelos', rotulo: 'Modelos', Icone: LayoutTemplate },
]

const ITENS_RODAPE: ItemNav[] = [
  { href: '/notificacoes', rotulo: 'Notificações', Icone: Bell },
  { href: '/ajuda', rotulo: 'Ajuda', Icone: HelpCircle },
  { href: '/configuracoes', rotulo: 'Configurações', Icone: Settings },
]

/**
 * Casca de navegação do workspace (docs/auditoria-stitch.md item 1,
 * docs/superpowers/specs/2026-09-17-casca-sidebar-design.md). Responsiva
 * conforme docs/responsive.md:38-40 — drawer@375, rail@768 (md), completa
 * a partir de 1024 (lg — mesma aproximação de "1440" que TaskGroup.tsx já
 * usa nas colunas de Prioridade/Progresso, não existe breakpoint 1440
 * exato no Tailwind).
 */
export function Sidebar() {
  const [aberto, setAberto] = useState(false)
  const { pathname } = useLocation()
  const workspace = useWorkspaceAtual()
  const membros = useMembros()
  const { usuario } = useSessao()
  const eu = membros.data?.find((m) => m.id === usuario?.id)

  // rail (md): só ícone, rótulo em sr-only. completa (lg+): rótulo visível.
  // drawer: rótulo sempre visível — se está vendo o drawer, está no mobile.
  function classeRotulo(tipo: 'aside' | 'drawer') {
    return cn('truncate', tipo === 'aside' && 'sr-only lg:not-sr-only')
  }

  function itemDeNav(item: ItemNav, tipo: 'aside' | 'drawer') {
    const ativo = pathname === item.href
    return (
      <Link
        key={item.href}
        to={item.href}
        aria-current={ativo ? 'page' : undefined}
        onClick={() => setAberto(false)}
        title={item.rotulo}
        className={cn(
          'flex min-h-touch items-center gap-space-sm rounded px-space-md text-body',
          ativo ? 'bg-primary-soft font-semibold text-primary' : 'text-sidebar-fg-muted hover:bg-sidebar-hover',
        )}
      >
        <item.Icone aria-hidden="true" className="size-5 shrink-0" />
        <span className={classeRotulo(tipo)}>{item.rotulo}</span>
      </Link>
    )
  }

  function conteudo(tipo: 'aside' | 'drawer') {
    const rotulo = classeRotulo(tipo)
    return (
      <>
        <div className="px-space-md py-space-md">
          <p className={cn('text-title font-semibold text-sidebar-fg', rotulo)}>
            {workspace.data?.name ?? 'Workspace'}
          </p>
        </div>

        <div className="px-space-sm">
          <Button
            variant="primary"
            size="sm"
            className="w-full justify-start"
            iconStart={<Plus aria-hidden="true" className="size-4" />}
            disabled
            aria-label="Criar novo painel — em breve"
          >
            <span className={rotulo}>Novo Painel</span>
          </Button>
        </div>

        <nav aria-label="Navegação do workspace" className="flex flex-col gap-space-xs px-space-sm py-space-md">
          {ITENS_NAV.map((item) => itemDeNav(item, tipo))}
        </nav>

        <div className="mt-auto flex flex-col gap-space-xs border-t border-sidebar-hover px-space-sm py-space-md">
          {ITENS_RODAPE.map((item) => itemDeNav(item, tipo))}

          {eu && (
            <div className="flex items-center gap-space-sm px-space-md py-space-sm">
              <Avatar users={[eu]} size="sm" />
              <span className={cn('text-cell text-sidebar-fg', rotulo)}>{eu.full_name}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => void sair()}
            title="Sair"
            className="flex min-h-touch items-center gap-space-sm rounded px-space-md text-body text-sidebar-fg-muted hover:bg-sidebar-hover"
          >
            <LogOut aria-hidden="true" className="size-5 shrink-0" />
            <span className={rotulo}>Sair</span>
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Gatilho do drawer — a faixa em si é irrelevante em telas largas
          (não custa nada mantê-la simples e sempre presente; a sidebar
          completa/rail ao lado já cobre a navegação nesses tamanhos). */}
      <div className="flex items-center gap-space-sm border-b border-border bg-surface px-space-md py-space-sm md:hidden">
        <button
          type="button"
          aria-expanded={aberto}
          aria-label="Abrir menu"
          onClick={() => setAberto(true)}
          className="grid min-h-touch min-w-touch place-items-center rounded hover:bg-surface-2"
        >
          <MenuIcon aria-hidden="true" className="size-5" />
        </button>
        <span className="truncate text-body font-semibold text-ink">{workspace.data?.name ?? 'Workspace'}</span>
      </div>

      <aside className="hidden shrink-0 flex-col bg-sidebar md:flex md:w-16 lg:w-60">{conteudo('aside')}</aside>

      <Modal size="drawer" open={aberto} onClose={() => setAberto(false)} title={workspace.data?.name ?? 'Workspace'}>
        <div className="flex min-h-full flex-col bg-sidebar">{conteudo('drawer')}</div>
      </Modal>
    </>
  )
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/components/features/Sidebar.test.tsx`
Expected: PASS — 5 testes.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/Sidebar.tsx src/components/features/Sidebar.test.tsx
git commit -m "feat(features): adiciona Sidebar

Identidade do workspace, nav pros 4 itens funcionais futuros + 3 do
rodapé, avatar/nome do próprio usuário (reusa useMembros, sem query
nova), botão Sair (migrado do BoardShell — Task 6 remove de lá). Drawer
mobile usa Modal size=drawer (Task 1)."
```

---

### Task 6: `AppShell`

**Files:**
- Create: `src/components/features/AppShell.tsx`
- Create: `src/components/features/AppShell.test.tsx`

**Interfaces:**
- Consumes: `Sidebar` (Task 5), `Outlet` de `react-router-dom`.
- Produces: `AppShell()` — sem props —, usado pela Task 7 (`App.tsx`) como `element` de uma rota layout.

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/components/features/AppShell.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarWorkspaceAtual: vi.fn().mockResolvedValue({ id: 'w1', name: 'Meu Workspace' }),
  buscarMembros: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/services/auth', () => ({ sair: vi.fn() }))
vi.mock('@/hooks/useSessao', () => ({
  useSessao: () => ({ usuario: { id: 'u1', email: 'a@x.com' }, carregando: false }),
}))

import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('renderiza a sidebar e o conteúdo da rota filha', async () => {
    const { wrapper: QueryWrapper } = criarWrapper()
    render(
      <QueryWrapper>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<p>conteudo da rota</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryWrapper>,
    )

    expect(await screen.findByText('conteudo da rota')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navegação do workspace' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/components/features/AppShell.test.tsx`
Expected: FAIL — módulo `./AppShell` não existe.

- [ ] **Step 3: Implementar**

Crie `src/components/features/AppShell.tsx`:

```tsx
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

/**
 * Container de toda rota autenticada (docs/superpowers/specs/2026-09-17-
 * casca-sidebar-design.md). Não sabe nada de board — BoardShell continua
 * sendo o cabeçalho+abas das 4 views, por dentro do <Outlet/> daqui.
 */
export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/components/features/AppShell.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/features/AppShell.tsx src/components/features/AppShell.test.tsx
git commit -m "feat(features): adiciona AppShell

Layout route com Sidebar persistente + Outlet. Ainda não ligado em
App.tsx (Task 8)."
```

---

### Task 7: `BoardShell` perde o "Sair", ganha os ícones desabilitados

**Files:**
- Modify: `src/components/features/BoardShell.tsx`
- Modify: `src/components/features/BoardShell.test.tsx`

**Interfaces:**
- Consumes: `Button` (já importado).
- Produces: nenhuma interface nova — `BoardShell` continua com a mesma assinatura (`{ titulo, children }`).

- [ ] **Step 1: Reescrever o teste (o antigo testava um botão que sai daqui)**

Substitua **todo** o conteúdo de `src/components/features/BoardShell.test.tsx` por:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { BoardShell } from './BoardShell'

describe('BoardShell', () => {
  it('mostra os ícones da barra superior desabilitados, cada um com aria-label explicando o motivo', () => {
    render(
      <MemoryRouter>
        <BoardShell titulo="Tabela Principal">conteudo</BoardShell>
      </MemoryRouter>,
    )

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

  it('não tem mais botão "Sair" — migrou pra Sidebar (Task 5)', () => {
    render(
      <MemoryRouter>
        <BoardShell titulo="Tabela Principal">conteudo</BoardShell>
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/components/features/BoardShell.test.tsx`
Expected: FAIL — os ícones desabilitados ainda não existem (o teste antigo do "Sair" ativo também deixou de bater com o componente atual, que ainda tem "Sair").

- [ ] **Step 3: Implementar**

Substitua **todo** o conteúdo de `src/components/features/BoardShell.tsx` por:

```tsx
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
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/components/features/BoardShell.test.tsx`
Expected: PASS — 2 testes.

- [ ] **Step 5: Rodar a suíte inteira** (BoardShell é usado por BoardPage/KanbanPage/GanttPage/DashboardPage — confirmar que remover o Sair não quebrou nada em quem consome)

Run: `npx vitest run`
Expected: PASS — nenhum outro teste consulta o "Sair" do BoardShell (só existia o teste que acabamos de substituir).

- [ ] **Step 6: Commit**

```bash
git add src/components/features/BoardShell.tsx src/components/features/BoardShell.test.tsx
git commit -m "refactor(board-shell): remove Sair (migrou pra Sidebar), adiciona ícones desabilitados da barra superior

Sem o Sair duplicado entre BoardShell e Sidebar. Ícones ficam
desabilitados até cada sub-projeto/item da auditoria ligar o seu."
```

---

### Task 8: Ligar tudo em `App.tsx` — `AppShell` + 7 rotas novas

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `AppShell` (Task 6), `EmConstrucaoPage` (Task 4).
- Produces: nenhuma interface nova — só roteamento.

Sem teste isolado — `App.tsx` nunca teve teste próprio no projeto; a verificação aqui é rodar a suíte inteira e conferir manualmente as rotas (Step 3).

- [ ] **Step 1: Substituir o arquivo inteiro**

Substitua **todo** o conteúdo de `src/App.tsx` por:

```tsx
import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/features/AppShell'
import { EmConstrucaoPage } from '@/components/features/EmConstrucaoPage'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { RotaProtegida } from '@/components/RotaProtegida'
import { SessaoProvider } from '@/components/SessaoProvider'
import { StateView } from '@/components/ui/StateView'
import BoardPage from '@/pages/BoardPage'
import KanbanPage from '@/pages/KanbanPage'
import LoginPage from '@/pages/LoginPage'
import NaoEncontrada from '@/pages/NaoEncontrada'

// Gantt e Dashboard carregam por rota — nao pesam na primeira tela
// (docs/specs.md, requisito de performance).
const GanttPage = lazy(() => import('@/pages/GanttPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))

const carregandoRota = (
  <StateView estado={{ tipo: 'carregando' }}>
    <></>
  </StateView>
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Interacoes sao curtas e frequentes (docs/specs.md, persona). Meio minuto
      // de dado fresco evita refetch a cada troca de aba sem servir dado velho.
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <SessaoProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RotaProtegida />}>
                <Route element={<AppShell />}>
                  <Route path="/" element={<BoardPage />} />
                  <Route path="/kanban" element={<KanbanPage />} />
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
                  {/* Rotas "em construção" — cada sub-projeto da auditoria
                      (docs/superpowers/specs/2026-09-17-casca-sidebar-design.md)
                      substitui a sua por conteúdo real quando chegar a vez. */}
                  <Route
                    path="/paineis"
                    element={
                      <EmConstrucaoPage
                        titulo="Meus Painéis"
                        descricao="Vários painéis por workspace chegam no próximo sub-projeto."
                      />
                    }
                  />
                  <Route
                    path="/favoritos"
                    element={
                      <EmConstrucaoPage
                        titulo="Favoritos"
                        descricao="Marcar painéis como favoritos chega em breve."
                      />
                    }
                  />
                  <Route
                    path="/atividades"
                    element={
                      <EmConstrucaoPage
                        titulo="Atividades"
                        descricao="O feed de atividades do workspace chega em breve."
                      />
                    }
                  />
                  <Route
                    path="/modelos"
                    element={
                      <EmConstrucaoPage
                        titulo="Modelos"
                        descricao="Criar painéis a partir de modelos chega em breve."
                      />
                    }
                  />
                  <Route
                    path="/notificacoes"
                    element={<EmConstrucaoPage titulo="Notificações" descricao="Central de notificações em construção." />}
                  />
                  <Route
                    path="/ajuda"
                    element={<EmConstrucaoPage titulo="Ajuda" descricao="Central de ajuda em construção." />}
                  />
                  <Route
                    path="/configuracoes"
                    element={<EmConstrucaoPage titulo="Configurações" descricao="Configurações da conta em construção." />}
                  />
                </Route>
              </Route>
              <Route path="*" element={<NaoEncontrada />} />
            </Routes>
          </SessaoProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 2: Rodar a suíte inteira**

Run: `npx vitest run`
Expected: PASS — todos os testes existentes continuam passando (nenhum deles renderiza `<App/>` inteiro; `BoardPage`/`KanbanPage`/etc. são testados isolados, sem depender de `AppShell`).

- [ ] **Step 3: Checar manualmente no navegador**

Run: `npm run dev`, abra `http://localhost:5173`, confirme visualmente:
- Sidebar aparece à esquerda (ou rail de ícones, dependendo da largura da janela).
- Clicar em "Meus Painéis"/"Favoritos"/"Atividades"/"Modelos"/"Notificações"/"Ajuda"/"Configurações" navega pra uma página com o título certo e a descrição de "em construção" (não o texto de estado vazio de tarefas, que é de outras páginas).
- Estreitar a janela abaixo de 768px: sidebar vira a faixa com botão de menu; clicar abre o drawer; `Esc` fecha; clicar fora fecha.
- Botão "Sair" no rodapé da sidebar/drawer funciona.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): liga AppShell + 7 rotas em construção

Sidebar agora embrulha toda rota autenticada. BoardPage/KanbanPage/
GanttPage/DashboardPage inalteradas na função — só passam a renderizar
dentro do AppShell em vez de soltas."
```

---

### Task 9: Atualizar `docs/components.md`

**Files:**
- Modify: `docs/components.md`

**Interfaces:** nenhuma — só documentação.

- [ ] **Step 1: Atualizar a variante do Modal na Tabela 1**

Troque a linha:

```
| 9 | **Modal** | `md` · `lg` · `full` | aberto, fechando | `open`, `onClose`, `title`, `footer` | modal de tarefa, confirmações |
```

por:

```
| 9 | **Modal** | `md` · `lg` · `full` · `drawer` | aberto, fechando | `open`, `onClose`, `title`, `footer` | modal de tarefa, confirmações, drawer de navegação mobile |
```

- [ ] **Step 2: Atualizar a nota do BoardShell na Tabela 2**

Troque a linha:

```
| `BoardShell` | Tabs, Button | todas as 4 views (layout comum + botão "Sair") |
```

por:

```
| `BoardShell` | Tabs, Button | todas as 4 views (layout comum + ícones desabilitados da barra superior — Sair mora na Sidebar) |
```

- [ ] **Step 3: Adicionar as 3 linhas novas na Tabela 2**

Logo antes da linha `| \`AppUpdatePrompt\` | Button | shell (nova versão do PWA) |`, adicione:

```
| `AppShell` | Sidebar | container de toda rota autenticada (docs/superpowers/specs/2026-09-17-casca-sidebar-design.md) |
| `Sidebar` | Avatar, Button, Modal (`drawer`) | identidade do workspace, nav, rodapé — dentro do AppShell |
| `EmConstrucaoPage` | StateView | 7 rotas "em construção" (Meus Painéis, Favoritos, Atividades, Modelos, Notificações, Ajuda, Configurações) |
```

- [ ] **Step 4: Commit**

```bash
git add docs/components.md
git commit -m "docs(components): registra AppShell, Sidebar, EmConstrucaoPage e a variante drawer do Modal"
```

---

### Task 10: Verify final

**Files:** nenhum — só verificação.

- [ ] **Step 1: Rodar a suíte completa com cobertura**

Run: `npm run test:cov`
Expected: exit 0, todos os testes passando, cobertura de statements >= 80%.

- [ ] **Step 2: Rodar o pipeline completo**

Run: `npm run verify`
Expected: exit 0 (lint zero warnings, build, testes+cobertura, dup, dead, arch, contrast).

- [ ] **Step 3: Se `npm run dup` acusar algo novo**

O padrão `itemDeNav`/`conteudo` dentro de `Sidebar.tsx` é local a esse arquivo — não deve gerar clone com outro arquivo. Se `jscpd` acusar duplicação entre `Sidebar.tsx` e outro componente de nav (improvável, mas confira o relatório), avalie antes de prosseguir; não force a unificação sem entender o achado (regra dos três).

- [ ] **Step 4: Mostrar o resumo do que foi feito e o diff consolidado ao usuário antes do próximo passo**

Não commitar nada nesta task — é só verificação. Se tudo passou, a "casca" (sub-projeto 1/6) está pronta; o próximo da fila é "Múltiplos boards" (sub-projeto 2), que precisa do seu próprio brainstorm antes de virar plano.

---

## Self-Review

**Cobertura do spec:** arquitetura (Task 8), Sidebar completa com todos os itens de nav e rodapé (Task 5), variante drawer + fecha fora (Task 1), barra superior do board (Task 7), dado novo sem migration (Tasks 2-3), páginas em construção (Task 4), docs (Task 9). Nenhuma seção do spec ficou sem task.

**Placeholder scan:** nenhum "TBD"/"implementar depois" — todo passo tem código completo.

**Consistência de tipos:** `useWorkspaceAtual()` (Task 3) devolve o mesmo formato `{ id, name }` que `buscarWorkspaceAtual` (Task 2) retorna. `Sidebar` (Task 5) consome exatamente esse formato via `workspace.data?.name`. `ItemNav`/`itemDeNav`/`conteudo` usados de forma consistente dentro do único arquivo que os declara — não vazam pra fora.

**Ajuste em relação ao spec original:** o spec dizia "useWorkspaceAtual: mesmo padrão de teste que useBoardAtual já tem" — na prática `useBoardAtual` **não tem** teste próprio (só é coberto indiretamente via testes de página, mockando o serviço). A Task 3 reflete isso corretamente: sem teste isolado do hook, cobertura vem do `Sidebar.test.tsx` (Task 5), que já mocka `buscarWorkspaceAtual`.
