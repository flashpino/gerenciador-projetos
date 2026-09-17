# Casca do app — Sidebar + Barra Superior (item 1 da auditoria Stitch)

**Data:** 2026-09-17 · **Status:** aprovado, aguardando plano de implementação
**Origem:** `docs/auditoria-stitch.md`, Parte 2 e Parte 6 item 1 — a sidebar contratada
em `docs/responsive.md:38-40` e os tokens `--color-sidebar-*` (`tokens.css:65-68`)
nunca foram usados por nenhum componente.

## Escopo

Primeiro de 6 sub-projetos decompostos a partir do item 1 (decisão do usuário: reabrir
os cortes de `specs.md` para múltiplos boards, favoritos, atividades e modelos — ver
histórico da conversa). Ordem acordada:

```
1. Casca (este documento)  →  2. Múltiplos boards  →  3. Favoritos
→  4. Feed de Atividades  →  5. Modelos  →  6. Convidar Integrantes
```

Cada um vira seu próprio spec → plano → implementação. Este documento cobre **só o
container** — sidebar, barra superior desabilitada, e as 7 rotas "em construção" que
os sub-projetos seguintes (mais Notificações/Ajuda/Configurações, que não têm
sub-projeto próprio) vão preencher.

**Fora de escopo aqui, com dono definido:**

| Item do Stitch | Fica pra quando |
|---|---|
| "+ Novo Painel" funcional | Sub-projeto 2 (múltiplos boards) |
| Estrela de favorito funcional | Sub-projeto 3 (favoritos) |
| Conteúdo de Meus Painéis/Atividades/Modelos | Sub-projetos 2, 4, 5 |
| "Convidar Integrantes" funcional | Sub-projeto 6 |
| Busca e filtro (barra superior e por-board) | Item 7 da lista original da auditoria, fila separada |
| "Novo Item" acessível de toda view | Item 4 da lista original da auditoria |
| Notificações/Ajuda/Configurações — conteúdo | Sem sub-projeto ainda; só a rota "em construção" nasce aqui |

## Arquitetura

```
App.tsx
  RotaProtegida (já existe)
    AppShell (novo, features/)         ← embrulha TODA rota autenticada
      Sidebar (novo, features/)         ← persistente, não recria por rota
      <Outlet/>                          ← BoardPage/KanbanPage/GanttPage/
                                             DashboardPage (cada um com seu
                                             BoardShell, inalterado na função)
                                             + as 7 páginas EmConstrucaoPage
```

`BoardShell` não se funde com `AppShell` — continua sendo o cabeçalho+abas das
4 views do board, só ele. `AppShell` não sabe nada de board; é puramente o
container de navegação do workspace.

## Componentes novos

| Componente | Onde | Compõe | Responsabilidade |
|---|---|---|---|
| `AppShell` | `features/` | `Sidebar` | Layout: sidebar fixa + área de conteúdo (`<Outlet/>`) |
| `Sidebar` | `features/` | `Avatar`, `Button`, `Modal` (variante `drawer`) | Identidade do workspace, nav, rodapé — ver detalhe abaixo |
| `EmConstrucaoPage` | `features/` | `StateView` (estado `vazio`) | Uma página, montada em 7 rotas com título diferente via prop |

Nenhum primitivo novo em `components/ui/` — o teto de 12 (`docs/components.md`)
já está no limite. O drawer mobile é uma **variante** do `Modal` existente.

### `Sidebar` — conteúdo, de cima para baixo

1. Nome do workspace (`useWorkspaceAtual()`, texto, não é link — v1 tem um workspace
   só, não há para onde trocar).
2. "+ Novo Painel" — `Button` desabilitado, `aria-label="Criar novo painel — em breve"`.
3. Nav (`<nav>` + `<Link>` reais, `aria-current="page"` no ativo — mesmo padrão de
   acessibilidade que `Tabs.tsx` já usa para item com `href`, não o componente
   `Tabs` em si, que é para abas horizontais, não nav vertical):
   - Meus Painéis → `/paineis`
   - Favoritos → `/favoritos`
   - Atividades → `/atividades`
   - Modelos → `/modelos`
