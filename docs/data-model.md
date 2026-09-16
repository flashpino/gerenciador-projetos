# Modelo de Dados e RLS

**Fase do manual:** 4.6 · **ZONA VERMELHA** · Atualizado em 2026-09-15

> **Status: PROPOSTA. Nada foi aplicado ao banco.**
> Os arquivos em `supabase/migrations/` foram escritos por assistente e aguardam
> sua revisão linha a linha. O manual é explícito: *"Não aplique migration sem
> minha aprovação explícita."*

---

## Por que RLS é o item mais perigoso deste projeto

A `anon key` vai **embutida no bundle** e é visível para qualquer pessoa que abra o
DevTools. Isso é por design e é seguro — **desde que** o Row Level Security esteja
ativo. Uma tabela sem RLS com a anon key exposta significa que qualquer pessoa na
internet lê o banco inteiro. Esse é o vazamento padrão de app vibecoded com Supabase.

Por isso: **9 tabelas, 9 `enable row level security`, zero exceção.**

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

O último é o mais importante para performance: `is_workspace_member` roda em cada
linha avaliada por política. Sem esse índice, todo o RLS fica lento de uma vez.

---

## Teste de isolamento — o que prova que funciona

O manual exige "o teste que prova que o usuário A não lê os dados do usuário B".
Rode isto no SQL Editor **depois** de aplicar a migration.

```sql
-- =============================================================================
-- TESTE DE ISOLAMENTO RLS
-- Usuarios e UUIDs sinteticos. Rode em ambiente de desenvolvimento.
-- =============================================================================
begin;

-- Dois usuarios ficticios, cada um com seu workspace (criado pelo trigger).
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'a@teste.local', '{"full_name":"Usuario A"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@teste.local', '{"full_name":"Usuario B"}');

-- Uma tarefa no board de cada um.
insert into tasks (board_id, group_id, title)
select b.id, g.id, 'Tarefa secreta de ' || w.owner_id
from boards b
join workspaces w on w.id = b.workspace_id
join lateral (
  insert into groups (board_id, name) values (b.id, 'Grupo') returning id
) g on true;

-- --- Assume a identidade do usuario A ---
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- A deve ver exatamente 1 tarefa: a dele.
do $teste$
declare n integer;
begin
  select count(*) into n from tasks;
  if n <> 1 then
    raise exception 'FALHA: usuario A viu % tarefas, esperado 1. RLS NAO esta isolando.', n;
  end if;
  raise notice 'OK: usuario A ve apenas a propria tarefa';
end;
$teste$;

-- A nao deve ver o workspace de B.
do $teste$
declare n integer;
begin
  select count(*) into n from workspaces;
  if n <> 1 then
    raise exception 'FALHA: usuario A viu % workspaces, esperado 1.', n;
  end if;
  raise notice 'OK: usuario A ve apenas o proprio workspace';
end;
$teste$;

-- A nao deve conseguir ESCREVER no board de B.
do $teste$
declare alvo uuid;
begin
  set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
  select board_id into alvo from tasks limit 1;
  set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

  begin
    insert into tasks (board_id, group_id, title)
    select alvo, g.id, 'invasao' from groups g where g.board_id = alvo limit 1;
    raise exception 'FALHA: usuario A conseguiu escrever no board de B.';
  exception when insufficient_privilege or check_violation then
    raise notice 'OK: escrita cruzada bloqueada';
  end;
end;
$teste$;

rollback;  -- nada persiste
```

Se qualquer um dos três blocos levantar exceção, **o RLS está furado e o app não
pode ir para produção.**

---

## Checklist de revisão — para você, não para o agente

Antes de aplicar, leia o `.up.sql` e confirme cada item **olhando o código**:

```
[ ] Todas as 9 tabelas têm `enable row level security`
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
