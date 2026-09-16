-- =============================================================================
-- Reversao de 0002_advisors.up.sql
--
-- Restaura exatamente as policies e privilegios como o 0001 os deixou.
--
-- NAO apaga dado: este par de migrations so mexe em policy, privilegio e
-- search_path. Reverter devolve os WARN dos advisors, nao perde linha nenhuma.
-- (O 0001_init.down.sql NAO serve para isto: aquele dropa as 9 tabelas.)
-- =============================================================================

drop policy profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from workspace_members m
      where m.user_id = profiles.id and is_workspace_member(m.workspace_id)
    )
  );

drop policy profiles_update on profiles;
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy workspaces_insert on workspaces;
create policy workspaces_insert on workspaces for insert to authenticated
  with check (owner_id = auth.uid());

drop policy workspaces_update on workspaces;
create policy workspaces_update on workspaces for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy workspaces_delete on workspaces;
create policy workspaces_delete on workspaces for delete to authenticated
  using (owner_id = auth.uid());

drop policy comments_insert on comments;
create policy comments_insert on comments for insert to authenticated
  with check (author_id = auth.uid() and exists (
    select 1 from tasks t join boards b on b.id = t.board_id
    where t.id = task_id and is_workspace_member(b.workspace_id)));

drop policy comments_update on comments;
create policy comments_update on comments for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy comments_delete on comments;
create policy comments_delete on comments for delete to authenticated
  using (author_id = auth.uid());

drop policy ws_members_insert on workspace_members;
drop policy ws_members_update on workspace_members;
drop policy ws_members_delete on workspace_members;
create policy ws_members_write on workspace_members for all to authenticated
  using (exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));

alter function set_updated_at() reset search_path;

grant execute on function handle_new_user() to public, anon, authenticated;
grant execute on function is_workspace_member(uuid) to public, anon;
