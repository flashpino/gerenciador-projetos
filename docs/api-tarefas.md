# API de tarefas — alimentar o gerenciador a partir de outra sessão

Como **outra sessão do Claude** (ou qualquer script, de qualquer máquina) cria e atualiza tarefas no sistema
falando **direto com a API HTTP do Supabase**, sem instalar nada.

> **Caminho mais fácil:** se a sessão roda nesta máquina, use a CLI `gp` — ela faz tudo isto por baixo, com
> importação de plano idempotente e testada. Guia: [`docs/integracao-claude.md`](integracao-claude.md).
> Este documento é para quando a CLI não está disponível ou você quer integrar outra ferramenta.

---

## 1. O que você precisa (uma vez)

| Item | Onde conseguir | É segredo? |
|---|---|---|
| **URL do projeto** | `https://xgipcdxxvgzmbfycyzer.supabase.co` | Não |
| **Chave pública (anon)** | `VITE_SUPABASE_ANON_KEY` do `.env.local` | Não — é feita para ficar no navegador |
| **E-mail e senha de uma conta de serviço** | Crie na tela **Usuários** (só o master vê), ex.: `claude.bot@…`, senha forte e única | **Sim** |
| **Convite no workspace** | Logado como dono: qualquer board → **Convidar integrantes** → e-mail da conta de serviço | — |

A conta de serviço é um **usuário comum**: o RLS do banco deixa ela ler e escrever **só** nos workspaces em que é
membro. Nunca use a `SUPABASE_SERVICE_ROLE_KEY` para isto — ela ignora o RLS.

Na outra sessão, passe os valores por variável de ambiente (nunca em arquivo versionado):

```bash
export GP_URL=https://xgipcdxxvgzmbfycyzer.supabase.co
export GP_CHAVE=<chave anon>
export GP_EMAIL=claude.bot@exemplo.com
export GP_SENHA=<senha>
```

---

## 2. Login → token

```bash
curl -s -X POST "$GP_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $GP_CHAVE" -H "Content-Type: application/json" \
  -d "{\"email\":\"$GP_EMAIL\",\"password\":\"$GP_SENHA\"}"
```

A resposta traz `access_token` (vale **1 hora**), `refresh_token` e `user.id` (o id da conta — necessário para
comentar). Quando o token vencer (resposta **401**), renove sem senha:

```bash
curl -s -X POST "$GP_URL/auth/v1/token?grant_type=refresh_token" \
  -H "apikey: $GP_CHAVE" -H "Content-Type: application/json" \
  -d '{"refresh_token":"<refresh_token>"}'
```

**Cabeçalhos de toda chamada abaixo:**

```
apikey: <chave anon>
Authorization: Bearer <access_token>
Content-Type: application/json
Prefer: return=representation      ← em POST/PATCH: devolve a linha gravada (com o id)
```

---

## 3. Descobrir onde lançar

```bash
# Workspaces em que a conta é membro (com o nome do dono — os nomes "Meu Workspace" se repetem, use o id)
GET /rest/v1/workspaces?select=id,name,owner_id,dono:profiles!owner_id(full_name)&order=created_at.asc

# Boards visíveis
GET /rest/v1/boards?select=id,name,workspace_id&order=created_at.asc

# Grupos de um board (toda tarefa precisa de um grupo)
GET /rest/v1/groups?select=id,name,position&board_id=eq.<board_id>&order=position.asc
```

Precisa de um board novo?

```bash
POST /rest/v1/boards        {"workspace_id": "<id>", "name": "Projeto X"}
POST /rest/v1/groups        [{"board_id": "<board_id>", "name": "Fase 1", "color": "azure", "position": 0}]
```

> Board criado pela API **não** ganha o grupo "A fazer" automático (isso só existe no app). Crie ao menos um grupo.
> Cores de grupo: `azure`, `grape`, `mint`, `crimson`.

---

## 4. Criar tarefas

```bash
POST /rest/v1/tasks
[
  {
    "board_id": "<board_id>",
    "group_id": "<group_id>",
    "title": "Implementar login",
    "description": "Detalhes em texto livre",
    "status": "not_started",
    "priority": "high",
    "start_date": "2026-10-01",
    "due_date": "2026-10-05",
    "tags": ["ref:projeto-x#T1"],
    "position": 0
  }
]
```

- **Obrigatórios:** `board_id`, `group_id`, `title` (1–200 caracteres). O resto tem padrão.
- Mande **um array** para criar várias numa chamada só.
- `assignee_id` (uuid de um membro) define o responsável — é ele quem recebe as **notificações push**.

### Não duplicar ao rodar de novo: a tag `ref:`

