-- =============================================================================
-- 0010 — Criar workspace volta a funcionar + mover painel só pelo dono
--
-- 1. BUG: "Novo workspace" falhava sempre (visto no navegador em 2026-10-05:
--    POST workspace_members -> 403, 42501). O app cria o workspace e depois
--    insere o dono como membro. A policy ws_members_insert (0002) confere
--    `exists (select 1 from workspaces w where w.owner_id = eu)` — mas essa
--    subconsulta passa pelo RLS de SELECT de workspaces, que exigia JÁ SER
--    MEMBRO. O dono ainda não é: a subconsulta não vê a linha e o insert é
--    recusado. O 1º workspace de cada conta nunca bateu nisso porque nasce no
--    gatilho handle_new_user (security definer, sem RLS).
--    Correção: o dono sempre enxerga o próprio workspace.
--
-- 2. Mover painel entre workspaces (pedido do usuário, 2026-10-05). A policy
--    boards_update (0009) já deixava QUALQUER membro trocar boards.workspace_id
--    para um workspace dele — um convidado podia levar o painel do dono embora
--    pela API. Agora: trocar o workspace_id exige ser DONO do workspace de
--    ORIGEM (mesma regra de excluir, 0009). O destino continua exigindo ser
--    membro (with check de boards_update). Gatilho, não policy: o WITH CHECK
--    só enxerga a linha nova, não sabe de onde o painel veio.
--
-- ZONA VERMELHA: escrito pelo agente, revisado e aplicado por humano.
-- Reverter: 0010_criar_workspace_e_mover_board.down.sql
-- =============================================================================

-- 1 ---------------------------------------------------------------------------
drop policy workspaces_select on workspaces;

create policy workspaces_select on workspaces for select to authenticated
  using (is_workspace_member(id) or owner_id = (select auth.uid()));

-- 2 ---------------------------------------------------------------------------
create or replace function so_dono_move_board() returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.workspace_id is distinct from old.workspace_id and not exists (
    select 1 from workspaces w
    where w.id = old.workspace_id and w.owner_id = (select auth.uid())
  ) then
    raise exception 'Só o dono do workspace de origem move o painel.'
      using errcode = '42501';
  end if;
  return new;
end;
$fn$;

-- Função de gatilho: ninguém chama direto (mesmo cuidado do 0002, advisors).
revoke execute on function so_dono_move_board() from public, anon, authenticated;

create trigger boards_so_dono_move
  before update of workspace_id on boards
  for each row execute function so_dono_move_board();
