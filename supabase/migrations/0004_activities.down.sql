-- =============================================================================
-- Reversao de 0004_activities.up.sql
--
-- APAGA DADO: todo o historico de atividades. Tarefas e comentarios nao sao
-- tocados — so o registro do que aconteceu com eles. Depois disto, mudar
-- status/comentar volta a nao deixar rastro.
-- =============================================================================

drop trigger comments_registrar_atividade on comments;
drop trigger tasks_registrar_atividade on tasks;
drop function registrar_atividade_comentario();
drop function registrar_atividade_tarefa();
drop table activities;
drop type activity_kind;
