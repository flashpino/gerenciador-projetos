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
PWA instalável: manifest, ícones, aviso de nova versão e botão Instalar (seção "PWA" abaixo). Sem offline, por decisão do produto.

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

## Sub-projeto 3/6 — Favoritos ✅

Spec: `docs/superpowers/specs/2026-09-28-favoritos-design.md` · Plano: `docs/superpowers/plans/2026-09-28-favoritos.md`

- [x] Migration `0003_board_favorites` (Zona Vermelha): escrita pelo agente, aplicada pelo humano; RLS verificado pela API real com as contas A e B
- [x] Estrela de favorito no título do board e no card de Meus Painéis (update otimista, volta se o servidor recusar)
- [x] `/favoritos` lista os favoritos, com estado vazio próprio
- [x] Favorito por pessoa — `user_id default auth.uid()`, o cliente não afirma quem é

**Cortado:** atalhos de favoritos na Sidebar, ordenar favoritos, favoritar tarefa.

## Sub-projeto 4/6 — Feed de Atividades ✅

Spec: `docs/superpowers/specs/2026-09-28-atividades-design.md` · Plano: `docs/superpowers/plans/2026-09-28-atividades.md`

- [x] Migration `0004_activities` (Zona Vermelha): eventos gravados por gatilhos `security definer`; o cliente só lê. Aplicada pelo humano, verificada pela API (7 checagens)
- [x] Eventos: tarefa criada, status alterado (concluída e travada com frase própria), comentário
- [x] `/atividades`: workspace inteiro, 50 mais recentes, com o board de cada evento
- [x] Card "Atividades recentes" no Dashboard: 10 mais recentes do board, fora do estado das métricas
- [x] Mudar/criar tarefa e comentar invalidam o feed

**Cortado:** tempo real, paginação, filtro por tipo, eventos de outros campos (prazo, responsável…).
**Nota:** o histórico começa na aplicação da 0004 — nada antes dela foi registrado.

---

## Sub-projeto 5/6 — Modelos ✅

Spec: `docs/superpowers/specs/2026-09-28-modelos-design.md` · Plano: `docs/superpowers/plans/2026-09-28-modelos.md`

- [x] `/modelos` com 3 modelos fixos (Sprint de software, Lançamento de campanha, Onboarding)
- [x] "Usar modelo" cria o board com os grupos do modelo e abre o board
- [x] `criarBoard` aceita grupos iniciais (insert em lote); "Novo Painel" segue com "A fazer"
- [x] Sem migration

**Cortado:** salvar board como modelo, tarefas de exemplo, pedir nome antes de criar.
**Limitação herdada:** board criado e insert de grupos falhando deixa o board sem grupos (resolver pede RPC — Zona Vermelha).

---

## Sub-projeto 6/6 — Convidar Integrantes ✅

Spec: `docs/superpowers/specs/2026-09-29-integrantes-design.md` · Plano: `docs/superpowers/plans/2026-09-29-integrantes.md`

- [x] Migration `0005_integrantes` (Zona Vermelha): RPC `adicionar_membro` e dono que não se remove; escrita pelo agente, aplicada pelo humano
- [x] "Convidar integrantes" no board abre a lista de integrantes do workspace daquele board
- [x] Dono adiciona por e-mail (só quem já tem conta) e remove com confirmação; os outros só veem
- [x] Workspace atual = o da própria pessoa; responsáveis = membros do workspace do board
- [x] Migration `0006_sair_do_workspace` (Zona Vermelha, da revisão final): quem não é dono sai do workspace pelo diálogo; o dono continua sem poder sair. Logout limpa o cache do TanStack Query

**Cortado:** avatar na lista de integrantes (o Avatar repete o nome para leitor de tela; exigiria variante decorativa no primitivo), convite por e-mail para quem não tem conta, papéis, trocar de workspace, transferir posse.
**Limitações aceitas:** membro removido continua como responsável das tarefas que tinha; sem notificação; o dono descobre se um e-mail tem conta.

---

## Como isto é mantido

Sem automação — atualizo este arquivo no mesmo commit que fecha um critério ou
uma funcionalidade. Se ele divergir do código, o código venceu (mesma regra do
`docs/patterns.md`). Pergunte "oq falta" a qualquer momento para eu recalcular
contra `docs/specs.md` e corrigir este arquivo se estiver desatualizado.

---

## PWA ✅

Spec: `docs/superpowers/specs/2026-09-29-pwa-design.md` · Plano: `docs/superpowers/plans/2026-09-29-pwa.md`

