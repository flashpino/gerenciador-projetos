# Inventário de Componentes

**Fase do manual:** 4.2 · Atualizado em 2026-09-15

---

## REGRA DE OURO

> **Antes de criar qualquer componente, consulte esta tabela.**
> Se algo parecido existe, adicione uma **VARIANTE**, não um componente novo.
> `<Button variant="danger" size="sm">` — nunca `<DangerButtonSmall>`.
>
> Componente novo exige **justificativa escrita nesta tabela**, no mesmo commit
> que o cria. Sem linha aqui, o componente não existe.
>
> Antes de escrever a variante, verifique se a plataforma nativa já resolve:
> `<dialog>`, `<details>`, `<input type="date">`, `<select>`, CSS `:has()`.

**Teto: 12 primitivos.** Estamos em 12. Chegar em 13 exige remover um ou
justificar por que o teto estava errado — não é um número decorativo, é o que
força priorização. Sem teto o agente lista 40 e constrói 40, dos quais 25 são
usados uma vez.

---

## Tabela 1 — PRIMITIVOS (`src/components/ui/`)

Genéricos. **Zero regra de negócio, zero acesso a dados.** Verificado por `npm run arch`.
Só entra aqui o que aparece em 2 ou mais telas.

| # | Componente | Variantes | Estados | Props principais | Telas |
|---|---|---|---|---|---|
| 1 | **Button** | `primary` · `secondary` · `ghost` · `danger` | hover, active, disabled, **loading** | `variant`, `size: sm\|md`, `loading`, `iconStart`, `iconOnly` | todas |
| 2 | **Badge** | `status` · `priority` · `tag` · `count` | — | `variant`, `tone`, `children` | tabela, kanban, gantt, dashboard, modal |
| 3 | **Avatar** | único ou empilhado | com/sem foto (cai em iniciais) | `users: User[]`, `size: sm\|md`, `max` | tabela, kanban, gantt, dashboard, modal |
| 4 | **Field** | — | erro, obrigatório, desabilitado | `label`, `error`, `hint`, `required`, `children` | modal, login |
| 5 | **TextInput** | `text` · `textarea` | erro, desabilitado, readonly | `value`, `onChange`, `invalid` | modal, login, busca |
| 6 | **Select** | — | erro, desabilitado | `options`, `value`, `onChange` | modal |
| 7 | **Checkbox** | — | checked, indeterminate, disabled | `checked`, `onChange`, `label` | tabela, modal |
| 8 | **Menu** | — | aberto, item ativo, desabilitado | `trigger`, `items`, `align` | tabela, kanban, gantt, dashboard |
| 9 | **Modal** | `md` · `lg` · `full` · `drawer` | aberto, fechando | `open`, `onClose`, `title`, `footer` | modal de tarefa, confirmações, drawer de navegação mobile |
| 10 | **ProgressBar** | `solid` · `segmented` | — | `value` ou `segments[]`, `label` | tabela, kanban, gantt, dashboard |
| 11 | **StateView** | `loading` · `error` · `empty` | — | `state`, `title`, `action`, `children` | **todas** |
| 12 | **Tabs** | `underline` · `pill` | ativo, foco | `items`, `value`, `onChange` | shell do board, modal |

### Justificativas dos que não são óbvios

**#3 Avatar recebe `users: User[]`, não um usuário.** Empilhamento com transbordo
(`+3`) aparece em 3 telas. Um componente com uma lista evita `AvatarStack` como
13º primitivo e evita o CSS de empilhamento duplicado em 3 lugares.

**#4 Field existe para tornar o campo sem rótulo impossível.** Ele amarra
`label`↔`id`, `error`↔`aria-describedby` e `aria-invalid`. Sem ele, cada
formulário refaz essa ligação e esquece uma parte — é a violação de a11y mais
comum em formulário gerado.

**#9 Modal usa o `<dialog>` nativo.** Trap de foco, `Esc` e camada superior vêm
de graça do navegador. Escrever trap de foco à mão é ~80 linhas e sempre tem um
bug de borda. Devolver o foco ao elemento de origem é a única parte manual.

**#11 StateView é o primitivo mais importante da lista.** Ele recebe um estado
discriminado e obriga os quatro: loading, erro, vazio, sucesso. "Esqueci o
estado vazio" é o erro nº 3 do manual; com este componente ele deixa de ser
possível por construção, não por disciplina.

**#12 Tabs decide o elemento pelo `href` do item.** Item com `href` vira `<nav>`
+ link com `aria-current="page"`; sem `href` vira `role="tablist"` + `role="tab"`.
Motivo: `role="tablist"` pressupõe painéis no mesmo documento. O seletor de views
do board troca de ROTA — uma aba que navega faz o leitor anunciar "aba 2 de 4,
selecionada" para algo que trocou a página inteira. Dois elementos, um primitivo.

### Deliberadamente FORA dos primitivos

| Não vira primitivo | Por quê |
|---|---|
| `Tooltip` | Aparece em 1 tela. `title` nativo e `aria-label` cobrem a v1 |
| `Card` | É `div` com 3 classes de token. Componente aqui seria burocracia |
| `Table` | A tabela do board é específica demais; genérica não se paga com uma só |
| `Icon` | `lucide-react` já é isso. Um wrapper só atrapalharia o tree-shaking |
| `Toast` | Só o aviso de nova versão do PWA usa. Vira feature, não primitivo |
| `DatePicker` | `<input type="date">` nativo. Ganha teclado, mobile e locale de graça |

---

## Tabela 2 — FEATURES (`src/components/features/`)

