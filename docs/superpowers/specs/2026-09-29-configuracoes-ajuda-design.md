# Configurações e Ajuda (sub-projetos 7 e 8)

**Data:** 2026-09-29 · **Status:** decidido de forma autônoma (o usuário delegou a decisão
durante uma sessão noturna). Auditar em `docs/relatorio-autonomo-2026-09-29.md`.
**Origem:** as rotas `/configuracoes` e `/ajuda` nasceram "em construção" na casca
(`2026-09-17-casca-sidebar-design.md`, linha "Sem sub-projeto ainda").

**Sem migration, sem Zona Vermelha, sem dependência nova.**

## Configurações — `/configuracoes`

**Escopo:** editar o **nome de exibição** (`profiles.full_name`) e ver o e-mail (só leitura).

**Por que só isso.** O nome é o único dado editável do perfil que a UI usa em todo lugar
(Sidebar, responsável da tarefa, autor de comentário, feed). Já existe a policy
`profiles_update` (0001/0002: só o próprio perfil) e o `check (length(trim(full_name))
between 1 and 120)`. A validação de verdade está no banco; o cliente só espelha o limite com
`maxLength` e o vazio com mensagem.

**Fora de escopo (cada um com motivo):**

| Não faremos | Por quê |
|---|---|
| Trocar senha, e-mail, excluir conta | Fluxo de autenticação = Zona Vermelha. `docs/specs.md` já exclui recuperação de senha/OAuth/2FA |
| Avatar por upload | `docs/specs.md` exclui upload de arquivos; exigiria storage |
| Tema/idioma/preferências | Sem requisito no `specs.md`; controle sem efeito seria mentira de UI |
| Notificações | Ver "Notificações" abaixo |

**Dados e camadas**
- `services/boards.ts` → `atualizarNomePerfil(userId, nome): Promise<Profile>` —
  `update({ full_name }).eq('id', userId).select().single()`, erro via `traduzirErro`.
  Fica no mesmo arquivo de `buscarMembros`, que já lê `profiles`.
- `hooks/useQuadro.ts` → `useAtualizarNome()`; ao dar certo invalida `['membros']` e
  `['atividades']` (o nome aparece na Sidebar, nos responsáveis e no feed).
- `pages/ConfiguracoesPage.tsx` — formulário com `Field`/`TextInput`/`Button` (mesmo padrão do
  `BoardFormModal`). A página não usa `StateView` para o formulário; usa para carregar o nome
  atual (que vem de `useMembros`, como a Sidebar). Sucesso em `<output>`, erro em `role="alert"`.
- Rota: a `EmConstrucaoPage` de `/configuracoes` em `App.tsx` é substituída.

**Testes:** serviço (chama `update` com o id certo, traduz erro), página (pré-preenche, vazio
não envia, envia nome aparado, mostra sucesso, mostra erro do servidor), axe.

## Ajuda — `/ajuda`

**Escopo:** página estática, sem dados, com perguntas frequentes em `<details>` nativo
(teclado e leitor de tela de graça, sem estado nem componente novo).

Conteúdo, só de coisas que existem hoje: criar painel e modelos; as 4 visões (tabela,
kanban, gantt, dashboard); convidar integrantes (só quem já tem conta; nenhum e-mail é
enviado); favoritos; instalar o app; onde ficam as atividades.
O texto vive num array em `src/lib/ajuda.ts` (dados), a página só renderiza (mesmo desenho
de `lib/modelos.ts` + `ModelosPage`).

**Testes:** renderiza o `h1`, uma entrada por item do array, cada resposta acessível pelo
`<summary>`; axe.

## Notificações — decisão de NÃO construir

`/notificacoes` continua "em construção". Sem menção, sem push e sem e-mail (todos fora do
escopo da v1, `docs/specs.md`), uma central de notificações seria a mesma lista de
`/atividades`. A versão distinta ("o que outras pessoas fizeram nas tarefas atribuídas a
mim") exige uma consulta com join `activities → tasks` que **não consegui validar contra o
banco real** nesta sessão (MCP do Supabase indisponível). Reabrir junto com push.

## Ordem de execução

1. `atualizarNomePerfil` (teste → serviço) · 2. `useAtualizarNome` · 3. `ConfiguracoesPage` +
rota · 4. `lib/ajuda.ts` + `AjudaPage` + rota · 5. axe das duas páginas · 6. docs
(`components.md` não muda: nenhuma feature nova; `progresso.md` ganha as seções).