- [x] `scripts/gerar-icones.py` + `public/pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png`, `apple-touch-icon.png`, `favicon.svg`
- [x] `vite.config.ts` — `VitePWA` com `registerType: 'prompt'`, manifest pt-BR, precache só dos arquivos do app, sem cache de runtime (Supabase nunca vem do cache)
- [x] `index.html` — `theme-color` e `apple-touch-icon`
- [x] `src/hooks/useInstalarApp.ts` + teste — guarda o `beforeinstallprompt`, dispensa gravada em `localStorage`
- [x] `src/components/features/AvisoPWA.tsx` + teste + axe — versão nova tem prioridade sobre instalar
- [x] `knip.json` sem `ignoreDependencies`; `docs/DEPS-PENDENTES.md` apagado (última pendência usada)
- [x] Build gera `sw.js` + `manifest.webmanifest` (precache de 16 arquivos)
- [x] Checagem manual no Chrome (`vite preview`, 2026-09-29): manifest e 3 ícones servem 200; service worker ativo; console sem erro; o Chrome disparou `beforeinstallprompt` (critérios de instalação atendidos); aviso aparece; "Agora não" grava a marca e não volta após reload; layout estreito (500px, mínimo da janela) com alvos de 44px, margem de 16px e sem scroll horizontal
- [x] Aviso de *versão nova* testado de verdade no Chrome (2026-09-29): com o service worker do build anterior ativo e o novo em espera, a barra mostra "Nova versão disponível"; "Recarregar" faz o novo assumir (sem SW em espera, CSS novo aplicado). **Segue sem teste real:** o clique em "Instalar" (abre a janela nativa do sistema) — coberto só por teste unitário com mock

**Decisões e limites:** só o Chromium dispara `beforeinstallprompt`. No iPhone o app é instalável pelo menu do Safari, mas sem botão nosso (spec, "Fora de escopo"). Cores do manifest (`#0073ea`, `#ffffff`) repetem `--color-primary`/`--color-surface` de `tokens.css` com comentário apontando a fonte, porque manifest não lê variável CSS.

---

## Configurações e Ajuda ✅ (sub-projetos 7 e 8)

Spec: `docs/superpowers/specs/2026-09-29-configuracoes-ajuda-design.md` · decididos de forma autônoma (ver `docs/relatorio-autonomo-2026-09-29.md`).

- [x] `services/boards.ts` `atualizarNomePerfil` + `hooks/useQuadro.ts` `useAtualizarNome` + `pages/ConfiguracoesPage.tsx` — só o nome de exibição; e-mail só de leitura. Sem migration: a policy `profiles_update` e o check de 1–120 já existiam
- [x] `lib/ajuda.ts` + `pages/AjudaPage.tsx` — 8 perguntas em `<details>` nativo, só sobre o que existe hoje
- [x] Rotas `/configuracoes` e `/ajuda` no ar; testes de serviço, de página e axe
- [x] Testado contra o **banco real** (conta de teste, `vite preview`): o `update` do próprio perfil passa pela RLS, o nome grava aparado e volta após reload; nome original restaurado depois
- [x] Corrigido junto: `scroll-padding-bottom` em `tokens.css` para a barra fixa do PWA não cobrir o foco por teclado (WCAG 2.2, 2.4.11)
- [ ] **Notificações segue "em construção", de propósito.** Sem menção, push ou e-mail (fora da v1) ela repetiria `/atividades`. A versão "atividades nas tarefas atribuídas a mim" exige um join `activities → tasks` que não pude validar contra o banco. Reabrir junto com push

## Desempenho — páginas por rota ✅

- [x] `React.lazy` em Kanban, Painéis, Atividades, Modelos, Ajuda e Configurações (Gantt e Dashboard já eram). `Suspense` único dentro do `AppShell` (a Sidebar não some na troca de página)
- [x] Carregamento inicial ~191 KB → ~176 KB gzip (limite da spec: 200 KB). O Kanban com dnd-kit (14 KB gzip) só baixa ao abrir o Kanban

---

## Novo design (Urbanist, índigo, vidro fosco) ✅

Mockup: `docs/mockups/novo-design-urbanist.html` (referência: `referencias/modelo2`, fora do git).

- [x] **A. Tokens** — paleta, fonte Urbanist, raios, sombras, degradê de fundo, utilitário `glass`, cores `-strong` para gráficos. Ícones e cor do manifest do PWA no índigo
- [x] **B. Casca** — `Sidebar` vira trilho de botões redondos (md+), drawer com rótulos no celular; abas do board em pílula de vidro; título com a estrela ao lado
- [x] **C. Superfícies** — cards de vidro (tabela, kanban, dashboard, modelos, ajuda, configurações, atividades, login), status e prioridade em pílula (variante `bleed` removida), Gantt com borda forte
- [x] **Portão de contraste** passou de 32 para 50 pares: agora também texto, borda, cores de gráfico e títulos de grupo contra o vidro
- [x] **QA no navegador real** (build de produção): as 10 telas em 500px sem rolagem horizontal e sem alvo de toque < 44px; Lighthouse mobile no board: acessibilidade 100, boas práticas 100
- [ ] **Não feito:** barra de ícones fixa embaixo no celular (o mockup tinha; mantive o drawer, que já existia e tem testes); saudação "Bom dia, Ana" e o botão "Nova tarefa" primário no topo (o produto tem o "Novo item" ainda desabilitado)