A identidade de uma tarefa vinda de fora é uma tag **`ref:<algo estável>`** em `tags` (a CLI usa o mesmo formato, e
o app a esconde da interface). Antes de criar, procure:

```bash
# tags=cs.{"ref:projeto-x#T1"} — codificado: o "#" cru vira âncora da URL e a busca quebra em silêncio
GET /rest/v1/tasks?select=id,status&board_id=eq.<board_id>&tags=cs.%7B%22ref%3Aprojeto-x%23T1%22%7D
```

Achou → atualize (seção 5). Não achou → crie. **Nunca** identifique tarefa pelo título (títulos mudam e se repetem).

---

## 5. Atualizar status e progresso

```bash
PATCH /rest/v1/tasks?id=eq.<task_id>
{"status": "working", "progress": 40}
```

| `status` | Aparece como |
|---|---|
| `not_started` | Não iniciado |
| `working` | Em andamento |
| `review` | Em revisão |
| `done` | Pronto |
| `stuck` | Travado |

`priority`: `low`, `medium`, `high`, `critical`. `progress`: 0–100.

> **Resposta `[]` (vazia) não é sucesso:** o RLS não devolve erro quando esconde uma linha — devolve nada. Vazio =
> a tarefa não existe ou a conta não é membro daquele workspace.

---

## 6. Subtarefas e comentários

```bash
# Criar subtarefas
POST /rest/v1/subtasks   [{"task_id": "<task_id>", "title": "Escrever o teste", "position": 0}]

# Marcar como feita
PATCH /rest/v1/subtasks?id=eq.<subtask_id>   {"done": true}

# Comentar (author_id TEM de ser o user.id do login — o RLS recusa qualquer outro)
POST /rest/v1/comments   {"task_id": "<task_id>", "author_id": "<user.id>", "body": "Concluído no commit abc123"}
```

---

## 7. O que acontece sozinho

- **Feed de atividades:** criar tarefa, mudar status e comentar viram eventos (gatilhos do banco — não precisa chamar nada).
- **Notificação push:** esses mesmos eventos avisam no celular o **responsável** da tarefa, se não foi ele quem agiu.
- **`updated_at`** é atualizado pelo banco.

---

## 8. Exemplo completo (Node 18+, sem dependências)

```js
const { GP_URL: url, GP_CHAVE: chave, GP_EMAIL: email, GP_SENHA: senha } = process.env

const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: chave, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: senha }),
}).then((r) => r.json())

const api = async (caminho, metodo = 'GET', corpo) => {
  const r = await fetch(`${url}/rest/v1/${caminho}`, {
    method: metodo,
    headers: {
      apikey: chave,
      Authorization: `Bearer ${login.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: corpo && JSON.stringify(corpo),
  })
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  return r.json()
}

const [board] = await api('boards?select=id,name&name=eq.Projeto%20X')
const [grupo] = await api(`groups?select=id&board_id=eq.${board.id}&order=position.asc&limit=1`)

const ref = 'ref:projeto-x#T1'
const [existente] = await api(`tasks?select=id&board_id=eq.${board.id}&tags=cs.${encodeURIComponent(`{"${ref}"}`)}`)

const tarefa = existente
  ?? (await api('tasks', 'POST', [{ board_id: board.id, group_id: grupo.id, title: 'Implementar login', tags: [ref] }]))[0]

await api(`tasks?id=eq.${tarefa.id}`, 'PATCH', { status: 'done', progress: 100 })
await api('comments', 'POST', { task_id: tarefa.id, author_id: login.user.id, body: 'Concluído.' })
```

---

## 9. Erros comuns

| Resposta | Causa e saída |
|---|---|
| `400` em `/auth/v1/token` | E-mail/senha errados, ou URL/chave de outro projeto |
| `401` nas chamadas | Token vencido (1h): renove com o `refresh_token` |
| `[]` num PATCH/GET | Conta não é membro do workspace (falta o convite) ou id errado |
| `403` / `42501` | O RLS recusou: escrever em workspace alheio, ou `author_id` ≠ a própria conta |
| `400` `periodo_coerente` | `due_date` antes de `start_date` |
| `400` `marco_tem_data` | `is_milestone: true` sem `due_date` |
| `400` `check constraint` no título | Título vazio ou com mais de 200 caracteres |
| `409` / `23503` | `group_id` ou `board_id` inexistente |

---

## 10. Segurança

- Só a **chave anon** + o **login da conta de serviço**. A service role nunca sai do servidor.
- Senha por variável de ambiente; nunca em arquivo do projeto, commit, log ou mensagem de erro.
- Vazou? Na tela **Usuários**, troque a senha (Editar) ou exclua a conta; ou remova-a do workspace em
  **Convidar integrantes**. O acesso cai na hora.