4. Rodapé:
   - Notificações → `/notificacoes`
   - Ajuda → `/ajuda`
   - Configurações → `/configuracoes`
   - Avatar + nome do usuário — **sem query nova**: `useMembros()` já traz todos os
     membros do workspace (inclusive o próprio usuário); filtra por
     `usuario.id` de `useSessao()`.
   - Botão "Sair" — **move para cá**, saindo do cabeçalho do `BoardShell`
     (hoje duplicaria; no Stitch é rodapé de sidebar, não cabeçalho de board).

### Dado novo

```ts
// src/services/boards.ts — uma função a mais, mesmo arquivo (uma função só
// não justifica services/workspaces.ts ainda; regra dos três).
export async function buscarWorkspaceAtual(): Promise<{ id: string; name: string }>
```

```ts
// src/hooks/useQuadro.ts — mesmo padrão de useBoardAtual
export function useWorkspaceAtual() {
  return useQuery({ queryKey: ['workspace'], queryFn: buscarWorkspaceAtual })
}
```

Sem migration: `workspaces` já existe, RLS já cobre leitura por membro
(`0001_init.up.sql`). Nome do workspace enquanto carrega: `?? 'Workspace'`,
mesmo padrão de fallback que `board.data?.name ?? 'Quadro'` já usa em toda página —
não precisa de `StateView` para um texto de cabeçalho.

## Responsivo (contrato já escrito, `docs/responsive.md:38-40`)

| Largura | Comportamento |
|---|---|
| 375 | `Sidebar` vira drawer sobre o conteúdo — `Modal` com `size="drawer"` novo. Aberto por botão com `aria-expanded`, fecha em `Esc`/clique fora/navegação, foco preso — tudo de graça do `<dialog>` que o `Modal` já usa |
| 768 | Rail de ícones, 64px, rótulo em `title` nativo (mesma decisão já registrada em `docs/components.md` para não criar um primitivo `Tooltip`) |
| 1440 | Completa, 240px, ícone + rótulo |

### `Modal` — variante `drawer`

```ts
type Tamanho = 'md' | 'lg' | 'full' | 'drawer'
const TAMANHOS: Record<Tamanho, string> = {
  ...,
  drawer: 'fixed inset-y-0 left-0 m-0 h-dvh w-[min(20rem,85vw)] max-w-none rounded-none',
}
```

Mesmo componente, mesmo trap de foco/Esc/retorno de foco (`docs/components.md` #9)
— só a classe de posicionamento muda. `docs/components.md` Tabela 1 ganha
`drawer` na coluna Variantes do `Modal`.

## Barra superior do board (`BoardShell`)

**Perde** o botão "Sair" (move para o rodapé da `Sidebar`, seção acima — não
fica duplicado). **Ganha** os ícones do Stitch, todos desabilitados por
enquanto: estrela (favorito), busca, filtro, "Convidar", "Novo Item". Cada
`Button iconOnly` com `disabled` e `aria-label` explicando o motivo (ex.:
`"Favoritar — em breve"`). Reusa o primitivo `Button` existente, variante
`ghost`, nada novo.

## Testes (TDD)

- `Sidebar.test.tsx`: nav com `aria-current` no item ativo; drawer fechado por
  padrão, abre no trigger, `Esc` fecha (mesmo padrão de teste que `Modal.test.tsx`
  já cobre para o dialog em si — aqui testa a integração, não reimplementa o
  trap de foco).
- `AppShell.test.tsx`: renderiza `Sidebar` + conteúdo filho.
- `EmConstrucaoPage.test.tsx`: título recebido aparece, estado vazio do
  `StateView` presente.
- `useWorkspaceAtual`: mesmo padrão de teste que `useBoardAtual` já tem
  (`useQuadro.test.tsx`).
- `BoardShell.test.tsx` (existente): novo teste cobrindo que os ícones
  desabilitados têm `aria-label` e `disabled`.

## docs/components.md e docs/responsive.md

Depois de implementado: `components.md` Tabela 2 ganha `AppShell`, `Sidebar`,
`EmConstrucaoPage`; Tabela 1 ganha `drawer` nas variantes do `Modal`.
`responsive.md` não muda — a implementação só passa a cumprir o que já está
escrito lá.