**Bugs achados e corrigidos no caminho:** `Button` só-ícone tamanho `md` espremia o ícone a 8px (padding do tamanho não era sobrescrito); texto `sr-only` das abas escapava do `overflow` e esticava a página quando as abas passavam da tela; `rounded-sm` maior transformava checkbox, marco do Gantt e legenda do donut em círculos.

---

## Busca e filtros do board ✅ (sub-projeto 9)

Spec: `docs/superpowers/specs/2026-09-30-busca-filtros-design.md` · pedido do usuário: "não é só enfeite".

- [x] `lib/filtro.ts` + 27 testes — ler/escrever a query, casar tarefa, filtrar grupos (busca sem acento/maiúscula em título e descrição; status, prioridade, responsável, atrasadas; E entre categorias, OU dentro)
- [x] `hooks/useFiltroTarefas`, `useGruposFiltrados`, `useBuscaDoBoard` + testes
- [x] `FiltroTarefasModal`, `ResumoFiltro`, `VisaoDoBoard`; `BoardShell` com campo de busca e botão "Filtrar" com a contagem no nome acessível
- [x] Tabela, Kanban e Gantt filtram; Dashboard não (métricas do board inteiro); abas levam a query junto
- [x] Modal de tarefa continua vendo todos os grupos (inclusive os escondidos pelo filtro)
- [x] Testado no **navegador real** com o banco: busca, troca de visão, modal, reload, mobile (sem overflow, alvos ≥ 44px)
- [x] **Bug achado só no navegador:** campo ligado direto à URL perdia teclas ("tarefa" → "trefa"). Corrigido com `useBuscaDoBoard` (ver `docs/patterns.md` §10)
- [ ] Fora de escopo, de propósito: filtro por período/sprint (não existe no schema), filtros salvos, busca por nome do responsável, busca em comentários e subtarefas

---

## Integração Claude → sistema ✅ (sub-projeto 10)

Spec: `docs/superpowers/specs/2026-09-30-integracao-claude-design.md` · Guia: `docs/integracao-claude.md`.
Pedido: o Claude, em outra sessão (talvez outra conta), cria as tarefas de um plano e vai atualizando o status. Novo e existente.

- [x] **Sem mudança no servidor:** conta de serviço = membro do workspace (o RLS existente já permite criar/editar boards, grupos, tarefas e subtarefas). Sem migration, sem edge function, sem tocar em auth
- [x] `integracao-claude/`: CLI sem dependências (`gp.mjs`), `nucleo.mjs` (puro), `api.mjs` (HTTP), `comandos.mjs`, `ambiente.mjs`, `SKILL.md`, `instalar.mjs`
- [x] `importar` de plano `.md` (formato do `superpowers:writing-plans`) ou `.json`; idempotente por `ref` (tag `ref:X` em `tasks.tags`, invisível na interface); `--criar` (novo), `--board`/`vincular` (existente), `--dry-run`
- [x] `iniciar`/`concluir`/`revisar`/`travar`/`status`/`comentar`, `tarefas`, `eu`, `boards`
- [x] Reimportar nunca desfaz: status, progresso e subtarefas só **avançam**; a tarefa nunca muda de grupo
- [x] **106 testes** (núcleo, API com fetch falso, comandos contra uma API em memória que prova a idempotência de ponta a ponta)
- [x] Skill instalada em `~/.claude/skills/gerenciador-projetos/` (vale para toda sessão desta máquina)
- [ ] **Falta o passo humano:** criar a conta de serviço, convidá-la no workspace e rodar `gp configurar` (envolve senha). Sem isso a CLI responde "configuração incompleta"
- [ ] **Não testado contra o banco real:** só contra o falso. O primeiro `gp eu` + `gp importar --dry-run` reais são a verificação que falta

---

## Gerenciar grupos na tabela ✅

Motivo: o mockup tem "+ Adicionar Novo Grupo" e a auditoria Stitch já apontava a lacuna; sem criar grupo, a tabela ficava presa ao "A fazer" padrão, que parece um status mas é só uma seção (a tarefa muda de status sem mudar de grupo).

