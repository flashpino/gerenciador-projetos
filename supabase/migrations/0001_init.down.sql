-- =============================================================================
-- Reversao de 0001_init.up.sql
--
-- Escrito JUNTO com o up, como manda o manual (Fase 12.4): migration de banco e
-- a coisa mais dificil de reverter, e a hora de escrever o down e agora — nao
-- durante o incidente, as duas da manha, com o time esperando.
--
-- ATENCAO: isto APAGA todos os dados destas tabelas, em cascata.
-- Faca backup antes. Nao ha como desfazer a reversao.
--
-- A ordem importa: dependentes primeiro, referenciados depois.
-- =============================================================================

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists tasks_set_updated_at on tasks;

drop table if exists task_dependencies cascade;
drop table if exists comments          cascade;
drop table if exists subtasks          cascade;
drop table if exists tasks             cascade;
drop table if exists groups            cascade;
drop table if exists boards            cascade;
drop table if exists workspace_members cascade;
drop table if exists workspaces        cascade;
drop table if exists profiles          cascade;

drop function if exists handle_new_user();
drop function if exists is_workspace_member(uuid);
drop function if exists set_updated_at();

drop type if exists group_color;
drop type if exists task_priority;
drop type if exists task_status;
