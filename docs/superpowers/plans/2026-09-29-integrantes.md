# Convidar Integrantes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O dono de um workspace adiciona (por e-mail, só quem já tem conta) e remove integrantes a partir do botão "Convidar integrantes" do board; todo membro vê a lista.

**Architecture:** Migration 0005 (Zona Vermelha) cria a RPC `adicionar_membro` e impede o dono de se remover. O front ganha `IntegrantesModal`, aberto pelo `BoardShell`. `buscarWorkspaceAtual` passa a filtrar pelo dono e `buscarMembros` pelo workspace do board, porque com convite uma pessoa passa a ver mais de um workspace.

**Tech Stack:** Supabase (Postgres + RLS + RPC), React 19, TanStack Query, Vitest + RTL + vitest-axe, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-09-29-integrantes-design.md`

## Global Constraints

- **ZONA VERMELHA:** a migration é escrita pelo agente e **aplicada pelo humano**. A Task 1 termina num PARE; as Tasks 2 e 3 só começam depois de o humano confirmar que a 0005 está no ar.
- Toda migration tem `down` junto com o `up`. Toda função `security definer` tem `set search_path = public`.
- Só tokens: zero cor/espaço/raio/fonte hardcoded, nada de `bg-[#...]`.
- Mobile-first; alvo de toque ≥ 44px (o `Button` garante).
- Testes consultam por role/label, nunca por classe CSS. Não "consertar" teste mudando asserção — a única asserção antiga que muda é a do botão "Convidar integrantes — em breve", porque o requisito mudou (Task 3 explica).
- Supabase só em `src/services/`. Mensagem crua do banco nunca vai para a tela (`traduzirErro`).
- `npm run verify` verde antes de cada commit: `npm run verify > "$TEMP/verify.log" 2>&1; echo $?` e ler o código de saída de verdade.
- Antes de criar arquivo novo: `/graphify query "já existe algo que faz [X]?"`.

---

### Task 1: Migration 0005 + roteiro de teste (Zona Vermelha — PARE no fim)

**Files:**
- Create: `supabase/migrations/0005_integrantes.up.sql`
- Create: `supabase/migrations/0005_integrantes.down.sql`
- Modify: `docs/data-model.md` (nova seção depois da seção "Teste — `activities` e seus gatilhos (migration 0004)", antes de "## Advisors")

**Interfaces:**
- Produces: RPC `adicionar_membro(p_ws uuid, p_email text) returns void`. Erros: `42501` (quem chama não é dono), `P0002` (nenhuma conta com esse e-mail).
- Produces: política `ws_members_dono_fica` (restrictive, delete) em `workspace_members`.

- [ ] **Step 1: Escrever o up** — `supabase/migrations/0005_integrantes.up.sql`

```sql
-- 0005 — Convidar integrantes (sub-projeto 6/6).
-- docs/superpowers/specs/2026-09-29-integrantes-design.md
--
-- Achar alguem por e-mail exige ler auth.users, que o cliente nao enxerga. A
-- funcao e security definer por isso — e por isso checa o dono ANTES de tudo.

create or replace function adicionar_membro(p_ws uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  novo uuid;
begin
  if not exists (select 1 from workspaces where id = p_ws and owner_id = auth.uid()) then
    raise exception 'so o dono do workspace adiciona integrantes' using errcode = '42501';
  end if;

  select u.id into novo from auth.users u where lower(u.email) = lower(trim(p_email));
  if novo is null then
    raise exception 'nenhuma conta com esse e-mail' using errcode = 'P0002';
  end if;

  insert into workspace_members (workspace_id, user_id) values (p_ws, novo)
  on conflict do nothing;
end;
$fn$;

revoke execute on function adicionar_membro(uuid, text) from public, anon;
grant execute on function adicionar_membro(uuid, text) to authenticated;

-- O dono remove os outros (ws_members_write, 0001), nunca a si mesmo: o workspace
-- ficaria sem o dono na lista de membros e o RLS dele pararia de liberar os boards.
-- Restrictive: soma-se (AND) as politicas permissivas existentes.
create policy ws_members_dono_fica on workspace_members
  as restrictive for delete to authenticated
  using (user_id <> (select w.owner_id from workspaces w where w.id = workspace_id));
```

- [ ] **Step 2: Escrever o down** — `supabase/migrations/0005_integrantes.down.sql`

```sql
drop policy if exists ws_members_dono_fica on workspace_members;
drop function if exists adicionar_membro(uuid, text);
```

- [ ] **Step 3: Roteiro de teste em `docs/data-model.md`** — nova seção:

````markdown
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
````

- [ ] **Step 4: Commit (só arquivos — nada é aplicado)**

```bash
git add supabase/migrations/0005_integrantes.up.sql supabase/migrations/0005_integrantes.down.sql
git add -p docs/data-model.md   # só o hunk da seção nova; o working tree tem UUIDs reais não relacionados
git commit -m "feat(db): migration 0005 adicionar_membro + dono não se remove (não aplicada)"
```

- [ ] **Step 5: PARE.** Mostrar ao humano os dois SQL. Ele revisa, aplica a 0005 e roda o roteiro (ou pede ao agente para rodar o roteiro e `get_advisors` pelo MCP). As Tasks 2 e 3 só começam depois de "0005 aplicada".

---

### Task 2: Serviços e hooks cientes de mais de um workspace

**Files:**
- Modify: `src/services/boards.ts` (`buscarWorkspaceAtual`, `buscarBoard`, `buscarMembros`; novos `adicionarMembro`, `removerMembro`)
- Modify: `src/services/boards.test.ts` (mock do supabase ganha `rpc` e `auth.getSession`; testes novos)
- Modify: `src/hooks/useQuadro.ts` (`chaves.membros`, `useMembros`, novos `useAdicionarMembro`, `useRemoverMembro`)
- Modify: `src/pages/BoardPage.tsx:16`, `src/pages/KanbanPage.tsx:15`, `src/components/features/Sidebar.tsx:65` (passar o workspace ao `useMembros`)
- Modify (fixtures, não asserções): `src/pages/DashboardPage.test.tsx` (4× mock de `buscarBoard`), `src/test/a11y.test.tsx:106`

**Interfaces:**
- Consumes: RPC `adicionar_membro(p_ws, p_email)` da Task 1.
- Produces:
  - `buscarBoard(id): Promise<{ id: string; name: string; workspace_id: string; owner_id: string }>`
  - `buscarWorkspaceAtual(): Promise<{ id: string; name: string }>` — o workspace **cujo dono é o usuário logado**
  - `buscarMembros(workspaceId: string): Promise<Profile[]>` — ordenado por `full_name`
  - `adicionarMembro(workspaceId: string, email: string): Promise<void>` — `P0002` vira `ErroDeDados('Nenhuma conta com esse e-mail.')`
  - `removerMembro(workspaceId: string, userId: string): Promise<void>`
  - `useMembros(workspaceId: string | undefined)` (desabilitado sem id)
  - `useAdicionarMembro().mutate({ workspaceId, email })`, `useRemoverMembro().mutate({ workspaceId, userId })` — ambos invalidam `['membros', workspaceId]`

- [ ] **Step 1: Escrever os testes que falham** — em `src/services/boards.test.ts`, trocar o `vi.mock` do topo por:

```ts
vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn(), auth: { getSession: vi.fn() } },
}))
```

trocar o import de `./boards` por:

```ts
import { adicionarMembro, buscarMembros, buscarWorkspaceAtual, criarBoard } from './boards'
```

e acrescentar no fim do arquivo:

```ts
describe('buscarWorkspaceAtual', () => {
  beforeEach(() => vi.resetAllMocks())

  it('pega o workspace do qual a pessoa é dona, não o primeiro visível', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null } as never)
    const eq = vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'w1', name: 'Meu Workspace' }, error: null }) }))
    vi.mocked(supabase.from).mockReturnValue({ select: () => ({ eq }) } as never)

    await expect(buscarWorkspaceAtual()).resolves.toEqual({ id: 'w1', name: 'Meu Workspace' })
    expect(supabase.from).toHaveBeenCalledWith('workspaces')
    expect(eq).toHaveBeenCalledWith('owner_id', 'u1')
  })
})

describe('buscarMembros', () => {
  beforeEach(() => vi.resetAllMocks())

  it('lista só os membros do workspace pedido, em ordem de nome', async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [
        { perfil: { id: 'u2', full_name: 'Beto Souza', avatar_url: null } },
        { perfil: { id: 'u1', full_name: 'Ana Lima', avatar_url: null } },
      ],
      error: null,
    })
    vi.mocked(supabase.from).mockReturnValue({ select: () => ({ eq }) } as never)

    const membros = await buscarMembros('w1')

    expect(supabase.from).toHaveBeenCalledWith('workspace_members')
    expect(eq).toHaveBeenCalledWith('workspace_id', 'w1')
    expect(membros.map((m) => m.full_name)).toEqual(['Ana Lima', 'Beto Souza'])
  })
})

describe('adicionarMembro', () => {
  beforeEach(() => vi.resetAllMocks())

  it('chama a RPC com o workspace e o e-mail', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never)
    await adicionarMembro('w1', 'b@x.com')
    expect(supabase.rpc).toHaveBeenCalledWith('adicionar_membro', { p_ws: 'w1', p_email: 'b@x.com' })
  })

  it('e-mail sem conta (P0002) vira mensagem de domínio, não a do banco', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: 'P0002', message: 'nenhuma conta com esse e-mail' },
    } as never)
    await expect(adicionarMembro('w1', 'z@x.com')).rejects.toThrow('Nenhuma conta com esse e-mail.')
  })

  it('quem não é dono (42501) recebe a mensagem de permissão', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'so o dono do workspace adiciona integrantes' },
    } as never)
    await expect(adicionarMembro('w1', 'b@x.com')).rejects.toThrow('Você não tem permissão para isso.')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/services/boards.test.ts`
Expected: FAIL — `adicionarMembro` não existe; `buscarMembros` não aceita workspace; `buscarWorkspaceAtual` não filtra por dono.

- [ ] **Step 3: Implementar os serviços** — `src/services/boards.ts`

Import: `import { ErroDeDados, traduzirErro } from './erros'`.

Trocar `buscarWorkspaceAtual` (no JSDoc, trocar "Na v1 ha um workspace por usuario" por "o workspace do qual a pessoa é dona — convidada em outro, ela vê os dois, mas cria no dela"):

```ts
export async function buscarWorkspaceAtual(): Promise<{ id: string; name: string }> {
  const { data: sessao } = await supabase.auth.getSession()
  const dono = sessao.session?.user.id
  if (!dono) throw new ErroDeDados('Sua sessão expirou. Entre de novo.')

  const { data, error } = await supabase.from('workspaces').select('id, name').eq('owner_id', dono).single()
  if (error) throw traduzirErro(error)
  return data
}
```

Trocar `buscarBoard`:

```ts
/** Board + workspace e dono — o diálogo de integrantes precisa dos dois. */
export async function buscarBoard(
  id: string,
): Promise<{ id: string; name: string; workspace_id: string; owner_id: string }> {
  const { data, error } = await supabase
    .from('boards')
    .select('id, name, workspace_id, workspace:workspaces(owner_id)')
    .eq('id', id)
    .single()
  if (error) throw traduzirErro(error)
  const linha = data as unknown as { id: string; name: string; workspace_id: string; workspace: { owner_id: string } }
  return { id: linha.id, name: linha.name, workspace_id: linha.workspace_id, owner_id: linha.workspace.owner_id }
}
```

Trocar `buscarMembros` (manter o JSDoc existente, acrescentando que agora é por workspace):

```ts
export async function buscarMembros(workspaceId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('perfil:profiles(id, full_name, avatar_url)')
    .eq('workspace_id', workspaceId)
  if (error) throw traduzirErro(error)

  const linhas = (data ?? []) as unknown as { perfil: Profile }[]
  return linhas.map((l) => l.perfil).sort((x, y) => x.full_name.localeCompare(y.full_name, 'pt-BR'))
}
```

Acrescentar, logo depois de `buscarMembros`:

```ts
/** Só o dono consegue (RPC da 0005). Só acha quem já tem conta — nenhum e-mail é enviado. */
export async function adicionarMembro(workspaceId: string, email: string): Promise<void> {
  const { error } = await supabase.rpc('adicionar_membro', { p_ws: workspaceId, p_email: email })
  // P0002 é o raise da 0005 para e-mail sem conta — a única mensagem de domínio da RPC.
  if (error?.code === 'P0002') throw new ErroDeDados('Nenhuma conta com esse e-mail.', error)
  if (error) throw traduzirErro(error)
}

/** RLS: só o dono apaga, e nunca a própria linha (0005). */
export async function removerMembro(workspaceId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
  if (error) throw traduzirErro(error)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/services/boards.test.ts`
Expected: PASS (todos, inclusive os 2 de `criarBoard`).

- [ ] **Step 5: Hooks** — `src/hooks/useQuadro.ts`

Acrescentar `adicionarMembro` e `removerMembro` ao import de `@/services/boards`. Em `chaves`, trocar `membros: ['membros'] as const,` por:

```ts
  membros: (workspaceId: string) => ['membros', workspaceId] as const,
```

Ajustar qualquer outro uso de `chaves.membros` (`grep -n "chaves.membros" src/hooks/useQuadro.ts`). Trocar `useMembros` e acrescentar os dois hooks de escrita logo depois:

```ts
/** Membros do workspace de um board — com convite, a pessoa vê mais de um workspace. */
export function useMembros(workspaceId: string | undefined) {
  return useQuery({
    queryKey: chaves.membros(workspaceId ?? ''),
    queryFn: () => buscarMembros(workspaceId as string),
    enabled: Boolean(workspaceId),
  })
}

export function useAdicionarMembro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, email }: { workspaceId: string; email: string }) => adicionarMembro(workspaceId, email),
    onSuccess: (_nada, { workspaceId }) => {
      void qc.invalidateQueries({ queryKey: chaves.membros(workspaceId) })
    },
  })
}

export function useRemoverMembro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, userId }: { workspaceId: string; userId: string }) => removerMembro(workspaceId, userId),
    onSuccess: (_nada, { workspaceId }) => {
      void qc.invalidateQueries({ queryKey: chaves.membros(workspaceId) })
    },
  })
}
```

- [ ] **Step 6: Chamadores**

- `src/pages/BoardPage.tsx:16` e `src/pages/KanbanPage.tsx:15`: `const membros = useMembros(board.data?.workspace_id)` (o `const board = useBoard(boardId)` já existe logo acima).
- `src/components/features/Sidebar.tsx:65`: `const membros = useMembros(workspace.data?.id)` (a Sidebar só usa os membros para achar o próprio perfil, que está no próprio workspace).

- [ ] **Step 7: Fixtures dos testes existentes** (o tipo de retorno de `buscarBoard` cresceu; o typecheck reprova mocks sem os campos novos). Só o dado do mock muda, nenhuma asserção:

- `src/pages/DashboardPage.test.tsx` (4 ocorrências): `mockResolvedValue({ id: 'b1', name: 'Meu Board', workspace_id: 'w1', owner_id: 'u1' })`
- `src/test/a11y.test.tsx:106`: `mockResolvedValue({ id: 'b1', name: 'Sprint Alpha Q3', workspace_id: 'w1', owner_id: 'u1' })`

Rodar `npm run build` para achar qualquer outro mock de `buscarBoard` ou `useMembros()` sem argumento que o grep não pegou, e corrigir do mesmo jeito.

- [ ] **Step 8: verify + commit**

```bash
npm run verify > "$TEMP/verify.log" 2>&1; echo $?   # tem que ser 0
git add src/services/boards.ts src/services/boards.test.ts src/hooks/useQuadro.ts src/pages/BoardPage.tsx src/pages/KanbanPage.tsx src/components/features/Sidebar.tsx src/pages/DashboardPage.test.tsx src/test/a11y.test.tsx
git commit -m "feat(integrantes): workspace atual é o do dono; membros por workspace; adicionar/remover"
```

---

### Task 3: `IntegrantesModal` + botão do `BoardShell` + docs

**Files:**
- Create: `src/components/features/IntegrantesModal.tsx`
- Create: `src/components/features/IntegrantesModal.test.tsx`
- Modify: `src/components/features/BoardShell.tsx` (botão "Convidar integrantes" funcional)
- Modify: `src/components/features/BoardShell.test.tsx` (mock de `buscarBoard`; o botão sai da lista "em breve")
- Modify: `src/test/a11y.test.tsx` (caso do modal aberto como dono)
- Modify: `docs/components.md`, `docs/specs.md:153`, `docs/progresso.md`

**Interfaces:**
- Consumes: `useMembros(workspaceId)`, `useAdicionarMembro()`, `useRemoverMembro()`, `useBoard(boardId)` (agora com `workspace_id`, `owner_id`), `useSessao()`.
- Produces: `IntegrantesModal({ aberto, aoFechar, workspaceId, donoId }: { aberto: boolean; aoFechar: () => void; workspaceId: string; donoId: string })`

- [ ] **Step 1: Escrever o teste que falha** — `src/components/features/IntegrantesModal.test.tsx`

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SessaoContext } from '@/hooks/sessaoContext'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarMembros: vi.fn(),
  adicionarMembro: vi.fn(),
  removerMembro: vi.fn(),
}))

