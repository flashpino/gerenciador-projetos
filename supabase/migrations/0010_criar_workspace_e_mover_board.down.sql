-- =============================================================================
-- Reversao de 0010_criar_workspace_e_mover_board.up.sql
--
-- Volta o SELECT de workspaces a "só membro" (criar workspace volta a falhar)
-- e tira a trava de mover painel (qualquer membro volta a poder trocar o
-- workspace_id pela API). Não apaga dado.
-- =============================================================================

drop trigger boards_so_dono_move on boards;
drop function so_dono_move_board();

drop policy workspaces_select on workspaces;

create policy workspaces_select on workspaces for select to authenticated
  using (is_workspace_member(id));
