# Modelo de Dados e RLS

**Fase do manual:** 4.6 · **ZONA VERMELHA** · Atualizado em 2026-09-16

> **Status: APLICADO em 2026-09-16** no projeto `xgipcdxxvgzmbfycyzer`.
> Aplicado por assistente via MCP, sob autorização explícita do humano nesta
> sessão — o padrão da Zona Vermelha continua sendo "o agente escreve, não
> executa". Foi uma exceção autorizada, não a nova regra.
>
> | Migration | O quê |
> |---|---|
> | `0001_init` | schema, 9 tabelas, índices, triggers, RLS |
> | `0002_advisors` | correções dos advisors (ver "Advisors" abaixo) |
> | `0003_board_favorites` | favoritos por pessoa — aplicada pelo humano em 2026-09-28; RLS verificado pela API (6 checagens OK) |
> | `0004_activities` | feed de atividades gravado por gatilhos — aplicada pelo humano em 2026-09-28; verificada pela API (7 checagens OK) |
>
> O teste de isolamento passou nos 3 blocos **depois** do 0002.

---

## Por que RLS é o item mais perigoso deste projeto

A `anon key` vai **embutida no bundle** e é visível para qualquer pessoa que abra o
DevTools. Isso é por design e é seguro — **desde que** o Row Level Security esteja
ativo. Uma tabela sem RLS com a anon key exposta significa que qualquer pessoa na
internet lê o banco inteiro. Esse é o vazamento padrão de app vibecoded com Supabase.

Por isso: **11 tabelas, 11 `enable row level security`, zero exceção.**

---

## As tabelas

| Tabela | Papel | Isolada por |
|---|---|---|
| `profiles` | dados públicos do usuário (nome, avatar) | é o próprio, ou divide workspace |
| `workspaces` | container raiz | ser membro |
| `workspace_members` | quem pertence a quê | ser membro (via função) |
| `boards` | quadro de tarefas | workspace do board |
| `groups` | seções dentro do board | board → workspace |
| `tasks` | a entidade central | board → workspace |
| `subtasks` | checklist de uma tarefa | task → board → workspace |
| `comments` | conversa na tarefa | lê quem é do workspace; escreve só o autor |
| `task_dependencies` | setas do Gantt | task → board → workspace |
| `board_favorites` | estrela de favorito, **por pessoa** (0003) | só a própria pessoa lê/grava; insert exige ser membro do workspace do board |
| `activities` | feed: tarefa criada, status alterado, comentário (0004) | lê quem é do workspace do board; **ninguém escreve pela API** — só os gatilhos `security definer` |

**Isolamento é por pertencer ao workspace, não por `owner_id`.** Se fosse por dono,
colaboração não funcionaria — e colaboração é o produto.

---

## A armadilha da recursão infinita

A política natural de `workspace_members` seria:

```sql
-- NAO FACA ISSO
create policy ws_members_select on workspace_members for select
  using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));
```

A política consulta a própria tabela que ela protege. O Postgres reaplica a política
na subconsulta, que reaplica de novo: **recursão infinita**, e toda query na tabela
morre com erro. É o erro nº 1 de RLS no Supabase.

A saída é uma função `security definer`, que roda com os privilégios do criador e
por isso **não reentra** na política:

```sql
create or replace function is_workspace_member(ws uuid)
returns boolean language sql security definer stable
set search_path = public
as $fn$
  select exists (select 1 from workspace_members where workspace_id = ws and user_id = auth.uid());
$fn$;
```

**O `set search_path = public` não é estilo, é segurança.** Sem ele, uma função
`security definer` resolve nomes usando o `search_path` de quem a chama. Um schema
plantado antes de `public` sequestra a resolução e a função executa código do atacante
com privilégios elevados. Toda função `security definer` deste projeto fixa o
`search_path`.

---

## Validação no servidor, não só no cliente

Constraint no banco é a única validação que não dá para burlar — o cliente é código
público, e a API do Supabase aceita requisição de qualquer lugar. As que importam:

| Constraint | Protege de |
|---|---|
| `length(trim(title)) between 1 and 200` | tarefa sem título (critério F5.3) |
| `periodo_coerente` | `due_date < start_date` (critério F5.4) |
| `marco_tem_data` | marco sem data, que quebraria o Gantt (F3.4) |
| `progress between 0 and 100` | barra de progresso impossível |
| `estimated_hours >= 0` | hora negativa no cálculo de capacidade |
| `sem_autodependencia` | tarefa que depende de si mesma (laço no Gantt) |

O cliente valida também — mas para dar feedback rápido, não para garantir integridade.

---

## Índices

Um índice por query que o app realmente faz. Índice "por precaução" custa escrita e
não paga leitura nenhuma.

| Índice | Query que ele serve |
|---|---|
| `tasks (board_id, group_id, position)` | carregar a tabela agrupada e ordenada — a query principal |
| `tasks (assignee_id)` | filtro por pessoa e workload do dashboard |
| `tasks (due_date) where status <> 'done'` | **parcial** — a consulta de atrasadas nunca olha concluídas |
| `subtasks (task_id, position)` | checklist do modal |
| `comments (task_id, created_at desc)` | conversa do modal, mais recente primeiro |
| `groups (board_id, position)` | ordem dos grupos |
| `workspace_members (user_id)` | a função `is_workspace_member`, chamada em toda policy |
| `board_favorites (board_id)` | cascata ao excluir um board (a PK `(user_id, board_id)` já serve "meus favoritos") |
| `activities (board_id, created_at desc)` | "os últimos N deste board" (card do Dashboard) e a cascata ao excluir um board |

O último é o mais importante para performance: `is_workspace_member` roda em cada
linha avaliada por política. Sem esse índice, todo o RLS fica lento de uma vez.

---

## Teste de isolamento — o que prova que funciona

O manual exige "o teste que prova que o usuário A não lê os dados do usuário B".

**Pré-requisito:** crie **duas contas** pelo cadastro do app (ou em
Authentication → Users no painel). Não insira direto em `auth.users`: as colunas
obrigatórias dessa tabela mudam entre versões do Supabase, e o teste quebra por
motivo errado.

Pegue os dois IDs:

```sql
select id, email from auth.users order by created_at desc limit 2;
```

Cole os IDs nas duas primeiras linhas e rode no SQL Editor:

```sql
-- =============================================================================
-- TESTE DE ISOLAMENTO RLS
-- Nao escreve nada: roda dentro de uma transacao que termina em rollback.
-- =============================================================================
begin;

-- >>> TROQUE PELOS SEUS DOIS IDS <<<
create temp table _t (usuario_a uuid, usuario_b uuid) on commit drop;
insert into _t values (
  '00000000-0000-0000-0000-00000000000a',
  '00000000-0000-0000-0000-00000000000b'
);

do $teste$
declare
  a uuid; b uuid;
  tarefas_de_a integer; tarefas_de_b integer;
  vistas integer; ws_vistos integer;
  board_de_b uuid; grupo_de_b uuid;
begin
  select usuario_a, usuario_b into a, b from _t;

  -- Quanto cada um tem, visto SEM RLS (privilegios de owner no SQL Editor).
  select count(*) into tarefas_de_a from tasks t join boards bo on bo.id = t.board_id
    join workspace_members m on m.workspace_id = bo.workspace_id where m.user_id = a;
  select count(*) into tarefas_de_b from tasks t join boards bo on bo.id = t.board_id
    join workspace_members m on m.workspace_id = bo.workspace_id where m.user_id = b;

  if tarefas_de_b = 0 then
    raise exception 'INCONCLUSIVO: o usuario B nao tem nenhuma tarefa. Crie ao menos uma logada como B antes de rodar.';
  end if;

  -- --- Assume a identidade do usuario A ---
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  -- 1. A ve so as proprias tarefas
  select count(*) into vistas from tasks;
  if vistas <> tarefas_de_a then
    raise exception 'FALHA [leitura]: A viu % tarefas, deveria ver %. RLS NAO esta isolando.', vistas, tarefas_de_a;
  end if;
  raise notice 'OK [leitura]: A ve % tarefas, todas dele', vistas;

  -- 2. A nao ve o workspace de B
  select count(*) into ws_vistos from workspaces;
  if ws_vistos <> 1 then
    raise exception 'FALHA [workspace]: A viu % workspaces, esperado 1.', ws_vistos;
  end if;
  raise notice 'OK [workspace]: A ve apenas o proprio';

  -- 3. A nao consegue ESCREVER no board de B
  reset role;
  perform set_config('request.jwt.claims', null, true);
  select bo.id, g.id into board_de_b, grupo_de_b
    from boards bo
    join workspace_members m on m.workspace_id = bo.workspace_id and m.user_id = b
    join groups g on g.board_id = bo.id
    limit 1;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  begin
    insert into tasks (board_id, group_id, title) values (board_de_b, grupo_de_b, 'invasao');
    raise exception 'FALHA [escrita]: A conseguiu criar tarefa no board de B.';
  exception
    when insufficient_privilege then raise notice 'OK [escrita]: bloqueada pelo RLS';
  end;

  reset role;
end;
$teste$;

rollback;
```

