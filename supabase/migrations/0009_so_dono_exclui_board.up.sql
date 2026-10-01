-- =============================================================================
-- 0009 — Só o DONO do workspace exclui painéis
--
-- `boards_all` (0001) era `for all`: qualquer membro — inclusive convidado —
-- podia excluir um painel inteiro (e o cascade levava grupos, tarefas e
-- comentários). Pedido do usuário (2026-10-01): convidado não exclui.
--
-- Ver, criar e editar continuam para todo membro. Excluir: só o dono.
-- (Excluir o workspace já era só do dono: workspaces_delete, 0002.)
--
-- ZONA VERMELHA: escrito pelo agente, revisado e aplicado por humano.
-- Reverter: 0009_so_dono_exclui_board.down.sql
-- =============================================================================

drop policy boards_all on boards;

create policy boards_select on boards for select to authenticated
  using (is_workspace_member(workspace_id));

create policy boards_insert on boards for insert to authenticated
  with check (is_workspace_member(workspace_id));

create policy boards_update on boards for update to authenticated
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

create policy boards_delete on boards for delete to authenticated
  using (exists (select 1 from workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())));