import * as servico from '@/services/boards'
import { IntegrantesModal } from './IntegrantesModal'

const DONA = { usuario: { id: 'u1', email: 'ana@x.com' }, carregando: false }
const CONVIDADO = { usuario: { id: 'u2', email: 'beto@x.com' }, carregando: false }
const MEMBROS = [
  { id: 'u1', full_name: 'Ana Lima', avatar_url: null },
  { id: 'u2', full_name: 'Beto Souza', avatar_url: null },
]

function renderizar(sessao: typeof DONA) {
  const { wrapper: QueryWrapper } = criarWrapper()
  render(
    <SessaoContext.Provider value={sessao}>
      <QueryWrapper>
        <IntegrantesModal aberto aoFechar={vi.fn()} workspaceId="w1" donoId="u1" />
      </QueryWrapper>
    </SessaoContext.Provider>,
  )
}

describe('IntegrantesModal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(servico.buscarMembros).mockResolvedValue(MEMBROS)
  })

  it('lista os membros do workspace e marca a dona', async () => {
    renderizar(DONA)
    const lista = await screen.findByRole('list', { name: 'Integrantes do workspace' })
    expect(within(lista).getByText('Ana Lima')).toBeInTheDocument()
    expect(within(lista).getByText('Beto Souza')).toBeInTheDocument()
    expect(within(lista).getByText('Dono')).toBeInTheDocument()
    expect(servico.buscarMembros).toHaveBeenCalledWith('w1')
  })

  it('dona adiciona por e-mail e o campo limpa', async () => {
    vi.mocked(servico.adicionarMembro).mockResolvedValue()
    const user = userEvent.setup()
    renderizar(DONA)

    const campo = await screen.findByLabelText('E-mail de quem já tem conta')
    await user.type(campo, 'carla@x.com')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    expect(servico.adicionarMembro).toHaveBeenCalledWith('w1', 'carla@x.com')
    await vi.waitFor(() => expect(campo).toHaveValue(''))
  })

  it('e-mail sem conta mostra o erro em alerta', async () => {
    vi.mocked(servico.adicionarMembro).mockRejectedValue(new Error('Nenhuma conta com esse e-mail.'))
    const user = userEvent.setup()
    renderizar(DONA)

    await user.type(await screen.findByLabelText('E-mail de quem já tem conta'), 'z@x.com')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Nenhuma conta com esse e-mail.')
  })

  it('dona remove outro membro depois de confirmar, e não tem botão para remover a si mesma', async () => {
    vi.mocked(servico.removerMembro).mockResolvedValue()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderizar(DONA)

    await user.click(await screen.findByRole('button', { name: 'Remover Beto Souza' }))

    expect(window.confirm).toHaveBeenCalled()
    expect(servico.removerMembro).toHaveBeenCalledWith('w1', 'u2')
    expect(screen.queryByRole('button', { name: 'Remover Ana Lima' })).not.toBeInTheDocument()
  })

  it('cancelar a confirmação não remove ninguém', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    renderizar(DONA)

    await user.click(await screen.findByRole('button', { name: 'Remover Beto Souza' }))

    expect(servico.removerMembro).not.toHaveBeenCalled()
  })

  it('quem não é dono só vê a lista e o motivo', async () => {
    renderizar(CONVIDADO)
    await screen.findByRole('list', { name: 'Integrantes do workspace' })
    expect(screen.getByText('Só o dono do workspace pode convidar.')).toBeInTheDocument()
    expect(screen.queryByLabelText('E-mail de quem já tem conta')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Remover/ })).not.toBeInTheDocument()
  })

  it('erro ao carregar os membros aparece no StateView', async () => {
    vi.mocked(servico.buscarMembros).mockRejectedValue(new Error('Não foi possível completar a operação. Tente de novo.'))
    renderizar(DONA)
    expect(await screen.findByText('Não foi possível completar a operação. Tente de novo.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/components/features/IntegrantesModal.test.tsx`
Expected: FAIL — `./IntegrantesModal` não existe.

- [ ] **Step 3: Implementação** — `src/components/features/IntegrantesModal.tsx`

```tsx
import { useState, type FormEvent } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { StateView } from '@/components/ui/StateView'
import { TextInput } from '@/components/ui/TextInput'
import { useAdicionarMembro, useMembros, useRemoverMembro } from '@/hooks/useQuadro'
import { useSessao } from '@/hooks/useSessao'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import type { Profile } from '@/types/domain'

interface Props {
  aberto: boolean
  aoFechar: () => void
  workspaceId: string
  donoId: string
}

/** Integrantes do workspace do board. Todos veem; só o dono adiciona e remove. */
export function IntegrantesModal({ aberto, aoFechar, workspaceId, donoId }: Props) {
  return (
    <Modal open={aberto} onClose={aoFechar} title="Integrantes">
      {aberto && <Conteudo workspaceId={workspaceId} donoId={donoId} />}
    </Modal>
  )
}

function Conteudo({ workspaceId, donoId }: { workspaceId: string; donoId: string }) {
  const membros = useMembros(workspaceId)
  const { usuario } = useSessao()
  const adicionar = useAdicionarMembro()
  const remover = useRemoverMembro()
  const [email, setEmail] = useState('')
  const souDono = usuario?.id === donoId
  const erro = adicionar.error ?? remover.error

  function aoSubmeter(e: FormEvent) {
    e.preventDefault()
    const limpo = email.trim()
    if (!limpo) return
    adicionar.mutate({ workspaceId, email: limpo }, { onSuccess: () => setEmail('') })
  }

  function aoRemover(membro: Profile) {
    // ponytail: confirm() nativo; diálogo próprio só se o texto precisar de formatação.
    if (!window.confirm(`Remover ${membro.full_name} do workspace?`)) return
    remover.mutate({ workspaceId, userId: membro.id })
  }

  const estado = estadoDaQuery(membros, { titulo: 'Nenhum integrante' }, () => void membros.refetch())

  return (
    <div className="flex flex-col gap-space-md">
      {souDono ? (
        <form onSubmit={aoSubmeter} className="flex flex-col gap-space-sm">
          <Field label="E-mail de quem já tem conta">
            <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" variant="primary" loading={adicionar.isPending} className="self-end">
            Adicionar
          </Button>
        </form>
      ) : (
        <p className="text-body text-ink-muted">Só o dono do workspace pode convidar.</p>
      )}

      {erro && (
        <p role="alert" className="rounded bg-danger-soft px-space-md py-space-sm text-body text-danger-ink">
          {erro.message}
        </p>
      )}

      <StateView estado={estado}>
        <ul aria-label="Integrantes do workspace" className="flex flex-col gap-space-sm">
          {membros.data?.map((m) => (
            <li key={m.id} className="flex min-h-touch items-center gap-space-sm">
              <Avatar users={[m]} size="sm" />
              <span className="min-w-0 flex-1 truncate text-body text-ink">{m.full_name}</span>
              {m.id === donoId && <Badge variant="soft">Dono</Badge>}
              {souDono && m.id !== donoId && (
                <Button variant="ghost" size="sm" disabled={remover.isPending} onClick={() => aoRemover(m)}>
                  Remover{' '}
                  <span className="sr-only">{m.full_name}</span>
                </Button>
              )}
            </li>
          ))}
        </ul>
      </StateView>
    </div>
  )
}
```

Se `Badge` sem `tone` não renderizar legível, usar o mesmo `tone` de outro uso de `variant="soft"` no código (procurar `variant="soft"` em `src/components`). Se `TextInput` não repassar `type`/`required`, conferir as props dele antes de mudar qualquer coisa.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/components/features/IntegrantesModal.test.tsx`
Expected: PASS (7 testes). Se o nome acessível do botão vier sem o espaço ("RemoverBeto Souza"), corrigir o JSX, nunca a asserção.

- [ ] **Step 5: Ligar no `BoardShell`** — `src/components/features/BoardShell.tsx`

Imports: `useState` junto do `useEffect`; `import { useBoard } from '@/hooks/useQuadro'`; `import { IntegrantesModal } from './IntegrantesModal'`. No corpo, depois do `useParams`:

```tsx
  const board = useBoard(boardId)
  const [integrantesAberto, setIntegrantesAberto] = useState(false)
```

Trocar o botão "Convidar integrantes — em breve" por:

```tsx
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            disabled={!board.data}
            onClick={() => setIntegrantesAberto(true)}
            aria-label="Convidar integrantes"
            iconStart={<UserPlus aria-hidden="true" className="size-4" />}
          />
```

e, depois de `{children}` (ainda dentro do `<div>` externo):

```tsx
      {board.data && (
        <IntegrantesModal
          aberto={integrantesAberto}
          aoFechar={() => setIntegrantesAberto(false)}
          workspaceId={board.data.workspace_id}
          donoId={board.data.owner_id}
        />
      )}
```

No comentário acima dos ícones, trocar "a estrela de favorito já funciona (sub-projeto 3)" por "a estrela (sub-projeto 3) e convidar (sub-projeto 6) já funcionam".

- [ ] **Step 6: `BoardShell.test.tsx`**

Acrescentar `buscarBoard: vi.fn(),` no `vi.mock` e, no `beforeEach`, `vi.mocked(servico.buscarBoard).mockResolvedValue({ id: 'b1', name: 'Sprint Alpha', workspace_id: 'w1', owner_id: 'u1' })`. No teste "os ícones ainda não implementados seguem desabilitados", **remover** `'Convidar integrantes — em breve'` da lista — o requisito mudou (o botão deixou de ser "em breve"); isso não é afrouxar a asserção. Acrescentar:

```tsx
  it('"Convidar integrantes" habilita quando o board carrega', async () => {
    renderizar()
    const botao = await screen.findByRole('button', { name: 'Convidar integrantes' })
    await vi.waitFor(() => expect(botao).toBeEnabled())
  })
```

Run: `npx vitest run src/components/features/BoardShell.test.tsx`
Expected: PASS.

- [ ] **Step 7: a11y** — `src/test/a11y.test.tsx`

Acrescentar `adicionarMembro: vi.fn(), removerMembro: vi.fn(),` ao `vi.mock('@/services/boards', ...)`, `import { IntegrantesModal } from '@/components/features/IntegrantesModal'`, e o caso (usa `SESSAO_LOGADA`, cujo `usuario.id` é `'u1'`, e `MEMBROS`, já declarados no arquivo e mockados no `beforeEach`):

```tsx
  it('IntegrantesModal aberto como dono não tem violação WCAG', async () => {
    const { wrapper: QueryWrapper } = criarWrapper()
    const { findByRole } = render(
      <SessaoContext.Provider value={SESSAO_LOGADA}>
        <QueryWrapper>
          <IntegrantesModal aberto aoFechar={() => {}} workspaceId="w1" donoId="u1" />
        </QueryWrapper>
      </SessaoContext.Provider>,
    )
    const dialogo = await findByRole('dialog', { name: 'Integrantes' })
    await findByRole('list', { name: 'Integrantes do workspace' })
    expect(await axe(dialogo)).toHaveNoViolations()
  })
```

Run: `npx vitest run src/test/a11y.test.tsx -t IntegrantesModal`
Expected: PASS.

- [ ] **Step 8: Docs**

`docs/components.md` — linha nova na tabela de features, depois de `FeedAtividades`:

```markdown
| `IntegrantesModal` | Modal, Avatar, Badge, Button, Field, TextInput, StateView | diálogo do botão "Convidar integrantes" do `BoardShell`. Novo porque nenhum modal existente lista pessoas; `BoardFormModal`/`TaskModal` editam uma entidade só |
```

e, se a linha/nota do `BoardShell` citar os ícones desabilitados, incluir que "convidar" agora abre `IntegrantesModal`.

`docs/specs.md:153` — trocar a linha "Múltiplos workspaces por usuário" por:

```markdown
| ~~Múltiplos workspaces por usuário~~ | **Reaberto em parte** no sub-projeto 6 (2026-09-29): quem é convidado vê e edita os boards do workspace de quem convidou, além dos próprios. O "workspace atual" continua sendo o da própria pessoa (onde ela cria boards). Continua fora: trocar de workspace na UI, transferir posse — `docs/superpowers/specs/2026-09-29-integrantes-design.md` |
```

`docs/progresso.md` — seção nova depois da do sub-projeto 5:

```markdown
## Sub-projeto 6/6 — Convidar Integrantes ✅

Spec: `docs/superpowers/specs/2026-09-29-integrantes-design.md` · Plano: `docs/superpowers/plans/2026-09-29-integrantes.md`

- [x] Migration `0005_integrantes` (Zona Vermelha): RPC `adicionar_membro` e dono que não se remove; escrita pelo agente, aplicada pelo humano
- [x] "Convidar integrantes" no board abre a lista de integrantes do workspace daquele board
- [x] Dono adiciona por e-mail (só quem já tem conta) e remove com confirmação; os outros só veem
- [x] Workspace atual = o da própria pessoa; responsáveis = membros do workspace do board

**Cortado:** convite por e-mail para quem não tem conta, papéis, sair do workspace, trocar de workspace, transferir posse.
**Limitações aceitas:** membro removido continua como responsável das tarefas que tinha; sem notificação; o dono descobre se um e-mail tem conta.
```

- [ ] **Step 9: verify + commit**

```bash
npm run verify > "$TEMP/verify.log" 2>&1; echo $?   # tem que ser 0
git add src/components/features/IntegrantesModal.tsx src/components/features/IntegrantesModal.test.tsx src/components/features/BoardShell.tsx src/components/features/BoardShell.test.tsx src/test/a11y.test.tsx docs/components.md docs/specs.md docs/progresso.md
git commit -m "feat(integrantes): diálogo de integrantes no board"
```

---

## Fase 6 (depois das três tarefas — manual §8)

1. `npm run dup` e `npm run dead` isolados, lendo o exit code.
2. `/ponytail-review` e `/ponytail-debt`.
3. Reauditoria código-vs-doc (§8.4): `components.md`, `specs.md`, `data-model.md`, `progresso.md`.
4. `get_advisors` (security + performance) no Supabase depois da 0005 aplicada.
5. `graphify update .`
