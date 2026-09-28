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
| F3 | Cronograma Gantt | ✅ concluída — commit `3b20ba9` |
| F4 | Dashboard de Métricas | ✅ concluída (bloco A) — commit `c739e2a` |
| F5 | Detalhe da Tarefa (modal) | ✅ concluída — commit `a529625` |

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

## F3 — Cronograma Gantt ✅

- [x] `lib/gantt.ts` + teste — posicionamento puro (intervalo, barra, ticks), reusa `diasAte`/`parseDataSimples`
- [x] `features/GanttRow.tsx`, `features/GanttChart.tsx` + testes
- [x] `pages/GanttPage.tsx`, rota `/gantt` com `React.lazy` (code splitting, requisito não-funcional do specs.md)
- [x] Aba "Gantt" em `BoardShell`
- [x] `TaskModal.tsx` ganhou checkbox "É um marco" — sem isso F3.4 não tinha como ser testado pela UI real
- [x] Critério F3.1 — barra posicionada/dimensionada pelo período (testado)
- [x] Critério F3.2 — trocar escala reposiciona sem perder a tarefa (testado)
- [x] Critério F3.3 — marcador "Hoje" (testado)
- [x] Critério F3.4 — marco vira losango, não barra (testado)
- [x] Critério F3.5 — tarefa sem data aparece como "sem período definido" (testado)
- [x] Critério F3.6 — 375px: coluna de tarefas fixa via `sticky`, só a timeline rola (mesmo container de scroll, sem duas árvores de DOM pra alinhar)
- [x] Revisão + commit — `3b20ba9`

**Cortado do stitch (`arquivos stitch/quadro_de_projetos_cronograma_gantt`), fora de `docs/specs.md`:** setas de dependência entre tarefas (a tabela `task_dependencies` existe no schema, mas nenhum critério de F3 pede isso), zoom, escala de trimestre, filtro por responsável, busca no cronograma, painel de Capacidade & Alocação — esse é Zona Vermelha.

**Desvios do planejado, registrados no `docs/components.md`:** `GanttScale` nunca virou arquivo — é `<Tabs variant="pill">` direto, sem wrapper. `GanttChart` não compõe `StateView` — quem trata os 4 estados é `GanttPage`, mesmo padrão de `BoardPage`/`KanbanPage`.

## F4 — Dashboard de Métricas ✅ (bloco A)

- [x] `lib/status.ts` — `CORES_STATUS`, cor por status compartilhada com o donut
- [x] `features/MetricTile.tsx` + teste — KPI com selo de atenção e barra de progresso opcionais
- [x] `features/StatusDonut.tsx` + teste — anel via SVG puro (`stroke-dasharray`), sem lib de gráfico de terceiros
- [x] `features/GroupProgressList.tsx` + teste — uma linha por grupo, progresso médio das tarefas dele
- [x] `pages/DashboardPage.tsx`, rota `/dashboard` com `React.lazy` (code splitting, requisito não-funcional do specs.md), aba "Dashboard" em `BoardShell`
- [x] Critério F4.1 — taxa de conclusão, atrasadas e distribuição por status, todas derivadas das tarefas reais (testado em `lib/metrics.test.ts`)
- [x] Critério F4.2 — a distribuição do donut também está disponível em texto ao lado do gráfico, não só visualmente (testado em `StatusDonut.test.tsx`)
- [x] Critério F4.3 — board/grupo sem nenhuma tarefa mostra estado vazio ("Nenhuma tarefa ainda"), nunca "0%"/"NaN" — `DashboardPage` monta o `estadoDaQuery` sobre a lista de TAREFAS achatada (`flatMap` dos grupos), não sobre a lista de grupos, porque um board pode ter grupos vazios e ainda assim precisar do estado vazio
- [x] Critério F4.4 — taxa de conclusão arredondada a uma casa decimal; percentuais da distribuição somam exatamente 100% (método do maior resto, testado em `lib/metrics.test.ts`)
- [x] Revisão + commit — `c739e2a` (página/rota/aba); `4e77ba9` corrigiu, antes disso, um lint pré-existente em `StatusDonut.tsx` (variável mutável reatribuída durante o render)

**Cortado do stitch (`arquivos stitch/quadro_de_projetos_dashboard_de_m_tricas`), fora de `docs/specs.md`:** feed de atividades no dashboard, carga de trabalho/capacidade da equipe (Zona Vermelha) e filtros de período/sprint — ver `docs/specs.md`, seção "Fora de escopo da v1", que já registra o porquê de cada corte.

## F5 — Detalhe da Tarefa (modal) ✅

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
- [x] Revisão + commit — `a529625`

**Cortado do stitch (`arquivos stitch/modal_de_cadastro_e_edi_o_tarefa_e_projeto`), fora de `docs/specs.md`:**
rich text, anexos, reações/thread, log automático de atividade, tags editáveis, cargo do comentarista — combinado com você antes de começar.

**Desvio registrado de `docs/patterns.md` ("update otimista é obrigatório pra toda escrita"):** criar tarefa, criar/remover subtarefa e postar comentário usam invalidate-only, sem otimismo. Só o toggle de subtarefa (F5.5) é otimista, porque é o único com critério de aceite exigindo atualização imediata. Ver comentários em `hooks/useQuadro.ts`.

## Sub-projeto 2/6 — Múltiplos boards ✅

Spec: `docs/superpowers/specs/2026-09-25-multiplos-boards-design.md` · Plano: `docs/superpowers/plans/2026-09-25-multiplos-boards.md`

- [x] Rotas por board: `/boards/:boardId` (+ `/kanban`, `/gantt`, `/dashboard`); `/` redireciona pro último board visitado
- [x] Meus Painéis (`/paineis`): lista, criar, renomear, excluir com confirmação por digitação
- [x] "Novo Painel" da Sidebar funcional
- [x] Board inexistente na URL volta pra `/paineis`
- [x] Sem migration — schema e cascade já suportavam

**Cortado:** arquivar (exigiria migration), contagem de tarefas no card, reordenar boards.
**Limitação aceita:** o bloqueio de excluir o último board é só no cliente.

---

## Como isto é mantido

Sem automação — atualizo este arquivo no mesmo commit que fecha um critério ou
uma funcionalidade. Se ele divergir do código, o código venceu (mesma regra do
`docs/patterns.md`). Pergunte "oq falta" a qualquer momento para eu recalcular
contra `docs/specs.md` e corrigir este arquivo se estiver desatualizado.
