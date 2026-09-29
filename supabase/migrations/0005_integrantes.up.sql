-- 0005 — Convidar integrantes (sub-projeto 6/6).
-- docs/superpowers/specs/2026-09-29-integrantes-design.md
--
-- Achar alguem por e-mail exige ler auth.users, que o cliente nao enxerga. A
-- funcao e security definer por isso — e por isso checa o dono ANTES de tudo.

create or replace function adicionar_membro(p_ws uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  novo uuid;
begin
  if not exists (select 1 from workspaces where id = p_ws and owner_id = auth.uid()) then
    raise exception 'so o dono do workspace adiciona integrantes' using errcode = '42501';
  end if;

  select u.id into novo from auth.users u where lower(u.email) = lower(trim(p_email));
  if novo is null then
    raise exception 'nenhuma conta com esse e-mail' using errcode = 'P0002';
  end if;

  insert into workspace_members (workspace_id, user_id) values (p_ws, novo)
  on conflict do nothing;
end;
$fn$;

revoke execute on function adicionar_membro(uuid, text) from public, anon;
grant execute on function adicionar_membro(uuid, text) to authenticated;

-- O dono remove os outros (ws_members_delete, 0002), nunca a si mesmo: o workspace
-- ficaria sem o dono na lista de membros e o RLS dele pararia de liberar os boards.
-- Restrictive: soma-se (AND) as politicas permissivas existentes.
create policy ws_members_dono_fica on workspace_members
  as restrictive for delete to authenticated
  using (user_id <> (select w.owner_id from workspaces w where w.id = workspace_id));
