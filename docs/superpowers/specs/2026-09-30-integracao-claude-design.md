# Integração Claude → sistema (sub-projeto 10)

**Data:** 2026-09-30 · **Status:** decidido de forma autônoma a partir do pedido do usuário: "que o Claude
alimente o sistema com as tarefas: quando o plano for criado ele cria as tarefas e, conforme conclui, altera
os status. Em outra sessão, talvez com outra conta, para projetos novos e já existentes."

## Decisão central: um usuário "bot" + uma CLI, sem mudar o servidor

Qualquer **membro** do workspace já pode criar e editar boards, grupos, tarefas e subtarefas, e comentar como
si mesmo (RLS: `is_workspace_member`, `author_id = auth.uid()`). Logo a ponte não precisa de migration, de
edge function, de chave de serviço nem de tocar o fluxo de autenticação do app (Zona Vermelha intacta).

- O **bot** é uma conta comum do app (cadastro normal). O dono do workspace o **convida** por "Convidar
  integrantes" (só quem já tem conta). Revogar = remover o bot do workspace.
- O acesso é exatamente o de um membro: **lê e escreve tudo daquele workspace, e nada de outros**.
- A **CLI** (`integracao-claude/gp.mjs`) entra com e-mail e senha do bot (GoTrue, com a chave *publishable*,
  pública por design) e fala com o PostgREST via `fetch`. **Zero dependências.** Node ≥ 18.
- Uma **skill** (`SKILL.md`) ensina o Claude quando e como chamar a CLI, em qualquer projeto da máquina.

**Por que não uma edge function com token:** exigiria tabela nova + RLS + função com chave de serviço + deploy
(Zona Vermelha e segredos). O bot entrega o mesmo resultado com o RLS que já existe e já foi testado.

## Identidade estável: `ref`

Cada tarefa importada leva uma tag `ref:<id>` em `tasks.tags`. A interface nunca lê `tags`, então é metadado
invisível (se um dia mostrarem etiquetas, filtrar o prefixo `ref:`). Reimportar o mesmo plano **atualiza** em
vez de duplicar. Dentro de um board o `ref` é único.

## Comandos

| Comando | Faz |
|---|---|
| `configurar` | Grava URL, chave e conta do bot em `~/.config/gerenciador-projetos/config.json` (o humano roda, uma vez por máquina) |
| `eu` | Testa o login; mostra workspaces (com dono) e boards a que o bot tem acesso |
| `boards` | Lista boards acessíveis |
| `vincular` | Grava `.gerenciador.json` no projeto (board + workspace; **sem segredo**, pode ir para o git) |
| `importar <plano.md\|spec.json>` | Cria/atualiza grupos, tarefas e subtarefas. Idempotente. `--dry-run` mostra sem gravar |
| `tarefas` | Lista as tarefas do board com `ref` e status |
| `status <ref> <status>` | Muda o status (`concluir` põe progresso 100). `--comentario` registra o porquê |
| `comentar <ref> "texto"` | Comentário na tarefa, autor = bot |

**Sync a partir do plano:** `importar` de um `.md` no formato do `superpowers:writing-plans` lê os checkboxes
(`- [x]`). Todas as etapas marcadas → `done`; algumas → `working`; nenhuma → `not_started`. Quem executa o
plano só precisa marcar a caixa e rodar `importar` de novo.

## Regras de reimportação

1. Campos descritivos (título, descrição, prioridade, datas, marco) **são atualizados** se mudaram no plano.
2. **Status e progresso só avançam** (`not_started < working = stuck < review < done`). Reimportar nunca desfaz o
   que uma pessoa ou uma execução já concluiu. Recuar é decisão explícita (`status`).
3. Subtarefas existentes só passam de "não feita" para "feita"; nunca o inverso.
4. A tarefa **nunca muda de grupo** por reimportação.
5. Validação **antes** de gravar (espelha as constraints do banco): título 1–200, prazo ≥ início, marco com
   data única, enums, refs únicos. Erro de spec não grava nada.

## Fora de escopo (com motivo)

- **Atribuir responsável** (o plano raramente traz; exige casar nome com membro).
- **Excluir** tarefas (a CLI cria e atualiza; apagar é decisão humana, e o app já tem).
- **Token de API dedicado** (ver acima): fica como evolução se um dia o bot não puder ser membro.
- Rodar o sync automaticamente por hook: a skill instrui o Claude a chamar; automatizar é opcional.

## Segurança

- A senha do bot fica em arquivo **fora do repositório** e nunca é impressa; env vars `GP_*` a sobrepõem.
- Conta **dedicada** com senha forte e única. O dano de um vazamento é o de qualquer membro do workspace.
- `.gerenciador.json` não guarda segredo (só ids) e pode ir para o git. A CLI nunca imprime senha, token nem e-mail em erro (coberto por teste).
- Um comando desconhecido é rejeitado **antes** de entrar no sistema, e o nome do comando é checado com `Object.hasOwn` (o operador `in` aceitaria `toString`/`constructor` do `Object.prototype`: bug real achado pelos testes).

## Arquivos

`integracao-claude/`: `gp.mjs` (entrada), `comandos.mjs` (lógica dos comandos, API injetada), `nucleo.mjs`
(puro: parse do plano, validação, planejamento), `api.mjs` (HTTP), `ambiente.mjs` (config e vínculo, `fs` injetado),
`SKILL.md`, `instalar.mjs`, e testes `*.test.mjs`. Guia humano: `docs/integracao-claude.md`.
