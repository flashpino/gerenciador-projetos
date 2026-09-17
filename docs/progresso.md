# Progresso do MVP

Atualizado manualmente a cada feature concluída (não é gerado automaticamente).
Fonte da verdade dos critérios: `docs/specs.md` seção 3.

---

## Visão geral

| # | Funcionalidade | Status |
|---|---|---|
| F0 | Autenticação (pré-requisito) | ✅ concluída — commit `e5cdae6` |
| F1 | Tabela Principal | ✅ concluída |
| F2 | Kanban | ✅ concluída |
| F3 | Cronograma Gantt | ⬜ não iniciada |
| F4 | Dashboard de Métricas | ⬜ não iniciada |
| F5 | Detalhe da Tarefa (modal) | 🟡 código escrito e `npm run verify` verde — aguardando revisão e commit |

**Infra:** migrations `0001_init` + `0002_advisors` aplicadas, RLS testado (3 blocos OK).
PWA (`vite-plugin-pwa`) instalado, ainda não usado — fica para depois do MVP funcional (Fase 7 do manual).

---

## F0 — Autenticação ✅

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
- [x] Revisão linha a linha + commit (Zona Vermelha) — `e5cdae6`

## F1 — Tabela Principal ✅
Critérios F1.1–F1.6 do specs.md — implementados na fatia vertical (`docs/patterns.md`).

## F2 — Kanban ✅
Critérios F2.1–F2.6 do specs.md — drag via dnd-kit + alternativa por teclado.

## F3 — Cronograma Gantt ⬜
Nenhum arquivo criado ainda.

## F4 — Dashboard de Métricas ⬜
Nenhum arquivo criado ainda.

## F5 — Detalhe da Tarefa (modal) 🟡

- [x] `ui/Modal.tsx`, `ui/Select.tsx` — primitivos #9 e #6, faltava codar
- [x] `ui/TextInput.tsx` — variante `multiline` (textarea)
- [x] `types/domain.ts` — `Subtask`, `Comment`, `TaskComDetalhe`
- [x] `services/boards.ts` — criarTarefa, buscarTarefaDetalhe, criar/atualizar/removerSubtarefa, criarComentario
- [x] `hooks/useQuadro.ts` — hooks correspondentes
- [x] `features/SubtaskList.tsx`, `features/CommentList.tsx`, `features/TaskModal.tsx`
- [x] `BoardPage.tsx`/`KanbanPage.tsx`/`TaskGroup.tsx` ligados ao modal (criar + editar)
- [x] Critério F5.1 — foco preso no modal, Esc fecha, foco volta à origem (testado; Esc em si é nativo do `<dialog>`, não testável em jsdom — ver `src/test/setup.ts`)
- [x] Critério F5.2 — editar e salvar reflete na view de trás (reusa `useAtualizarTarefa`, mesma cache da tabela/kanban)
- [x] Critério F5.3 — título vazio bloqueia salvar (testado)
- [x] Critério F5.4 — prazo antes do início bloqueia salvar (testado)
- [x] Critério F5.5 — contador de subtarefas atualiza imediatamente, update otimista (testado)
- [x] Critério F5.6 — estado vazio de comentários (testado)
- [ ] Revisão + commit

**Cortado do stitch (`arquivos stitch/modal_de_cadastro_e_edi_o_tarefa_e_projeto`), fora de `docs/specs.md`:**
rich text, anexos, reações/thread, log automático de atividade, tags editáveis, cargo do comentarista — combinado com você antes de começar.

**Desvio registrado de `docs/patterns.md` ("update otimista é obrigatório pra toda escrita"):** criar tarefa, criar/remover subtarefa e postar comentário usam invalidate-only, sem otimismo. Só o toggle de subtarefa (F5.5) é otimista, porque é o único com critério de aceite exigindo atualização imediata. Ver comentários em `hooks/useQuadro.ts`.

---

## Como isto é mantido

Sem automação — atualizo este arquivo no mesmo commit que fecha um critério ou
uma funcionalidade. Se ele divergir do código, o código venceu (mesma regra do
`docs/patterns.md`). Pergunte "oq falta" a qualquer momento para eu recalcular
contra `docs/specs.md` e corrigir este arquivo se estiver desatualizado.
