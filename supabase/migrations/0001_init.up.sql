-- =============================================================================
-- 0001 — Schema inicial do Gerenciador de Projetos
--
-- ZONA VERMELHA. Este arquivo foi ESCRITO por assistente e NAO foi aplicado.
-- Revise linha a linha antes de rodar. Em especial as politicas de RLS:
-- RLS mal feito com a anon key exposta no bundle significa banco aberto.
--
-- Aplicar:   supabase db push   (ou cole no SQL Editor do painel)
-- Reverter:  0001_init.down.sql
-- =============================================================================

create type task_status   as enum ('not_started', 'working', 'review', 'done', 'stuck');
create type task_priority as enum ('low', 'medium', 'high', 'critical');
create type group_color   as enum ('azure', 'grape', 'mint', 'crimson');

create table profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text not null check (length(trim(full_name)) between 1 and 120),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) between 1 and 120),
  owner_id   uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references profiles(id)   on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table boards (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null check (length(trim(name)) between 1 and 120),
  created_at   timestamptz not null default now()
);

create table groups (
  id       uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  name     text not null check (length(trim(name)) between 1 and 120),
  color    group_color not null default 'azure',
  position integer not null default 0
);

create table tasks (
  id              uuid primary key default gen_random_uuid(),
  board_id        uuid not null references boards(id) on delete cascade,
  group_id        uuid not null references groups(id) on delete cascade,
  title           text not null check (length(trim(title)) between 1 and 200),
  description     text check (length(description) <= 10000),
  status          task_status   not null default 'not_started',
  priority        task_priority not null default 'medium',
  assignee_id     uuid references profiles(id) on delete set null,
  start_date      date,
  due_date        date,
  progress        smallint not null default 0 check (progress between 0 and 100),
  estimated_hours numeric(6,2) check (estimated_hours >= 0),
  logged_hours    numeric(6,2) check (logged_hours >= 0),
  is_milestone    boolean not null default false,
  tags            text[] not null default '{}',
  position        integer not null default 0,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- VALIDACAO NO SERVIDOR, nao so no cliente (criterio F5.4 do specs.md).
  constraint periodo_coerente check (
    start_date is null or due_date is null or due_date >= start_date
  ),
  -- Um marco e uma data unica, nao um intervalo (criterio F3.4).
  constraint marco_tem_data check (not is_milestone or due_date is not null)
);

create table subtasks (
  id       uuid primary key default gen_random_uuid(),
  task_id  uuid not null references tasks(id) on delete cascade,
  title    text not null check (length(trim(title)) between 1 and 200),
  done     boolean not null default false,
  position integer not null default 0
);

create table comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  author_id  uuid not null references profiles(id) on delete cascade,
  body       text not null check (length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table task_dependencies (
  task_id            uuid not null references tasks(id) on delete cascade,
  depends_on_task_id uuid not null references tasks(id) on delete cascade,
  primary key (task_id, depends_on_task_id),
  constraint sem_autodependencia check (task_id <> depends_on_task_id)
);

-- Indices: um por query que o app realmente faz, nao "por precaucao".
create index tasks_board_group_pos_idx on tasks (board_id, group_id, position);
create index tasks_assignee_idx        on tasks (assignee_id);
create index tasks_atrasadas_idx       on tasks (due_date) where status <> 'done';
create index subtasks_task_idx         on subtasks (task_id, position);
create index comments_task_idx         on comments (task_id, created_at desc);
create index groups_board_pos_idx      on groups (board_id, position);
create index boards_workspace_idx      on boards (workspace_id);
create index ws_members_user_idx       on workspace_members (user_id);

create or replace function set_updated_at() returns trigger
language plpgsql as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

create trigger tasks_set_updated_at
  before update on tasks
  for each row execute function set_updated_at();

-- Perfil, workspace e board criados junto com o usuario.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare
  ws_id uuid;
begin
  insert into profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1))
  );

  -- v1: um workspace por usuario (docs/specs.md, secao 4).
  insert into workspaces (name, owner_id) values ('Meu Workspace', new.id) returning id into ws_id;
  insert into workspace_members (workspace_id, user_id) values (ws_id, new.id);
  insert into boards (workspace_id, name) values (ws_id, 'Meu Primeiro Quadro');
  return new;
end;
$fn$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY
--
-- A armadilha: uma politica em workspace_members que consulta workspace_members
-- causa RECURSAO INFINITA. A saida e uma funcao security definer, que roda fora
-- do RLS e por isso nao reentra na politica.
--
-- O `set search_path = public` na funcao security definer e obrigatorio: sem ele
-- um schema no search_path do chamador pode sequestrar a resolucao de nomes.
-- =============================================================================

create or replace function is_workspace_member(ws uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $fn$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$fn$;

-- Nenhuma tabela fica sem RLS. Sem excecao.
alter table profiles          enable row level security;
alter table workspaces        enable row level security;
alter table workspace_members enable row level security;
alter table boards            enable row level security;
alter table groups            enable row level security;
alter table tasks             enable row level security;
alter table subtasks          enable row level security;
alter table comments          enable row level security;
alter table task_dependencies enable row level security;

create policy profiles_select on profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from workspace_members m
      where m.user_id = profiles.id and is_workspace_member(m.workspace_id)
    )
  );
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy workspaces_select on workspaces for select to authenticated
  using (is_workspace_member(id));
create policy workspaces_insert on workspaces for insert to authenticated
  with check (owner_id = auth.uid());
create policy workspaces_update on workspaces for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy workspaces_delete on workspaces for delete to authenticated
  using (owner_id = auth.uid());

create policy ws_members_select on workspace_members for select to authenticated
  using (is_workspace_member(workspace_id));
create policy ws_members_write on workspace_members for all to authenticated
  using (exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));

create policy boards_all on boards for all to authenticated
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

create policy groups_all on groups for all to authenticated
  using (exists (select 1 from boards b where b.id = board_id and is_workspace_member(b.workspace_id)))
  with check (exists (select 1 from boards b where b.id = board_id and is_workspace_member(b.workspace_id)));

create policy tasks_all on tasks for all to authenticated
  using (exists (select 1 from boards b where b.id = board_id and is_workspace_member(b.workspace_id)))
  with check (exists (select 1 from boards b where b.id = board_id and is_workspace_member(b.workspace_id)));

create policy subtasks_all on subtasks for all to authenticated
  using (exists (
    select 1 from tasks t join boards b on b.id = t.board_id
    where t.id = task_id and is_workspace_member(b.workspace_id)))
  with check (exists (
    select 1 from tasks t join boards b on b.id = t.board_id
    where t.id = task_id and is_workspace_member(b.workspace_id)));

-- comments: todos do workspace leem; so o autor altera o proprio.
create policy comments_select on comments for select to authenticated
  using (exists (
    select 1 from tasks t join boards b on b.id = t.board_id
    where t.id = task_id and is_workspace_member(b.workspace_id)));
create policy comments_insert on comments for insert to authenticated
  with check (author_id = auth.uid() and exists (
    select 1 from tasks t join boards b on b.id = t.board_id
    where t.id = task_id and is_workspace_member(b.workspace_id)));
create policy comments_update on comments for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy comments_delete on comments for delete to authenticated
  using (author_id = auth.uid());

create policy task_deps_all on task_dependencies for all to authenticated
  using (exists (
    select 1 from tasks t join boards b on b.id = t.board_id
    where t.id = task_id and is_workspace_member(b.workspace_id)))
  with check (exists (
    select 1 from tasks t join boards b on b.id = t.board_id
    where t.id = task_id and is_workspace_member(b.workspace_id)));
