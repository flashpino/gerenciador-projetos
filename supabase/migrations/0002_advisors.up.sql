-- =============================================================================
-- 0002 — Correcoes apontadas pelos advisors do Supabase apos o 0001
--
-- Tres classes de achado, nesta ordem de importancia:
--   1. auth_rls_initplan            (WARN, performance) — 9 policies
--   2. multiple_permissive_policies (WARN, performance) — workspace_members
--   3. search_path / EXECUTE        (WARN, seguranca)
--
-- O que este arquivo NAO faz, de proposito:
--   - nao cria indice para as 5 FKs apontadas como "unindexed". O
--     docs/data-model.md e explicito: um indice por query que o app faz.
--     Indice por precaucao custa escrita e nao paga leitura nenhuma.
--   - nao mexe em rls_auto_enable(): nao e deste projeto. E um event trigger
--     que liga RLS em tabela nova. Guardrail, nao problema.
--
-- Reverter: 0002_advisors.down.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. auth.uid() reavaliado por linha
--
-- `auth.uid()` solto numa policy e reexecutado PARA CADA LINHA avaliada.
-- `(select auth.uid())` vira um InitPlan, calculado UMA vez por query. Num
-- board de 200 tarefas isso e 200 chamadas contra 1. E o mesmo raciocinio que
-- levou o 0001 a criar ws_members_user_idx.
-- -----------------------------------------------------------------------------

drop policy profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from workspace_members m
      where m.user_id = profiles.id and is_workspace_member(m.workspace_id)
    )
  );

drop policy profiles_update on profiles;
create policy profiles_update on profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy workspaces_insert on workspaces;
create policy workspaces_insert on workspaces for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy workspaces_update on workspaces;
create policy workspaces_update on workspaces for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy workspaces_delete on workspaces;
create policy workspaces_delete on workspaces for delete to authenticated
  using (owner_id = (select auth.uid()));

drop policy comments_insert on comments;
create policy comments_insert on comments for insert to authenticated
  with check (author_id = (select auth.uid()) and exists (
    select 1 from tasks t join boards b on b.id = t.board_id
    where t.id = task_id and is_workspace_member(b.workspace_id)));

drop policy comments_update on comments;
create policy comments_update on comments for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));

drop policy comments_delete on comments;
create policy comments_delete on comments for delete to authenticated
  using (author_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 2. Duas policies permissivas no SELECT de workspace_members
--
-- `ws_members_write` era `for all`, e `all` INCLUI select. Resultado: todo
-- select em workspace_members avaliava as duas policies. Como
-- is_workspace_member le essa tabela em toda policy do app, ela e o caminho
-- quente — pagar em dobro aqui aparece no board inteiro.
--
-- A correcao restringe a policy de escrita as acoes de escrita. Quem pode
-- escrever nao muda: continua so o dono do workspace.
-- -----------------------------------------------------------------------------

drop policy ws_members_write on workspace_members;

create policy ws_members_insert on workspace_members for insert to authenticated
  with check (exists (select 1 from workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())));

create policy ws_members_update on workspace_members for update to authenticated
  using (exists (select 1 from workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())))
  with check (exists (select 1 from workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())));

create policy ws_members_delete on workspace_members for delete to authenticated
  using (exists (select 1 from workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())));

-- -----------------------------------------------------------------------------
-- 3. search_path e EXECUTE
-- -----------------------------------------------------------------------------

-- set_updated_at nao e security definer, entao o risco e menor que o das outras
-- duas funcoes — mas um search_path mutavel num gatilho que dispara em toda
-- escrita de tasks nao custa nada para fechar.
alter function set_updated_at() set search_path = public;

-- handle_new_user e funcao de GATILHO exposta como RPC em /rest/v1/rpc/.
-- Chamar direto ja falharia (funcao de gatilho fora de gatilho e erro 0A000),
-- mas nao ha motivo para ela estar no alcance da API publica.
-- O gatilho continua disparando: o Postgres checa EXECUTE na CRIACAO do
-- gatilho, nao a cada disparo. Isso e verificado por teste apos aplicar —
-- o cadastro inteiro depende disso, entao nao fica por conta da teoria.
revoke execute on function handle_new_user() from public, anon, authenticated;

-- is_workspace_member sai do alcance do anon mas CONTINUA disponivel para
-- authenticated — DE PROPOSITO. Toda policy do app a chama, e expressao de
-- policy e avaliada com os privilegios de quem faz a query. Revogar de
-- authenticated quebraria o RLS inteiro com "permission denied for function".
-- O que ela revela a um authenticated e apenas se ELE PROPRIO e membro de um
-- workspace cujo id ele ja precisaria conhecer. Nao e vazamento.
revoke execute on function is_workspace_member(uuid) from public, anon;
