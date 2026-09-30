-- =============================================================================
-- Reversao de 0007_push_subscriptions.up.sql
--
-- APAGA DADO: todas as inscrições de push. Nenhuma outra tabela depende desta;
-- o app volta a mostrar "Ativar notificações" e a função `notificar` passa a
-- não achar para quem enviar. Policies e índice vão junto com a tabela.
-- =============================================================================

drop table push_subscriptions;
