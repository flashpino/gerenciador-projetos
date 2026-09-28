# Favoritos (sub-projeto 3/6)

**Data:** 2026-09-28 · **Status:** design aprovado em conversa
**Origem:** `docs/superpowers/specs/2026-09-17-casca-sidebar-design.md` — "Estrela de
favorito funcional" é do sub-projeto 3. Hoje o `BoardShell` tem o botão
"Favoritar — em breve" desabilitado e `/favoritos` é `EmConstrucaoPage`.
Referência visual: Stitch `quadro_de_projetos_tabela_principal` (estrela "Favoritar
quadro" ao lado do título; item "Favoritos" na navegação).

## Escopo

- Favoritar/desfavoritar um board — no título do board (`BoardShell`) e no card de
  Meus Painéis (`BoardCard`).
- `/favoritos` lista os boards favoritados.
- Favorito é **por pessoa**: o workspace é compartilhado, então uma coluna em `boards`
  faria o favorito de um valer para todos.

**Fora de escopo:** atalhos de favoritos na Sidebar, ordenar favoritos, favoritar
tarefas.

## Dados — Zona Vermelha

Migration nova `supabase/migrations/0003_board_favorites.{up,down}.sql`. **O agente
escreve; o humano revisa e aplica.** Nada do frontend é implementado antes de a
migration estar no ar.

```sql
create table board_favorites (
  user_id    uuid not null references profiles(id) on delete cascade,
  board_id   uuid not null references boards(id)   on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, board_id)
);
-- A cascata de "excluir board" busca por board_id; a PK começa por user_id e não serve.
create index board_favorites_board_id on board_favorites (board_id);

alter table board_favorites enable row level security;

create policy board_favorites_select on board_favorites for select to authenticated
  using (user_id = (select auth.uid()));
create policy board_favorites_insert on board_favorites for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from boards b where b.id = board_id and is_workspace_member(b.workspace_id)));
create policy board_favorites_delete on board_favorites for delete to authenticated
  using (user_id = (select auth.uid()));
```

- **Sem policy de update:** favorito liga/desliga, não se edita.
- **insert exige ser membro do workspace do board** — sem isso daria para favoritar o id
  de um board alheio.
- **PK `(user_id, board_id)`** impede favorito duplicado e já serve "meus favoritos".
- `down`: `drop table board_favorites;` (policies e índice vão junto).
- **Teste de isolamento** (SQL, mesmo formato de `docs/data-model.md`, em transação com
  `rollback`): A favorita um board dele; B não vê o favorito de A; B não consegue inserir
  favorito com `user_id` de A; A não consegue favoritar um board do workspace de B;
  delete de B no favorito de A atinge 0 linhas.
- `docs/data-model.md` ganha a tabela (10 tabelas, 10 RLS) e o índice.

## Frontend

**Serviço (`src/services/boards.ts`):**

| Função | O quê |
|---|---|
| `buscarFavoritos(): Promise<string[]>` | ids dos boards favoritados pela pessoa (RLS filtra) |
| `favoritar(userId, boardId): Promise<void>` | insert |
| `desfavoritar(userId, boardId): Promise<void>` | delete por `user_id` + `board_id` |

`userId` vem de `useSessao()` no componente — mesmo padrão de `criarComentario`.

**Hooks (`src/hooks/useQuadro.ts`):** `useFavoritos()` (chave `['favoritos']`) e
`useAlternarFavorito()` → `mutate({ boardId, favorito: boolean })`. **Update otimista**:
é um clique de alternância, como a edição de célula da F1 — a estrela muda na hora e
volta se o servidor falhar (`onMutate`/`onError`/`onSettled`, padrão de `useAtualizarTarefa`).

Query separada em vez de embutir `board_favorites` no select de boards: a estrela tem
cache própria e o otimismo não mexe na lista de boards.

**Componentes:**

| Componente | Onde | Detalhe |
|---|---|---|
| `features/FavoritoToggle` (novo) | `BoardShell` (substitui "Favoritar — em breve") e `BoardCard` (ao lado do "⋮") | `FavoritoToggle({ boardId, nome })` — **autossuficiente**: lê `useFavoritos()`, `useSessao()` e chama `useAlternarFavorito()` sozinho; quem o usa só passa id e nome. `<button aria-pressed>` com `aria-label` "Favoritar {nome}"; ícone `Star` preenchido quando ativo. Consequência: testes de `BoardShell`/`BoardCard` passam a precisar do wrapper de query e do mock de `buscarFavoritos` |
| `pages/PaineisPage` | ganha prop `filtro: 'todos' \| 'favoritos'` (padrão `'todos'`) | `/favoritos` monta `<PaineisPage filtro="favoritos" />`: título "Favoritos", grid filtrado pelos ids favoritados, vazio "Nenhum favorito ainda" com link para Meus Painéis |

`/favoritos` é **variante** da `PaineisPage`, não página nova — reusa os modais de
renomear/excluir sem duplicar estado. Nenhum primitivo novo em `ui/` (teto de 12).

`EmConstrucaoPage` passa a servir 5 rotas.

## Casos de borda

- Excluir um board favoritado: a cascata apaga o favorito; `/favoritos` some com ele na
  próxima leitura (`useExcluirBoard` passa a invalidar também `['favoritos']`).
- Favorito de um board que a pessoa não enxerga mais (saiu do workspace): o id sobra em
  `board_favorites`, mas o cruzamento com `useBoards()` o descarta — não aparece.
- Falha ao alternar: a estrela volta e o erro é anunciado (`role="alert"`), como no
  kanban (F2.4).

## Testes

- `FavoritoToggle.test.tsx`: `aria-pressed` reflete o estado; clique alterna; nome
  acessível com o nome do board.
- `useQuadro.test.tsx`: `useAlternarFavorito` aplica na hora e desfaz quando o servidor
  falha.
- `PaineisPage.test.tsx`: variante `favoritos` lista só os favoritos e tem estado vazio
  próprio.
- `BoardShell.test.tsx`: estrela deixa de ser "— em breve" desabilitada.
- `a11y.test.tsx`: caso da página de favoritos.
- Gate: `npm run verify` verde; checagem no navegador com a conta C.

## Ordem

1. Migration + teste de isolamento → **parada para revisão e aplicação humana**.
2. Serviço/hooks → `FavoritoToggle` → `BoardShell`/`BoardCard` → variante da `PaineisPage` + rota.
3. Docs (`components.md`, `progresso.md`, `data-model.md`), Fase 6 do manual, verify, navegador.