Os três blocos devem imprimir `NOTICE ... OK`. **Qualquer `EXCEPTION` significa
que o RLS está furado e o app não pode ir para produção.**

### Resultado — 2026-09-16, após o 0002

Semeado: A com 3 tarefas, B com 2, C com 0 (contagens **assimétricas** de
propósito — se o RLS vazasse, todo mundo veria 5 e o teste não distinguiria
"isolou" de "coincidiu").

| Identidade | tasks | workspaces | ws_members | profiles |
|---|---|---|---|---|
| A | 3 | 1 | 1 | 1 |
| B | 2 | 1 | 1 | 1 |
| uuid desconhecido | 0 | 0 | 0 | 0 |

Escrita de A no board de B: `insert` bloqueado com `insufficient_privilege`;
`update` e `delete` atingiram **0 linhas**. Confirmado por contagem depois:
zero linhas `invasao`, zero `sequestrada`, total intacto em 5.

> **Nota de método:** `update`/`delete` sob RLS **não levantam erro** — o
> filtro da política remove a linha antes, e o comando reporta sucesso com 0
> linhas. Um teste que só procura exceção passa mesmo com RLS furado no
> `update`. Por isso o bloco 3 checa `found`, e não só o `exception`.

---

## Teste de isolamento — `board_favorites` (migration 0003)

Rodar **depois** de aplicar `0003_board_favorites.up.sql`. Mesmo formato do teste
acima: transação com `rollback`, não deixa nada gravado. Usa os ids das contas A e B.

