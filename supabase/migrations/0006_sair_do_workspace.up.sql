-- 0006 — Membro sai do workspace (revisão final do sub-projeto 6/6).
-- docs/superpowers/specs/2026-09-29-integrantes-design.md
--
-- Com a 0005, qualquer dono adiciona qualquer conta existente sem aceite. Sem
-- saída, quem foi adicionado contra a vontade fica preso. Esta migration deixa
-- cada pessoa apagar a PRÓPRIA linha de membro.
--
-- Uma policy de delete só (não duas permissivas): duas permissivas na mesma
-- ação são avaliadas as duas em toda query — o mesmo problema que a 0002
-- corrigiu no select. `ws_members_dono_fica` (0005, restrictive) continua
-- valendo por cima: o dono não sai nem por aqui.

drop policy ws_members_delete on workspace_members;

create policy ws_members_delete on workspace_members for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from workspaces w
      where w.id = workspace_id and w.owner_id = (select auth.uid()))
  );

-- Nada no app atualiza uma linha de membro (é só inserir e apagar). E o update
-- deixava o dono trocar o próprio user_id, contornando ws_members_dono_fica.
drop policy ws_members_update on workspace_members;
