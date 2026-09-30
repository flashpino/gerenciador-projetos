-- =============================================================================
-- 0007 — Inscrições de notificação push, por dispositivo
--
-- Guia: docs/notificacoes-push.md
--
-- Uma linha por navegador/aparelho inscrito (o `endpoint` do Push API é único
-- por dispositivo). Quem lê para ENVIAR é a função `notificar`, com a service
-- role (servidor) — o cliente só vê e mexe nas próprias.
--
-- ZONA VERMELHA: escrito pelo agente, revisado e aplicado por humano.
-- Reverter: 0007_push_subscriptions.down.sql
-- =============================================================================

create table push_subscriptions (
  id         bigint generated always as identity primary key,
  -- Default + policy: o cliente não informa user_id, e não consegue inscrever outra pessoa.
  user_id    uuid not null default auth.uid() references profiles(id) on delete cascade,
  -- Validação no servidor, não só no cliente: só https e tamanhos sãos.
  endpoint   text not null unique check (endpoint like 'https://%' and length(endpoint) <= 2000),
  p256dh     text not null check (length(p256dh) between 1 and 200),
  auth       text not null check (length(auth) between 1 and 100),
  created_at timestamptz not null default now()
);

-- A leitura da função: "as inscrições do responsável pela tarefa".
create index push_subscriptions_user on push_subscriptions (user_id);

-- Nenhuma tabela sem RLS. Sem exceção.
alter table push_subscriptions enable row level security;

create policy push_subscriptions_select on push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

create policy push_subscriptions_insert on push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));

-- O app grava com upsert (on conflict endpoint): reinscrever o mesmo aparelho atualiza as chaves.
create policy push_subscriptions_update on push_subscriptions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy push_subscriptions_delete on push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));
