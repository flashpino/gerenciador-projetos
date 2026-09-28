-- =============================================================================
-- 0004 — Feed de atividades
--
-- Spec: docs/superpowers/specs/2026-09-28-atividades-design.md
--
-- Nenhuma tabela guardava historico: `tasks` so tem o status ATUAL, entao
-- "mudou de X para Y" exige registro proprio. Quem grava sao GATILHOS, nao o
-- app: nao da para esquecer (celula, kanban e modal geram evento), nao da para
-- forjar (o cliente nao tem insert aqui) e e atomico com a mudanca.
--
-- ZONA VERMELHA: escrito pelo agente, revisado e aplicado por humano.
-- Reverter: 0004_activities.down.sql
-- =============================================================================

create type activity_kind as enum ('task_created', 'status_changed', 'comment_added');

create table activities (
  id              bigint generated always as identity primary key,
  board_id        uuid not null references boards(id) on delete cascade,
  -- Apagar a tarefa nao apaga o que aconteceu com ela.
  task_id         uuid references tasks(id) on delete set null,
  -- Nulo quando a mudanca veio de fora do app (SQL editor, sem auth.uid()).
  actor_id        uuid references profiles(id) on delete set null,
  kind            activity_kind not null,
  -- Copias: a tarefa pode ser renomeada ou apagada depois, e o historico nao
  -- pode mudar retroativamente.
  task_title      text not null,
  from_status     task_status,
  to_status       task_status,
  comment_excerpt text,
  created_at      timestamptz not null default now()
);

-- As duas leituras do app: "os ultimos N deste board" e "os ultimos N".
-- A 1a usa o indice inteiro; a 2a o percorre ja ordenado por data por board.
create index activities_board_created on activities (board_id, created_at desc);

-- Nenhuma tabela sem RLS. Sem excecao.
alter table activities enable row level security;

create policy activities_select on activities for select to authenticated
  using (exists (
    select 1 from boards b where b.id = board_id and is_workspace_member(b.workspace_id)));

-- Sem policy de insert/update/delete, de proposito: o cliente so le. Quem
-- escreve sao as functions abaixo, security definer (rodam como o dono e
-- passam por cima do RLS — por isso nao ha o que forjar pela API).

-- -----------------------------------------------------------------------------
-- Tarefa criada / status alterado
-- -----------------------------------------------------------------------------
create or replace function registrar_atividade_tarefa() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if tg_op = 'INSERT' then
    insert into activities (board_id, task_id, actor_id, kind, task_title, to_status)
    values (new.board_id, new.id, auth.uid(), 'task_created', new.title, new.status);
  -- `update of status` dispara mesmo se o valor gravado for o mesmo; so conta
  -- quando mudou de verdade.
  elsif new.status is distinct from old.status then
    insert into activities (board_id, task_id, actor_id, kind, task_title, from_status, to_status)
    values (new.board_id, new.id, auth.uid(), 'status_changed', new.title, old.status, new.status);
  end if;
  return new;
end;
$fn$;

create trigger tasks_registrar_atividade
  after insert or update of status on tasks
  for each row execute function registrar_atividade_tarefa();

-- -----------------------------------------------------------------------------
-- Comentario adicionado
-- -----------------------------------------------------------------------------
create or replace function registrar_atividade_comentario() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  -- Autor do comentario, nao auth.uid(): o RLS de comments ja garante que
  -- author_id = quem esta logado, e assim o evento fica certo mesmo via SQL.
  insert into activities (board_id, task_id, actor_id, kind, task_title, comment_excerpt)
  select t.board_id, t.id, new.author_id, 'comment_added', t.title, left(new.body, 120)
  from tasks t
  where t.id = new.task_id;
  return new;
end;
$fn$;

create trigger comments_registrar_atividade
  after insert on comments
  for each row execute function registrar_atividade_comentario();

-- Funcoes de gatilho expostas como RPC em /rest/v1/rpc/ — mesmo tratamento do
-- handle_new_user no 0002. Gatilho nao depende de EXECUTE do chamador.
revoke execute on function registrar_atividade_tarefa() from public, anon, authenticated;
revoke execute on function registrar_atividade_comentario() from public, anon, authenticated;