```sql
begin;

-- >>> TROQUE PELOS IDS DE A E B <<<
create temp table _t (usuario_a uuid, usuario_b uuid) on commit drop;
insert into _t values (
  '00000000-0000-0000-0000-00000000000a',
  '00000000-0000-0000-0000-00000000000b'
);

do $teste$
declare
  a uuid; b uuid; board_a uuid; board_b uuid;
  vistos integer; apagados integer;
begin
  select usuario_a, usuario_b into a, b from _t;
  select bo.id into board_a from boards bo
    join workspace_members m on m.workspace_id = bo.workspace_id and m.user_id = a limit 1;
  select bo.id into board_b from boards bo
    join workspace_members m on m.workspace_id = bo.workspace_id and m.user_id = b limit 1;
  if board_a is null or board_b is null then
    raise exception 'INCONCLUSIVO: A e B precisam ter ao menos um board cada.';
  end if;

  -- --- Como A ---
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  -- 1. A favorita o proprio board SEM mandar user_id — como o app faz. O
  --    default auth.uid() tem que preencher com A.
  insert into board_favorites (board_id) values (board_a);
  select count(*) into vistos from board_favorites where user_id = a;
  if vistos <> 1 then
    raise exception 'FALHA [proprio]: A deveria ver 1 favorito dele, viu %.', vistos;
  end if;
  raise notice 'OK [proprio]: default auth.uid() preencheu com A';

  -- 2. A nao favorita board do workspace de B
  begin
    insert into board_favorites (user_id, board_id) values (a, board_b);
    raise exception 'FALHA [board alheio]: A favoritou um board do workspace de B.';
  exception when insufficient_privilege then
    raise notice 'OK [board alheio]: bloqueado pelo RLS';
  end;

  -- 3. A nao cria favorito em nome de B
  begin
    insert into board_favorites (user_id, board_id) values (b, board_a);
    raise exception 'FALHA [em nome de outro]: A criou favorito com o user_id de B.';
  exception when insufficient_privilege then
    raise notice 'OK [em nome de outro]: bloqueado pelo RLS';
  end;

  -- --- Como B ---
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);

  -- 4. B nao ve o favorito de A
  select count(*) into vistos from board_favorites;
  if vistos <> 0 then
    raise exception 'FALHA [leitura]: B viu % favorito(s) de A.', vistos;
  end if;
  raise notice 'OK [leitura]: B nao ve o favorito de A';

  -- 5. B nao apaga o favorito de A. delete sob RLS NAO levanta erro — reporta
  --    0 linhas. Por isso checar row_count, e nao so esperar exception.
  delete from board_favorites where user_id = a;
  get diagnostics apagados = row_count;
  if apagados <> 0 then
    raise exception 'FALHA [delete]: B apagou % favorito(s) de A.', apagados;
  end if;
  raise notice 'OK [delete]: B apagou 0 linhas';

  reset role;
end;
$teste$;

rollback;
```

Os cinco blocos devem imprimir `NOTICE ... OK`. Qualquer `EXCEPTION` = RLS furado.

---

## Teste — `activities` e seus gatilhos (migration 0004)

Rodar **depois** de aplicar `0004_activities.up.sql`. Transação com `rollback`: a
mudança de status e o comentário de teste não ficam gravados.

```sql
begin;

-- >>> TROQUE PELOS IDS DE A E B <<<
create temp table _t (usuario_a uuid, usuario_b uuid) on commit drop;
insert into _t values (
  '00000000-0000-0000-0000-00000000000a',
  '00000000-0000-0000-0000-00000000000b'
);

do $teste$
declare
  a uuid; b uuid; tarefa_a uuid; board_a uuid; status_antes task_status;
  n integer; ev activities%rowtype;
begin
  select usuario_a, usuario_b into a, b from _t;
  select t.id, t.board_id, t.status into tarefa_a, board_a, status_antes
    from tasks t join boards bo on bo.id = t.board_id
    join workspace_members m on m.workspace_id = bo.workspace_id and m.user_id = a limit 1;
  if tarefa_a is null then
    raise exception 'INCONCLUSIVO: A precisa de ao menos uma tarefa.';
  end if;

  -- --- Como A ---
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  -- 1. Mudar status gera 1 evento status_changed, com A como autor e de/para certos
  update tasks set status = case when status_antes = 'done' then 'working' else 'done' end
    where id = tarefa_a;
  select * into ev from activities where task_id = tarefa_a order by id desc limit 1;
  if ev.kind is distinct from 'status_changed' or ev.actor_id is distinct from a
     or ev.from_status is distinct from status_antes then
    raise exception 'FALHA [status]: evento errado: kind=% actor=% from=%', ev.kind, ev.actor_id, ev.from_status;
  end if;
  raise notice 'OK [status]: status_changed de % para % por A', ev.from_status, ev.to_status;

  -- 2. Gravar o MESMO status nao gera evento
  select count(*) into n from activities where task_id = tarefa_a;
  update tasks set status = status where id = tarefa_a;
  if (select count(*) from activities where task_id = tarefa_a) <> n then
    raise exception 'FALHA [mesmo status]: update sem mudança gerou evento.';
  end if;
  raise notice 'OK [mesmo status]: nenhum evento';

  -- 3. Comentar gera comment_added com o trecho
  insert into comments (task_id, author_id, body) values (tarefa_a, a, 'comentario de teste do gatilho');
  select * into ev from activities where task_id = tarefa_a order by id desc limit 1;
  if ev.kind is distinct from 'comment_added' or ev.comment_excerpt is distinct from 'comentario de teste do gatilho' then
    raise exception 'FALHA [comentario]: evento errado: kind=% excerpt=%', ev.kind, ev.comment_excerpt;
  end if;
  raise notice 'OK [comentario]: comment_added com o trecho';

  -- 4. A nao escreve direto em activities
  begin
    insert into activities (board_id, kind, task_title) values (board_a, 'task_created', 'forjado');
    raise exception 'FALHA [forjar]: A inseriu direto em activities.';
  exception when insufficient_privilege then
    raise notice 'OK [forjar]: insert direto bloqueado pelo RLS';
  end;

  -- --- Como B ---
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);

  -- 5. B nao ve eventos do workspace de A
  select count(*) into n from activities where board_id = board_a;
  if n <> 0 then
    raise exception 'FALHA [leitura]: B viu % evento(s) do board de A.', n;
  end if;
  raise notice 'OK [leitura]: B nao ve eventos de A';

  reset role;
end;
$teste$;

rollback;
```