- [x] Serviço `criarGrupo`, `atualizarGrupo`, `removerGrupo` (sem migration: a policy `groups_all` já cobre insert/update/delete) + hooks `useCriarGrupo`, `useAtualizarGrupo`, `useRemoverGrupo`
- [x] `GrupoFormModal` (nome + cor, criar e renomear) e botão "Novo grupo" na `BoardPage`; "Criar primeiro grupo" deixou de ser botão morto
- [x] Menu ⋮ no cabeçalho do grupo: Renomear e Excluir. `Menu` ganhou o item `desabilitado` (`aria-disabled`)
- [x] Regra de exclusão: só grupo **vazio** (o `on delete cascade` apagaria as tarefas) e **nunca o último** (`tasks.group_id` NOT NULL). A checagem lê a lista sem filtro de busca
- [x] `TaskGroup`: `overflow-hidden` saiu da section e `focus-within:z-10` evita o dropdown ficar atrás do grupo seguinte (`glass` cria contexto de empilhamento)
- [x] **Verificado no navegador real** (2026-09-30, banco de dev, conta A, 375px e 1440px): criar grupo verde, menu ⋮ de grupo com tarefas ("Excluir" esmaecido com o motivo) e de grupo vazio (dropdown inteiro, sem corte), excluir o grupo de teste (removido do banco). Sem overflow horizontal
- [x] **Entrega 2 (abaixo):** o desencontro tabela × kanban foi resolvido com o alternador "Agrupar por"
- [ ] Fora de escopo: reordenar grupos por arrastar, excluir grupo com tarefas (com confirmação)

---

## Tabela agrupada por status ✅

Motivo: a tabela agrupava só por grupo e o kanban só por status, então a mesma tarefa aparecia em "A fazer" numa tela e em "Em andamento" na outra.

- [x] `useAgrupamento`: `?agrupar=status` na URL (padrão `grupo` não vai para a URL); preserva busca, filtros e demais parâmetros
- [x] `BoardPage`: `Select` "Agrupar por: Grupo | Status". Em Status reaproveita `colunasPorStatus` do kanban, só os status com tarefa
- [x] `TaskGroup` ganhou a variante `status` (bloco de visão): sem menu do grupo, sem "Adicionar item", barra na cor do status; "Novo grupo" some da página
- [x] Mudar o status inline move a tarefa de bloco na hora (a visão deriva da cache do update otimista)
- [x] Critérios 10 e 11 no F1 do `specs.md`
- [x] **Verificado no navegador real:** 3 blocos (Em andamento, Em revisão, Pronto) na ordem do kanban, barra na cor de cada status, select ok em 375px e 1440px. Marcar "Concluir" moveu a tarefa de bloco e continuou lá após o servidor responder (dado restaurado depois)
- [ ] Observação: as abas Kanban/Gantt/Dashboard levam o `?agrupar=status` junto (as abas repassam a query inteira). Inofensivo — voltar à Tabela mantém o agrupamento —, então ficou como está
- [ ] Fora de escopo, de propósito: lembrar a escolha entre sessões, agrupar por prioridade/responsável, criar tarefa dentro de um bloco de status

---

## Skeleton na troca de página ✅

Motivo: ao clicar em outra página, a tela antiga ficava congelada até a nova chegar. O React Router troca de rota dentro de uma transição do React, e nela o `<Suspense>` **nunca** mostra o fallback — parecia travamento.

- [x] `StateView` em "carregando" agora é um skeleton (`aria-busy`, texto sr-only "Carregando…", sem animação com `prefers-reduced-motion`); vale para a troca de página e para os dados de qualquer visão
- [x] `BrowserRouter useTransitions={false}` em `App.tsx`: a navegação suspende de verdade e o skeleton aparece na hora, com a sidebar no lugar
- [x] `App.test.tsx`: rota lazy que nunca carrega → skeleton visível e página antiga escondida (o React a esconde com `display:none`, não a desmonta). Sem a prop, o teste falha
- [x] Verificado no navegador real (rede Slow 3G, CPU 4x): a tela vira o skeleton no clique
- [x] **Skeleton com a forma de cada tela** (o genérico de 3 cartões não convenceu): tabela (seletor + grupos + linhas), kanban (5 colunas de vidro, pílula de status, cartões), gantt (coluna de nomes + barras), dashboard (métricas, rosca, progresso, feed), painéis (grade de cartões), atividades (feed). A troca de página escolhe a forma pela rota (`lib/esqueleto.ts`)
- [x] Verificado no navegador real, build de produção, offline (React Query pausa as buscas e a tela fica no skeleton): as 6 telas em 1440px e as 4 visões do board em 375px sem overflow. Achado corrigido: blocos direto sobre o fundo sumiam no lavanda (`sobreFundo`)
- [ ] Descartado a pedido: pré-carregar o código das páginas (deixaria a troca instantânea também no dev). No build de produção o service worker já faz isso
- [ ] `buscaEFiltros.test.tsx`: `findBy/waitFor` de 4 s → 8 s. O teste "a busca ignora acento" digita 12 letras (~4,4 s isolado) e falhava 1 vez em 3 na suíte inteira com cobertura; nenhuma asserção foi tocada