Conhecem o domínio. Compõem primitivos. **Nunca falam com o Supabase direto** —
passam por `src/hooks/` → `src/services/`.

| Componente | Compõe | Vive em |
|---|---|---|
| `BoardShell` | Tabs, Button, FavoritoToggle | todas as 4 views (layout comum + estrela de favorito + ícones desabilitados da barra superior — Sair mora na Sidebar) |
| `StatusCell` | Badge, Menu | tabela, kanban, modal |
| `PriorityCell` | Badge, Menu | tabela, modal |
| `AssigneeCell` | Avatar, Menu | tabela, kanban, modal |
| `DueDateCell` | Badge (`tone=atrasado`) | tabela, kanban, gantt |
| `TaskTable` | StateView, Checkbox, ProgressBar, *Cells | Tabela Principal |
| `TaskGroup` | ProgressBar, Badge, Button | Tabela Principal |
| `TaskCardList` | StateView, *Cells | Tabela Principal **em 375px** |
| `KanbanBoard` | Tabs, KanbanColumn | Kanban |
| `KanbanColumn` | Badge, TaskCard | Kanban |
| `TaskCard` | Badge, Avatar, ProgressBar, Menu, DueDateCell | Kanban |
| `GanttChart` | Tabs, GanttRow | Gantt |
| `GanttRow` | — (div com token de status direto, sem Badge/Avatar) | Gantt |
| `MetricTile` | Badge, ProgressBar | Dashboard |
| `StatusDonut` | — (SVG próprio) | Dashboard |
| `GroupProgressList` | ProgressBar | Dashboard |
| `TaskModal` | Modal, Tabs, Field, TextInput, Select, *Cells | todas (é o ponto único de escrita rica) |
| `SubtaskList` | Checkbox, Button, StateView | TaskModal |
| `CommentList` | Avatar, TextInput, StateView | TaskModal |
| `AppShell` | Sidebar | container de toda rota autenticada (docs/superpowers/specs/2026-09-17-casca-sidebar-design.md) |
| `Sidebar` | Avatar, Button, Modal (`drawer`) | identidade do workspace, nav, rodapé — dentro do AppShell |
| `EmConstrucaoPage` | StateView | 5 rotas "em construção" (Atividades, Modelos, Notificações, Ajuda, Configurações) |
| `FavoritoToggle` | Button (`ghost`, `iconOnly`) | estrela de favorito autossuficiente (lê e alterna sozinha) — BoardShell e BoardCard |
| `BoardCard` | Menu | um board em Meus Painéis — link pro board + menu Renomear/Excluir |
| `BoardFormModal` | Modal, Field, TextInput, Button | criar e renomear board (PaineisPage, Sidebar) — mesma dualidade criar/editar do TaskModal |
| `ExcluirBoardDialog` | Modal, Field, TextInput, Button (`danger`) | exclusão definitiva de board, confirmada digitando o nome. Separado do BoardFormModal: regra destrutiva diferente, nada em comum além do Modal |
| `AppUpdatePrompt` | Button | shell (nova versão do PWA) |

**Nota sobre `StatusCell` / `PriorityCell` / `AssigneeCell` / `DueDateCell`:**
parecem 4 componentes quase iguais e a tentação é unificar num `<Cell type=...>`.
**Não unifique.** Cada um tem editor, validação e formato diferentes; um
componente genérico viraria um `switch` de 4 ramos que é mais difícil de ler que
os 4 arquivos. Isso é a regra dos três aplicada ao contrário: são semelhantes na
aparência, não no comportamento.

**Nota sobre `TaskTable` vs `TaskCardList`:** são o mesmo dado em dois layouts,
e existem separados de propósito. Uma tabela que "vira card" via CSS produz
marcação de tabela sem semântica de tabela, que leitor de tela anuncia errado.
Dois componentes, cada um com a semântica certa no seu breakpoint.

**Nota sobre o Kanban:** `KanbanBoard` não tem hook nem serviço próprios. Ele
recebe os mesmos `grupos` da Tabela Principal e chama `colunasPorStatus`
(`src/lib/kanban.ts`) para recortar por status. Mover uma tarefa é
`useAtualizarTarefa` com `{ status }` — o update otimista e o rollback (F2.4)
vêm de graça do hook que a F1 já usa.

**Nota sobre o Gantt:** `GanttChart` não compõe `StateView` — quem trata
loading/erro/vazio é `GanttPage`, mesmo padrão de `BoardPage`/`KanbanPage`
(nenhuma delas tem uma "TaskTable"/"KanbanBoardShell" com StateView embutido
também). `GanttScale`, cogitado no planejamento, nunca virou arquivo: trocar
de escala é `<Tabs variant="pill">` com 3 itens fixos, e um wrapper só pra
isso seria uma camada sem comportamento próprio. O posicionamento das barras
é lógica pura em `src/lib/gantt.ts` (testada sem renderizar nada), não em
`GanttRow`.

---

## Sem gráficos de terceiros

Dashboard e Gantt não usam biblioteca de gráfico. O donut é um `<circle>` com
`stroke-dasharray`; as barras são `div` com largura percentual; o Gantt é
posicionamento absoluto sobre uma grade.

Motivo: uma lib de gráfico custa 80–150 KB gzip — metade do orçamento de bundle
inteiro da spec — para desenhar duas formas. E toda lib de gráfico precisa de
trabalho extra para ser acessível, que é onde o requisito "os mesmos números
disponíveis em texto" (critério F4.2) acaba sendo cumprido à mão de qualquer jeito.
