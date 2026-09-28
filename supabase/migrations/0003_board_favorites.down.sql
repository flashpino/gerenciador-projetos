-- =============================================================================
-- Reversao de 0003_board_favorites.up.sql
--
-- APAGA DADO: todos os favoritos de todas as pessoas. Nao ha outra tabela que
-- dependa desta, entao nada mais quebra — o app so volta a nao ter favoritos.
-- Policies e indice vao junto com a tabela.
-- =============================================================================

drop table board_favorites;
