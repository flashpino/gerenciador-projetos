# Busca e filtros do board (sub-projeto 9)

**Data:** 2026-09-30 · **Status:** decidido de forma autônoma (pedido do usuário: "a busca e os
filtros devem funcionar, não é só enfeite"). Auditar em `docs/relatorio-autonomo-2026-09-29.md`.
**Origem:** os ícones "Buscar neste quadro — em breve" e "Filtrar — em breve" do `BoardShell`
(item 7 da auditoria do Stitch; `2026-09-17-casca-sidebar-design.md`, linha "fila separada").

**Sem migration, sem Zona Vermelha, sem dependência nova.** Tudo é filtro de cliente sobre os dados
que as telas já baixam (`useGruposComTarefas`); RLS continua decidindo o que a pessoa pode ler.

## Escopo

- **Busca** por texto, dentro do board atual (`docs/specs.md`: "Busca global entre boards" segue fora).
  Casa no **título e na descrição**, sem diferenciar maiúsculas nem acentos ("acao" acha "Ação").
- **Filtros** combinados (E entre categorias, OU dentro de uma categoria):
  - **Status** (vários), **Prioridade** (vários);
  - **Responsável**: uma pessoa, ou "Sem responsável";
  - **Somente atrasadas** (mesma regra do resto do app: `estaAtrasada`).
- Vale para **Tabela, Kanban e Gantt**. O **Dashboard não filtra**: as métricas são do board inteiro, e
  "taxa de conclusão" de um recorte enganaria. Nele os controles não aparecem.

**Fora de escopo:** filtro por período/sprint (`docs/specs.md`: não há esse conceito no schema),
filtros salvos, busca por nome do responsável, busca em comentários/subtarefas.

## Decisões

1. **O estado mora na URL** (`?q=…&status=working,review&prio=high&resp=<id>|sem&atrasadas=1`).
   Motivos: sobrevive à troca de visão (as abas preservam a query), ao reload e ao botão voltar, e o link
   é compartilhável. Escrita com `replace`, para digitar não empilhar histórico. Valores desconhecidos na
   URL são ignorados (nunca quebram a tela).
2. **Lógica pura em `src/lib/filtro.ts`** (lê/escreve a query, decide se uma tarefa casa, filtra os
   grupos). Testada sem React.
3. **Grupos sem tarefa que case somem** enquanto há filtro (senão a tabela vira uma pilha de cartões
   vazios). Sem filtro, grupos vazios continuam aparecendo, para dar onde criar tarefa.
4. **O modal de tarefa usa os grupos SEM filtro**: um grupo escondido pelo filtro continua sendo
   destino válido de "Grupo" e de "Adicionar item".
5. **UI:** campo de busca (`type="search"`, rótulo acessível) na barra do board; botão **Filtrar** com a
   contagem de filtros ativos no nome acessível, que abre um `Modal` com caixas e um seletor. Aplica na
   hora; "Limpar filtros" zera. Sem componente novo de popover.
6. **Resumo visível:** com filtro ativo, cada tela mostra "Mostrando X de Y tarefas" e "Limpar filtros"
   (`ResumoFiltro`). Filtro que esconde coisas sem avisar parece dado perdido.
7. **Nada encontrado** é o estado vazio da tela, com texto próprio e botão "Limpar filtros" (não o
   "Nenhuma tarefa ainda", que mentiria).

## Arquivos

| Arquivo | Papel |
|---|---|
| `src/lib/filtro.ts` (+ teste) | tipo `FiltroTarefas`, `lerFiltro`, `escreverFiltro`, `aplicarFiltro`, contagens |
| `src/hooks/useFiltroTarefas.ts` (+ teste) | lê/escreve o filtro na URL |
| `src/hooks/useGruposFiltrados.ts` (+ teste) | `useGruposComTarefas` + filtro: `{ todos, data, visiveis, total, filtro, ativo, limpar }` |
| `src/components/features/FiltroTarefasModal.tsx` (+ teste) | o modal de filtros |
| `src/components/features/ResumoFiltro.tsx` (+ teste) | "Mostrando X de Y" + limpar |
| `BoardShell.tsx` | busca + botão Filtrar no lugar dos ícones desabilitados; abas preservam a query |
| `BoardPage`, `KanbanPage`, `GanttPage` | passam a usar `useGruposFiltrados` |

## Testes

Lib: cada critério isolado e combinado, acentos/maiúsculas, tarefa sem responsável, atrasada com
`hoje` injetado, query inválida ignorada, ida e volta `escrever → ler`. Componentes por role/label.
Páginas: digitar na busca reduz a lista; filtro sem resultado mostra o estado vazio próprio; o modal
de tarefa continua vendo todos os grupos. axe no modal.
