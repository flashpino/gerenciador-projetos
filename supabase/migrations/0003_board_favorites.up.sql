-- =============================================================================
-- 0003 — Favoritos de board, por pessoa
--
-- Spec: docs/superpowers/specs/2026-09-28-favoritos-design.md
--
-- Por que tabela e nao coluna em boards: o workspace e compartilhado. Uma
-- coluna `is_favorite` faria o favorito de uma pessoa valer para todas.
--
-- ZONA VERMELHA: escrito pelo agente, revisado e aplicado por humano.
-- Reverter: 0003_board_favorites.down.sql
-- =============================================================================

create table board_favorites (
  user_id    uuid not null references profiles(id) on delete cascade,
  board_id   uuid not null references boards(id)   on delete cascade,
  created_at timestamptz not null default now(),
  -- Impede favorito duplicado e ja serve a query "meus favoritos" (por user_id).
  primary key (user_id, board_id)
);

-- A cascata de "excluir board" procura por board_id; a PK comeca por user_id
-- e nao serve para isso. Indice com query real por tras, nao por precaucao.
create index board_favorites_board_id on board_favorites (board_id);

-- Nenhuma tabela sem RLS. Sem excecao.
alter table board_favorites enable row level security;

-- Cada pessoa so enxerga os proprios favoritos.
create policy board_favorites_select on board_favorites for select to authenticated
  using (user_id = (select auth.uid()));

-- So favorita em nome proprio, e so board de workspace do qual e membro —
-- sem o `exists`, daria para favoritar o id de um board alheio.
create policy board_favorites_insert on board_favorites for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from boards b where b.id = board_id and is_workspace_member(b.workspace_id)));

create policy board_favorites_delete on board_favorites for delete to authenticated
  using (user_id = (select auth.uid()));

-- Sem policy de update, de proposito: favorito liga/desliga, nao se edita.
