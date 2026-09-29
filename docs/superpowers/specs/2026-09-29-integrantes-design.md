# Convidar Integrantes (sub-projeto 6/6)

**Data:** 2026-09-29 · **Status:** design aprovado em conversa
**Origem:** `docs/superpowers/specs/2026-09-17-casca-sidebar-design.md` — "Convidar
Integrantes funcional" é do sub-projeto 6. Hoje o `BoardShell` tem o botão
"Convidar integrantes — em breve" desabilitado.
Referência visual: Stitch `quadro_de_projetos_tabela_principal` (ícone de convidar no
cabeçalho do board). Não há tela de gestão de membros no Stitch.

## Escopo

- O botão "Convidar integrantes" do board abre o diálogo **Integrantes** do workspace
  **daquele board**.
- Todo membro vê a lista. **Só o dono** do workspace adiciona (por e-mail) e remove.
- Só se convida **quem já tem conta**. Nenhum e-mail é enviado.
- Quem é adicionado passa a ver e editar os boards do workspace de quem convidou,
  **além** dos próprios.

**Fora de escopo:** convite por e-mail para quem não tem conta, papéis/permissões,
trocar de workspace na UI, transferir posse. (Sair por conta própria entrou depois da revisão final — migration 0006, botão "Sair do workspace" para quem não é dono.)

## Decisão sobre `docs/specs.md` — múltiplos workspaces

`specs.md` dizia "um workspace por usuário na v1; a UI não expõe". Convidar faz o
convidado pertencer a dois workspaces. Decisão (aprovada): **reabrir parcialmente** —
ver boards compartilhados, sim; trocar de workspace, não. O "workspace atual" de cada
pessoa continua sendo **o dela** (onde "Novo Painel" e Modelos criam boards).

## Dados — Zona Vermelha

Migration `supabase/migrations/0005_integrantes.{up,down}.sql`. **O agente escreve;
o humano revisa e aplica.** Nada do front de convite é implementado antes de ela
estar no ar.

1. **`adicionar_membro(ws uuid, email text) returns void`** — `security definer`,
   `set search_path = public`:
   - quem chama (`auth.uid()`) não é `workspaces.owner_id` de `ws` → `raise exception`
   - não existe `auth.users` com `lower(email) = lower(trim(email))` → `raise exception`
     com mensagem "nenhuma conta com esse e-mail"
   - senão `insert into workspace_members (workspace_id, user_id) … on conflict do nothing`
   - `grant execute … to authenticated`; `revoke … from public, anon`
2. **Dono não se remove:** política `restrictive` de `delete` em `workspace_members`
   que recusa apagar a linha cujo `user_id` é o `owner_id` do workspace. (Remover
   os outros já é permitido ao dono por `ws_members_delete`, da 0002. A 0006 soma a saída voluntária do membro.)
3. **down:** `drop function` + `drop policy`.

Nenhuma tabela nova, nenhum dado migrado.

**Verificação após aplicar** (pela API, contas A e B — mesmo roteiro da 0003/0004):
A adiciona B por e-mail → B lê os boards de A; B chama `adicionar_membro` no
workspace de A → erro; e-mail inexistente → erro; A tenta remover a si mesmo → nada
removido; A remove B → B deixa de ler os boards de A.

**Risco aceito:** um dono consegue descobrir se um e-mail tem conta (a mensagem de
"nenhuma conta" revela). Inevitável no modelo "só quem já tem conta".

## Serviços e hooks (`src/services/boards.ts`, `src/hooks/useQuadro.ts`)

- `buscarBoard(id)` passa a devolver também `workspace_id` e `owner_id` (do workspace).
- `buscarWorkspaceAtual()` filtra pelo workspace **cujo dono é o usuário logado**, em
  vez do mais antigo visível. Sem isso, o convidado criaria boards no workspace alheio.
- `buscarMembros(workspaceId)` filtra pelos membros **daquele** workspace. Sem isso, a
  lista de responsáveis de um board mostraria gente de outro workspace, que não vê o
  board. Todos os chamadores passam o workspace do board.
- Novos: `adicionarMembro(workspaceId, email)` (RPC) e
  `removerMembro(workspaceId, userId)`, com hooks que invalidam os membros.

## UI

- `BoardShell`: o botão deixa de ser "em breve" e abre `IntegrantesModal`.
- **`IntegrantesModal`** (novo, `src/components/features/`) — compõe `Modal`,
  `Avatar`, `Button`, `Field`, `TextInput`, `StateView`:
  - lista de membros: nome e selo "Dono" (avatar cortado na implementação — ver progresso.md); os quatro estados via
    `StateView`
  - **dono:** campo `type="email"` + "Adicionar"; "Remover" em cada membro menos ele
    mesmo, com confirmação
  - **não dono:** só a lista e a frase "Só o dono do workspace pode convidar."
  - erros do servidor em `role="alert"`; foco preso no modal (já é do `Modal`)
- Justificativa do componente novo registrada em `docs/components.md`.

## Efeitos em telas existentes (sem código novo)

- Meus Painéis / Favoritos passam a listar também os boards compartilhados (o RLS já
  libera).
- `/atividades` passa a mostrar eventos de todos os workspaces visíveis.

## Limitações aceitas

- Membro removido continua como `assignee_id` das tarefas em que estava; ele só deixa
  de vê-las.
- Sem notificação: o convidado descobre ao abrir Meus Painéis.

## Testes (TDD)

- Serviço: `buscarWorkspaceAtual` filtra por dono; `buscarMembros` filtra por
  workspace; `adicionarMembro` chama a RPC e traduz o erro.
- `IntegrantesModal`: dono adiciona (sucesso e e-mail inexistente) e remove; não dono
  não vê controles; loading/erro/vazio/sucesso.
- Axe no modal aberto como dono.

## Docs a atualizar

- `docs/specs.md` — linha "Múltiplos workspaces" vira reabertura parcial
- `docs/data-model.md` — seção da 0005
- `docs/components.md` — `IntegrantesModal`
- `docs/progresso.md` — seção do sub-projeto 6
