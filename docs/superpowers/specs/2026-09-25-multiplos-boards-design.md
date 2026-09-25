# Múltiplos boards (sub-projeto 2/6)

**Data:** 2026-09-25 · **Status:** design aprovado em conversa, aguardando revisão do arquivo
**Origem:** `docs/superpowers/specs/2026-09-17-casca-sidebar-design.md` — sub-projeto 2
da ordem acordada (Casca → **Múltiplos boards** → Favoritos → Atividades → Modelos →
Convidar). Esse spec entregou "+ Novo Painel" desabilitado e `/paineis` como
`EmConstrucaoPage`; este aqui liga os dois.

## Escopo

CRUD completo de boards dentro do workspace do usuário: criar, listar, renomear, excluir.

**Sem migration.** O schema já suporta N boards por workspace (`boards.workspace_id`),
o RLS isola por workspace e não por board, e o `on delete cascade` já existe em toda a
cadeia `boards → groups → tasks → subtasks / comments / task_dependencies`
(`supabase/migrations/0001_init.up.sql`).

**Fora de escopo aqui:**

| Item | Por quê |
|---|---|
| Arquivar (soft delete) | Exigiria coluna nova = migration = Zona Vermelha. Decidido: exclusão definitiva com confirmação |
| Contagem de tarefas no card | Não pedida. Barata (`tasks(count)` embutido no PostgREST) — entra se pedirem |
| Reordenar boards | Ordem é `created_at` crescente |
| Favoritar board | Sub-projeto 3 |
| Múltiplos workspaces | Continua cortado (`docs/specs.md`, seção 4) |
| Impedir no banco um workspace sem nenhum board | Ver "Casos de borda" — limitação aceita |

## Roteamento

| Antes | Depois |
|---|---|
| `/` → `BoardPage` | `/` → `AberturaPage` (redireciona) |
| `/kanban`, `/gantt`, `/dashboard` | `/boards/:boardId/kanban`, `/gantt`, `/dashboard` |
| — | `/boards/:boardId` → `BoardPage` |
| `/paineis` → `EmConstrucaoPage` | `/paineis` → `PaineisPage` |

Sem redirecionamento das rotas antigas: o app não tem usuários além das contas de teste.

**`AberturaPage`** busca `useBoards()`, lê `localStorage['ultimoBoardId']` e faz
`<Navigate replace>` para esse id **se ele estiver na lista**; senão, para o primeiro
board (mais antigo). Lista vazia → estado vazio do `StateView` com ação "Criar painel".

**`BoardShell`** lê `boardId` via `useParams()` (já lê `useLocation()` do mesmo jeito),
monta as abas com `/boards/${boardId}...` e grava `ultimoBoardId` no `localStorage` num
`useEffect` — é o único ponto comum às 4 views. Leitura e escrita do `localStorage` ficam
em `try/catch` (navegador com armazenamento bloqueado não pode quebrar a navegação).

## Dados

**`src/services/boards.ts`** — `buscarBoardAtual` é removida. Entram:

| Função | O quê |
|---|---|
| `buscarBoards()` | `id, name, created_at` de todos os boards visíveis (RLS), por `created_at` crescente |
| `buscarBoard(id)` | `id, name` de um board |
| `criarBoard(workspaceId, name)` | insere o board e depois um grupo `'A fazer'` / `'azure'` / posição 0 — espelha o `handle_new_user`. Dois inserts sequenciais, não RPC: a janela de falha entre eles é mínima e uma function nova seria migration |
| `renomearBoard(id, name)` | update |
| `removerBoard(id)` | delete; o cascade apaga o resto |

**`src/hooks/useQuadro.ts`** — `useBoardAtual` é removido. Chaves novas:
`boards: ['boards']`, `board: (id) => ['board', id]` (substitui a chave fixa `['board']`).

| Hook | Detalhe |
|---|---|
| `useBoards()` | serve a lista **e** a `AberturaPage` — uma query só pras duas |
| `useBoard(boardId)` | `enabled: Boolean(boardId)`, mesmo padrão de `useGruposComTarefas` |
| `useCriarBoard()` | invalida `boards` |
| `useRenomearBoard()` | invalida `boards` e `board(id)` |
| `useExcluirBoard()` | invalida `boards` |

Sem update otimista nas três mutações: são ações deliberadas com botão em `loading`,
mesmo raciocínio já documentado em `useCriarTarefa`.

`workspaceId` para `criarBoard` vem de `useWorkspaceAtual()` no componente que dispara
(já em cache — a Sidebar usa a mesma query pro nome do workspace).

**Páginas de view** (`BoardPage`, `KanbanPage`, `GanttPage`, `DashboardPage`): trocam
`useBoardAtual()` por `useParams()` + `useBoard(boardId)`. São 2 linhas repetidas nas 4
— **não** vira hook compartilhado: o que as 4 têm em comum é só isso, e extrair uma
abstração para 2 linhas é o erro oposto da regra dos três. Decisão consciente, registrada
aqui para não ser "descoberta" por um `npm run dup` futuro.

