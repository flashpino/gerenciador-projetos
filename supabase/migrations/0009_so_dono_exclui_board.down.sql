-- =============================================================================
-- Reversao de 0009_so_dono_exclui_board.up.sql
--
-- Volta a regra antiga: qualquer membro do workspace (convidado incluso) pode
-- tudo em boards, inclusive excluir. Não apaga dado.
-- =============================================================================

drop policy boards_delete on boards;
drop policy boards_update on boards;
drop policy boards_insert on boards;
drop policy boards_select on boards;

create policy boards_all on boards for all to authenticated
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));