Os cinco blocos devem imprimir `NOTICE ... OK`.

---

## Teste — convidar integrantes (migration 0005)

Rodar **depois** de aplicar `0005_integrantes.up.sql`. Transação com `rollback`:
B não fica membro do workspace de A.

```sql
begin;

-- >>> TROQUE PELOS IDS DE A E B <<<
create temp table _t (usuario_a uuid, usuario_b uuid) on commit drop;
insert into _t values (
  '00000000-0000-0000-0000-00000000000a',
  '00000000-0000-0000-0000-00000000000b'
);

do $teste$
declare
  a uuid; b uuid; ws_a uuid; email_b text; n integer;
begin
  select usuario_a, usuario_b into a, b from _t;
  select id into ws_a from workspaces where owner_id = a;
  select email into email_b from auth.users where id = b;  -- lido antes de trocar de papel

  -- --- Como A ---
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  -- 1. E-mail sem conta falha com P0002
  begin
    perform adicionar_membro(ws_a, 'ninguem-existe@exemplo.dev');
    raise exception 'FALHA [inexistente]: adicionou e-mail sem conta.';
  exception when no_data_found then
    raise notice 'OK [inexistente]: P0002';
  end;

  -- 2. A adiciona B (maiusculas e espacos no e-mail nao atrapalham)
  perform adicionar_membro(ws_a, '  ' || upper(email_b) || ' ');
  raise notice 'OK [adicionar]: sem erro';

  -- 3. A nao consegue se remover
  delete from workspace_members where workspace_id = ws_a and user_id = a;
  if not exists (select 1 from workspace_members where workspace_id = ws_a and user_id = a) then
    raise exception 'FALHA [dono fica]: A removeu a si mesma.';
  end if;
  raise notice 'OK [dono fica]: linha do dono intacta';

  -- --- Como B ---
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);

  -- 4. B agora le os boards de A
  select count(*) into n from boards where workspace_id = ws_a;
  if n = 0 then
    raise exception 'FALHA [leitura]: B membro nao ve boards de A.';
  end if;
  raise notice 'OK [leitura]: B ve % board(s) de A', n;

  -- 5. B nao e dono: nao adiciona ninguem no workspace de A
  begin
    perform adicionar_membro(ws_a, email_b);
    raise exception 'FALHA [so dono]: B adicionou no workspace de A.';
  exception when insufficient_privilege then
    raise notice 'OK [so dono]: 42501';
  end;

  -- --- Como A: remove B ---
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  delete from workspace_members where workspace_id = ws_a and user_id = b;

  -- 6. B deixa de ver os boards de A
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from boards where workspace_id = ws_a;
  if n <> 0 then
    raise exception 'FALHA [remover]: B removido ainda ve % board(s) de A.', n;
  end if;
  raise notice 'OK [remover]: B nao ve mais os boards de A';

  reset role;
end;
$teste$;

rollback;
```

