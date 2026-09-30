-- =============================================================================
-- Reversao de 0008_webhook_notificar.up.sql
--
-- Não apaga dado do app: só para de chamar a função `notificar`. O pg_net fica
-- instalado (outras coisas podem usá-lo; é inofensivo parado). Os segredos do
-- Vault vão junto, para não ficarem órfãos.
-- =============================================================================

drop trigger if exists activities_notificar_push on public.activities;
drop function if exists public.notificar_push();
delete from vault.secrets where name in ('notificar_webhook_secret', 'notificar_url');
