# Progresso do MVP

Atualizado manualmente a cada feature concluída (não é gerado automaticamente).
Fonte da verdade dos critérios: `docs/specs.md` seção 3.

---

## Visão geral

| # | Funcionalidade | Status |
|---|---|---|
| F0 | Autenticação (pré-requisito) | 🟡 código escrito e `npm run verify` verde — aguardando sua revisão linha a linha (Zona Vermelha) antes do commit |
| F1 | Tabela Principal | ✅ concluída |
| F2 | Kanban | ✅ concluída |
| F3 | Cronograma Gantt | ⬜ não iniciada |
| F4 | Dashboard de Métricas | ⬜ não iniciada |
| F5 | Detalhe da Tarefa (modal) | ⬜ não iniciada |

**Infra:** migrations `0001_init` + `0002_advisors` aplicadas, RLS testado (3 blocos OK).
PWA (`vite-plugin-pwa`) instalado, ainda não usado — fica para depois do MVP funcional (Fase 7 do manual).

---

## F0 — Autenticação 🟡

- [x] `src/services/auth.ts` — entrar, cadastrar, sair, obterSessaoAtual, escutarSessao
- [x] `src/hooks/sessaoContext.ts` + `src/hooks/useSessao.ts` — hook puro
- [x] `src/components/SessaoProvider.tsx` — provider (separado do hook por causa do lint `react/only-export-components`)
- [x] `src/components/RotaProtegida.tsx` — guarda de rota
- [x] `src/pages/LoginPage.tsx`
- [x] Rota `/login` pública, `/` e `/kanban` protegidas (`src/App.tsx`)
- [x] Critério F0.1 — login válido leva ao workspace (testado)
- [x] Critério F0.2 — erro genérico, não revela se e-mail existe (testado)
- [x] Critério F0.3 — sem sessão, redireciona sem piscar conteúdo protegido (testado)
- [x] Critério F0.4 — isolamento entre usuários (já provado no banco, `docs/data-model.md`)
- [x] Botão "Sair" em `BoardShell` — sem ele o serviço `sair()` existia mas não tinha como ser acionado pela UI
- [x] `LoginPage` redireciona quem já tem sessão para `/` (espelha o `RotaProtegida`)
- [x] Você desativou a confirmação de e-mail no painel do Supabase
- [ ] Revisão linha a linha + commit (Zona Vermelha)

## F1 — Tabela Principal ✅
Critérios F1.1–F1.6 do specs.md — implementados na fatia vertical (`docs/patterns.md`).

## F2 — Kanban ✅
Critérios F2.1–F2.6 do specs.md — drag via dnd-kit + alternativa por teclado.

## F3 — Cronograma Gantt ⬜
Nenhum arquivo criado ainda.

## F4 — Dashboard de Métricas ⬜
Nenhum arquivo criado ainda.

## F5 — Detalhe da Tarefa (modal) ⬜
Nenhum arquivo criado ainda. Sem ele não há criação de tarefa pela UI real.

---

## Como isto é mantido

Sem automação — atualizo este arquivo no mesmo commit que fecha um critério ou
uma funcionalidade. Se ele divergir do código, o código venceu (mesma regra do
`docs/patterns.md`). Pergunte "oq falta" a qualquer momento para eu recalcular
contra `docs/specs.md` e corrigir este arquivo se estiver desatualizado.