Os seis blocos devem imprimir `NOTICE ... OK`.

---

## Advisors — o que o linter do Supabase apontou

Rodados após cada migration (`get_advisors`, tipos `security` e `performance`).

### Corrigido no `0002`

| Achado | Nível | Correção |
|---|---|---|
| `auth_rls_initplan` × 9 | WARN | `auth.uid()` → `(select auth.uid())`. Solto, é reavaliado **por linha**; dentro de `select` vira InitPlan, 1× por query |
| `multiple_permissive_policies` | WARN | `ws_members_write` era `for all`, e `all` inclui `select`. Virou 3 policies de escrita |
| `function_search_path_mutable` | WARN | `set_updated_at` ganhou `set search_path = public` |
| `handle_new_user` exposta em `/rest/v1/rpc/` | WARN | `revoke execute` de `public`, `anon`, `authenticated` |
| `is_workspace_member` exposta ao `anon` | WARN | `revoke execute` de `public`, `anon` |

### Aceito, com motivo

| Achado | Nível | Por que fica |
|---|---|---|
| `is_workspace_member` executável por `authenticated` | WARN | **Obrigatório.** Toda policy a chama, e expressão de policy roda com os privilégios de quem consulta. Revogar quebra o RLS inteiro com `permission denied for function`. Revela só se você é membro de um workspace cujo id você já teria de conhecer |
| `unindexed_foreign_keys` × 5 | INFO | É literalmente "índice por precaução", que a seção *Índices* deste documento rejeita. Entra quando existir a query que o paga |
| `unused_index` × 4 | INFO | Banco quase vazio, sem tráfego. Reavaliar com dado real |
| `rls_auto_enable` executável | WARN | Não é deste projeto. É um event trigger que liga RLS em tabela nova — guardrail alinhado à regra das 9/9. Chamar direto já falha (`0A000`) |

### Pendente — decisão humana (Zona Vermelha)

- **`auth_leaked_password_protection` desabilitado.** Ativa a checagem contra o
  HaveIBeenPwned. É toggle de painel (Auth → Password security), não SQL, e
  mexe no fluxo de autenticação. Proposto, não aplicado.

---

## Checklist de revisão — para você, não para o agente

Antes de aplicar, leia o `.up.sql` e confirme cada item **olhando o código**:

```
[ ] Todas as 11 tabelas têm `enable row level security`
[ ] Nenhuma política usa `to public` ou `using (true)`
[ ] `is_workspace_member` tem `set search_path = public`
[ ] `handle_new_user` tem `set search_path = public`
[ ] Nenhuma política de workspace_members consulta workspace_members diretamente
[ ] `comments` só deixa o autor editar e apagar o próprio
[ ] O `0001_init.down.sql` existe e reverte tudo o que o up cria
[ ] O teste de isolamento acima passa nos 3 blocos
[ ] SERVICE_ROLE_KEY não aparece em lugar nenhum do frontend
```

---

## Como aplicar

```bash
# 1. Leia o arquivo inteiro. Nao pule esta etapa.
#    supabase/migrations/0001_init.up.sql

# 2. Aplique (escolha um)
supabase db push
#    ou cole o conteudo no SQL Editor do painel

# 3. Rode o teste de isolamento acima. Os 3 blocos devem dar NOTICE, nunca EXCEPTION.

# 4. Se algo der errado:
#    supabase/migrations/0001_init.down.sql
```
