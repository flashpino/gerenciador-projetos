-- =============================================================================
-- 0008 — Webhook de push: INSERT em activities → função `notificar`
--
-- Guia: docs/notificacoes-push.md
--
-- Faz em SQL o que o "Database Webhook" do painel faria (o painel precisava do
-- recurso de webhooks ligado, que este projeto nunca teve). pg_net manda o POST
-- de forma assíncrona: o INSERT não espera a rede e não falha se a função cair.
--
-- O segredo do header e a URL da função NÃO estão aqui (este arquivo vai para o
-- git): ficam no Vault, criados à parte:
--   select vault.create_secret('<WEBHOOK_SECRET>', 'notificar_webhook_secret');
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/notificar', 'notificar_url');
-- Sem os dois no Vault o gatilho simplesmente não chama nada.
--
-- ZONA VERMELHA: escrito pelo agente; aplicado a pedido explícito do usuário (2026-09-30).
-- Reverter: 0008_webhook_notificar.down.sql
-- =============================================================================

create extension if not exists pg_net;

create or replace function public.notificar_push() returns trigger
language plpgsql security definer set search_path = '' as $fn$
declare
  segredo text;
  destino text;
begin
  select decrypted_secret into segredo from vault.decrypted_secrets where name = 'notificar_webhook_secret';
  select decrypted_secret into destino from vault.decrypted_secrets where name = 'notificar_url';
  if segredo is null or destino is null then
    return new;
  end if;

  -- Mesmo formato do webhook do painel: { type, table, schema, record, old_record }.
  perform net.http_post(
    url := destino,
    body := jsonb_build_object(
      'type', 'INSERT', 'table', 'activities', 'schema', 'public',
      'record', to_jsonb(new), 'old_record', null),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', segredo),
    timeout_milliseconds := 5000
  );
  return new;
end;
$fn$;

-- Ninguém chama isto direto: só o gatilho.
revoke all on function public.notificar_push() from public, anon, authenticated;

create trigger activities_notificar_push
  after insert on public.activities
  for each row execute function public.notificar_push();