## Componentes

Nenhum primitivo novo em `src/components/ui/` — o teto de 12 continua em 12. Tudo abaixo
é composição e entra na Tabela 2 de `docs/components.md`.

| Componente | Compõe | Papel |
|---|---|---|
| `pages/AberturaPage` | StateView | redirecionamento da raiz |
| `pages/PaineisPage` | StateView, Button, BoardCard, BoardFormModal, ExcluirBoardDialog | lista "Meus Painéis", 4 estados, grid responsivo, "+ Novo Painel" |
| `features/BoardCard` | Menu | nome + data de criação; corpo é `Link` para `/boards/:id`; `Menu` com "Renomear"/"Excluir" fora da área do link |
| `features/BoardFormModal` | Modal (md), Field, TextInput, Button | criar **e** renomear. `board: {id, name} \| null` — `null` = criar. Mesma dualidade do `TaskModal`. Valida 1–120 caracteres (constraint do banco). Ao criar, navega pro board novo |
| `features/ExcluirBoardDialog` | Modal (md), Field, TextInput, Button (`danger`) | "Excluir" só habilita quando o texto digitado é **igual** ao nome do board. Se for o último board, não oferece exclusão e explica por quê |

`ExcluirBoardDialog` é separado do `BoardFormModal` porque a regra é outra (destrutiva,
confirmação por digitação) — juntar os dois criaria um componente com dois modos que não
compartilham nada além do `Modal`.

`PaineisPage` é dona do estado de qual board está sendo renomeado/excluído e passa
callbacks para `BoardCard` — mesmo padrão de `BoardPage`/`TaskGroup` com `taskIdModal`.

**Sidebar:** "Novo Painel" perde o `disabled` e o `aria-label` "— em breve"; abre a sua
própria instância de `BoardFormModal` (estado local, sem singleton global — igual ao
`TaskModal` instanciado em duas páginas hoje). Ao criar, fecha o drawer mobile.

## Casos de borda

- **Board da URL não existe mais** (apagado em outra aba, por outro membro, ou id
  digitado à mão / de outro workspace — RLS devolve 0 linhas): as 4 páginas de view
  fazem `<Navigate to="/paineis" replace />` quando `useBoard` falha. O estado de erro
  genérico ofereceria "tentar de novo", que não recupera um board que não existe.
- **`ultimoBoardId` apontando pra board apagado**: coberto pela `AberturaPage`.
- **Excluir o último board**: bloqueado só no cliente. Duas abas excluindo os dois
  últimos boards ao mesmo tempo ainda podem zerar o workspace — limitação aceita, mesmo
  espírito do corte "Colaboração em tempo real" do `docs/specs.md`. Se acontecer,
  `PaineisPage` e `AberturaPage` mostram estado vazio com "Criar painel", nunca tela
  quebrada.
- **Falha no segundo insert de `criarBoard`** (grupo padrão): o erro sobe como qualquer
  outro (`traduzirErro`) e o board fica sem grupo. Mesma janela mínima aceita acima.

## Testes

RED → GREEN, consulta por role/label, `services/` sem teste isolado (coberto por quem
mocka o serviço — padrão do projeto).

**Novos:** `BoardCard.test.tsx`, `BoardFormModal.test.tsx` (criar e renomear, nome vazio
bloqueia), `ExcluirBoardDialog.test.tsx` (digitar habilita, nome diferente mantém
desabilitado, último board), `PaineisPage.test.tsx` (4 estados), `AberturaPage.test.tsx`
(`localStorage` válido, inválido, ausente, lista vazia).

**Atualizados** — os que hoje citam `buscarBoardAtual`/`useBoardAtual` ou renderizam
sem `:boardId` na rota (levantado por grep, não suposto):
`src/pages/DashboardPage.test.tsx`, `src/hooks/useQuadro.test.tsx`,
`src/test/a11y.test.tsx`, `src/components/features/BoardShell.test.tsx` e
`src/components/features/Sidebar.test.tsx` (o botão "Novo Painel" deixa de estar
desabilitado). Mock troca de `buscarBoardAtual` para `buscarBoard`; render passa a usar
`<MemoryRouter initialEntries={['/boards/b1']}>` com a rota parametrizada.

`BoardPage`, `KanbanPage` e `GanttPage` **não têm teste próprio hoje** (cobertura vem do
`a11y.test.tsx` e dos componentes filhos). Ganham um teste cada, só do caso novo que este
sub-projeto introduz nelas: board inexistente → redireciona para `/paineis`.

Gate: `npm run verify` verde, cobertura ≥ 80%.

## Documentos a atualizar no mesmo trabalho

- `docs/components.md` — 5 linhas novas na Tabela 2
- `docs/progresso.md` — seção do sub-projeto 2
- `docs/specs.md` — nada a remover: nenhuma linha do "Fora de escopo" cortava múltiplos
  boards (a de "Templates de board" continua valendo, é o sub-projeto 5)
