-- Volta às policies da 0002.
drop policy ws_members_delete on workspace_members;

create policy ws_members_delete on workspace_members for delete to authenticated
  using (exists (select 1 from workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())));

create policy ws_members_update on workspace_members for update to authenticated
  using (exists (select 1 from workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())))
  with check (exists (select 1 from workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())));
