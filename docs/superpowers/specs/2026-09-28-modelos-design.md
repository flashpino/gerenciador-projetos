# Modelos (sub-projeto 5/6)

**Data:** 2026-09-28 · **Status:** design aprovado em conversa
**Origem:** `docs/superpowers/specs/2026-09-17-casca-sidebar-design.md` — conteúdo de
"Modelos" é do sub-projeto 5. Hoje `/modelos` é `EmConstrucaoPage`.
Referência visual: nenhuma — o Stitch não tem tela de modelos. Segue o grid de
cards de Meus Painéis.

## Escopo

- `/modelos` mostra um catálogo **fixo, no código**, de 3 modelos de board.
- Um modelo define só **grupos** (nome + cor). Nenhuma tarefa de exemplo.
- "Usar modelo" cria na hora um board com o nome do modelo e navega para ele.
  Renomear depois usa o fluxo que já existe em Meus Painéis.

**Fora de escopo:** tarefas de exemplo, pedir nome antes de criar, "salvar board como
modelo" (exigiria tabela + RLS + migration), modelos dentro do diálogo "Novo Painel".

**Sem migration.** Nada de Zona Vermelha: grava em `boards` e `groups` pelas mesmas
políticas que o "Novo Painel" já usa.

## Dados — `src/lib/modelos.ts`

```ts
interface Modelo {
  nome: string
  descricao: string
  grupos: { name: string; color: GroupColor }[]
}
```

| nome | grupos (cor) |
|---|---|
| Sprint de software | Backlog (azure) · Em andamento (grape) · Revisão (crimson) · Concluído (mint) |
| Lançamento de campanha | Planejamento (azure) · Produção (grape) · Aprovação (crimson) · Publicado (mint) |
| Onboarding | Antes do 1º dia (azure) · Primeira semana (grape) · Primeiro mês (mint) |

Descrições: uma frase curta cada, escrita na implementação.

## Serviço e hook

- `criarBoard(workspaceId, name, grupos?)` em `src/services/boards.ts`. Sem `grupos`,
  comportamento atual ("A fazer", azure). Com `grupos`, **um** insert em lote em
  `groups`, `position` = índice no array.
- `useCriarBoard` (`src/hooks/useQuadro.ts`) aceita `grupos` opcional e repassa.
  Nenhum hook novo.

## Tela — `src/pages/ModelosPage.tsx`

- Substitui `EmConstrucaoPage` na rota `/modelos` (`src/App.tsx`).
- `h1` "Modelos", grid mobile-first: 1 coluna → 2 em `md` → 3 em `lg`.
- Cada card: nome, descrição, lista dos grupos com bolinha da cor do grupo, botão
  "Usar modelo" (`Button`, alvo ≥ 44px). Card inline na página — uso único, não
  vira componente (regra dos três).
- Workspace vem de `useWorkspaceAtual` (mesmo caminho do `BoardFormModal`).
- Sucesso: navega para `/boards/:id`.

## Estados e erros

- Lista estática: não há loading/erro/vazio de consulta, então a tela não usa
  `StateView`. Exceção registrada em `docs/components.md`.
- Workspace ainda carregando ou com erro: botões desabilitados.
- Criando: **todos** os botões desabilitados; o clicado mostra "Criando…". Evita dois
  boards num duplo clique.
- Erro ao criar: mensagem em `role="alert"`, fica na página.
- **Limitação herdada:** se o board é criado e o insert dos grupos falha, o board
  fica sem grupos. Mesmo risco do "Novo Painel" hoje; resolver pede RPC atômica
  (migration, Zona Vermelha).

## Testes (TDD)

- Serviço: com `grupos` insere o lote na ordem, com `position` certo; sem `grupos`
  mantém "A fazer".
- Página: clicar "Usar modelo" chama `criarBoard` com nome e grupos do modelo e navega
  para o board; erro aparece em alerta; botões desabilitados durante a criação.
- A11y: `/modelos` entra no scan do axe.

## Docs a atualizar

- `docs/components.md` — `ModelosPage` e a exceção ao `StateView`
- `docs/specs.md` — linha "Templates de board" vira reaberto/entregue
- `docs/progresso.md` — seção do sub-projeto 5
