# Feed de Atividades (sub-projeto 4/6)

**Data:** 2026-09-28 · **Status:** design aprovado em conversa
**Origem:** `docs/superpowers/specs/2026-09-17-casca-sidebar-design.md` (sub-projeto 4).
Reabre o corte do `docs/specs.md` ("Feed de atividades no dashboard — exige tabela de
eventos nova … migration própria revisada por humano"). Referência visual: widget
"Feed de Atividades Recentes" do Stitch `quadro_de_projetos_dashboard_de_m_tricas`.

## Escopo

**Eventos:** tarefa criada · status alterado (concluída e travada são status, com
destaque visual) · comentário adicionado.

**Onde:** `/atividades` (workspace inteiro, 50 mais recentes, com o nome do board em cada
item) e um widget "Atividades recentes" no Dashboard do board (10 mais recentes daquele board).

**Fora de escopo:** tempo real (corte "Colaboração em tempo real" do `specs.md` continua —
o feed atualiza ao abrir e ao voltar pra aba), paginação/"carregar mais", filtro por tipo
de evento, eventos de edição de outros campos (prazo, responsável, prioridade, progresso,
título), link para abrir a tarefa direto.

## Por que gatilho no banco

Nenhuma tabela guarda histórico de status (`tasks` só tem o status atual), então
"de X para Y" exige tabela nova. Gravar pelo **gatilho** e não pelo app:

- não dá para esquecer — célula da tabela, arrasto no kanban e modal geram evento;
- não dá para forjar — o cliente **não tem insert** em `activities`;
- atômico — o evento só existe se a mudança foi gravada.

## Dados — Zona Vermelha

Migration `supabase/migrations/0004_activities.{up,down}.sql`. **O agente escreve; o humano
revisa e aplica.** Frontend só depois de a migration estar no ar e verificada.

```sql
create type activity_kind as enum ('task_created', 'status_changed', 'comment_added');

create table activities (
  id              bigint generated always as identity primary key,
  board_id        uuid not null references boards(id) on delete cascade,
  task_id         uuid references tasks(id) on delete set null,
  actor_id        uuid references profiles(id) on delete set null,
  kind            activity_kind not null,
  task_title      text not null,
  from_status     task_status,
  to_status       task_status,
  comment_excerpt text,
  created_at      timestamptz not null default now()
);
create index activities_board_created on activities (board_id, created_at desc);
alter table activities enable row level security;
create policy activities_select on activities for select to authenticated
  using (exists (select 1 from boards b where b.id = board_id and is_workspace_member(b.workspace_id)));
-- Sem policy de insert/update/delete: só os gatilhos (security definer) escrevem.
```

- `task_title` e `comment_excerpt` são **cópias**: a tarefa pode ser renomeada ou apagada
  depois, e o histórico não pode mudar retroativamente.
- `task_id on delete set null`: apagar a tarefa não apaga o que aconteceu com ela.
- `board_id on delete cascade`: apagar o board apaga o histórico dele.
- `actor_id` anulável: alteração feita fora do app (SQL editor) não tem `auth.uid()`.

**Gatilhos** (functions `security definer set search_path = public`, `revoke execute` de
`public`/`anon`/`authenticated` — mesmo tratamento do `handle_new_user` no 0002):

| Gatilho | Quando | Grava |
|---|---|---|
| `tasks_registrar_atividade` | `after insert or update of status on tasks` | insert → `task_created` (`to_status` = status inicial); update com `new.status is distinct from old.status` → `status_changed` (`from_status`, `to_status`). `actor_id = auth.uid()` |
| `comments_registrar_atividade` | `after insert on comments` | `comment_added`, `task_title` da tarefa, `comment_excerpt = left(body, 120)`, `actor_id = new.author_id` |

`down`: dropa os 2 gatilhos, as 2 functions, a tabela e o tipo.

**Verificação** (depois de aplicada, pela API real com as contas A e B, como na 0003):
mudar status como A gera 1 evento com `actor_id = A`, `from/to` certos; comentário gera
`comment_added`; B não vê eventos do workspace de A; insert direto em `activities` é
recusado. Limpeza no fim. O SQL equivalente entra em `docs/data-model.md`.

## Frontend

**Tipo** (`types/domain.ts`): `Atividade` com os campos da tabela +
`ator: { full_name, avatar_url } | null` e `board: { name }`.

**Serviço** (`services/boards.ts`): `buscarAtividades({ boardId?, limite })` — select com
`actor:profiles(full_name, avatar_url)` e `board:boards(name)`, `order created_at desc`,
`limit`; filtra por `board_id` quando vier.

**Hook** (`hooks/useQuadro.ts`): `useAtividades(boardId: string | undefined, limite: number)`,
chave `['atividades', boardId ?? 'todos', limite]`. `useAtualizarTarefa`, `useCriarTarefa`
e `useCriarComentario` passam a invalidar também o prefixo `['atividades']` — quem muda um
status e abre o Dashboard vê o evento sem esperar o `staleTime`. O helper
`useMutacaoOtimista` ganha um parâmetro opcional `invalidarTambem: QueryKey[]`.

**Texto de cada evento** (`lib/atividade.ts`, puro, testado):

| kind | Texto | Ícone |
|---|---|---|
| `task_created` | **{ator}** criou a tarefa "{título}" | `Plus` |
| `status_changed` → `done` | **{ator}** concluiu "{título}" | `Check` |
| `status_changed` → `stuck` | **{ator}** marcou "{título}" como travada | `Ban` |
| `status_changed` (outros) | **{ator}** mudou "{título}" para {Badge do status} | `ArrowRightLeft` |
| `comment_added` | **{ator}** comentou em "{título}": "{trecho}" | `MessageSquare` |

Ator nulo → "Alguém". Status via o `Badge` existente (mesmos rótulos/cores da tabela).
Tempo via `tempoRelativo` (`lib/date.ts`, já existe).

**Componentes:**

| Componente | Detalhe |
|---|---|
| `features/FeedAtividades` (novo) | lista `<ol>` de eventos: ícone, texto, "há X" e — se `mostrarBoard` — o nome do board como link para `/boards/:id`. Só apresentação: recebe `atividades` por prop |
| `pages/AtividadesPage` (nova) | `/atividades`: título "Atividades", `useAtividades(undefined, 50)`, 4 estados via `StateView` (vazio: "Nenhuma atividade ainda") + `FeedAtividades mostrarBoard` |
| `pages/DashboardPage` | ganha o card "Atividades recentes" numa **nova linha abaixo** dos cards de Status e Progresso, largura total: `useAtividades(boardId, 10)`, 4 estados próprios (o card não bloqueia as métricas; aparece mesmo com o board sem tarefas) |

`EmConstrucaoPage` passa a servir 4 rotas. Nenhum primitivo novo em `ui/`.

## Casos de borda

- Tarefa apagada: evento continua, com o título copiado; `task_id` vira nulo.
- Pessoa removida: `actor_id` vira nulo → "Alguém".
- Board apagado: histórico do board vai junto (cascade); `/atividades` para de mostrar.
- Mudança de outro campo que não status (ex.: progresso): nenhum evento — por design.
- Update de status para o **mesmo** valor: nenhum evento (`is distinct from`).

## Testes

- `lib/atividade.test.ts`: texto e ícone de cada `kind`, os três ramos de status, ator nulo.
- `FeedAtividades.test.tsx`: renderiza itens em lista; nome do board como link só com `mostrarBoard`.
- `AtividadesPage.test.tsx`: 4 estados.
- `DashboardPage.test.tsx`: card "Atividades recentes" com o evento do board; vazio próprio.
- `useQuadro.test.tsx`: `useAtividades` repassa `boardId`/`limite`; atualizar tarefa invalida `['atividades']`.
- `a11y.test.tsx`: `AtividadesPage` com dados.
- Gate: `npm run verify` + navegador com a conta C (mudar status e comentar → evento aparece
  no Dashboard e em `/atividades`).

## Ordem

1. Migration 0004 + SQL de verificação → **parada para revisão e aplicação humana** →
   verificação pela API.
2. Plano do frontend → execução com TDD.
3. Docs (`components.md`, `progresso.md`, `data-model.md`, e o `specs.md` passa o feed de
   "fora de escopo" para entregue), Fase 6 do manual, verify, navegador.
