# Inventário de Componentes

**Fase do manual:** 4.2 · Atualizado em 2026-09-29 (novo design: Urbanist, índigo, vidro fosco)

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

## Novo design (2026-09-29)

Mockup aprovado: `docs/mockups/novo-design-urbanist.html`. Tudo vem de `src/styles/tokens.css`.

- **Card = vidro.** Use a classe `glass` (ou `glass-strong`, mais opaca, para cartão dentro de coluna) mais `rounded-card`. Campo, modal e menu continuam **opacos** (`bg-surface`): quem digita ou decide precisa de fundo firme. Não invente `bg-white/60` no componente.
- **Cor de gráfico = `-strong`.** O fundo suave de status (`bg-status-*`) é claro demais para delimitar forma. Donut e borda de barra do Gantt usam `--color-status-*-strong` (`CORES_STATUS`, `BORDA_STATUS`).
- **Raios:** `rounded-full` (pílula: botão, badge, aba), `rounded-card` (cards), `rounded` (campos). Para forma pequena que precisa ficar quadrada (caixa do checkbox, losango do marco, amostra de legenda) use `rounded-xs` — `rounded-sm` agora é 8px e vira círculo em 16px.
- **`Button`:** sempre pílula; o padding lateral saiu do tamanho (`PADDING_X`) porque `tailwind-merge` não conhece `px-space-*` e o `px-0` do botão só-ícone perdia a briga.
- **`Badge`:** sempre pílula. A variante `bleed` (célula inteira colorida) foi removida: não tinha mais uso.
- **`Tabs` `variant="pill"`** agora é também o seletor de views do board, dentro de um contêiner `glass`.
- **Contraste:** `npm run contrast` mede texto, borda e cor de gráfico também contra o **vidro** (branco a 62% sobre o `canvas`, o pior caso). Um token novo de cor entra com o par `-fg` ou `-strong` correspondente, senão o portão reprova.

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
| 8 | **Menu** | — | aberto, item ativo, item desabilitado (`desabilitado` no item: `aria-disabled`, segue alcançável por teclado) | `trigger`, `items`, `align` | tabela, kanban, gantt, dashboard |
| 9 | **Modal** | `md` · `lg` · `full` · `drawer` | aberto, fechando | `open`, `onClose`, `title`, `footer` | modal de tarefa, confirmações, drawer de navegação mobile |
| 10 | **ProgressBar** | `solid` · `segmented` | — | `value` ou `segments[]`, `label` | tabela, kanban, gantt, dashboard |
| 11 | **StateView** | `loading` · `error` · `empty` | — | `state`, `title`, `action`, `children` | **todas** |
| 13 | **AcoesDoFormulario** | `primary` · `danger` | enviando, desabilitado | `erro`, `rotuloEnviar`, `variante`, `aoCancelar` | todo formulário em modal (painel, grupo, usuário, exclusões) |
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
`size="lg"` (TaskModal) é **tela cheia abaixo de md** e caixa centrada de md em diante
(`responsive.md`, F5). Raio e borda moram em cada tamanho, não na base: o `cn` só
concatena, então `rounded-md` na base brigaria com `rounded-none` no tamanho.

**#7 Checkbox com `rotuloOculto`**: o quadrado tem 16px, mas o `<label>` (aria-hidden,
nome vem do `aria-label` do input) cobre 44×44 em volta no celular — alvo de toque mínimo
sem mudar o desenho.

**#11 StateView é o primitivo mais importante da lista.** Ele recebe um estado
discriminado e obriga os quatro: loading, erro, vazio, sucesso. "Esqueci o
estado vazio" é o erro nº 3 do manual; com este componente ele deixa de ser
possível por construção, não por disciplina.

**O `loading` do StateView é um skeleton com a forma da tela**, não um spinner: região `<output aria-busy>`
com o texto sr-only "Carregando…" e a forma (prop `esqueleto`) dentro de `aria-hidden`. Sem forma, três
linhas genéricas (modal, comentários). A peça é `BlocoEsqueleto` (exportada do StateView; `redondo`,
`sobreFundo` para fora de cartão, onde o cinza padrão some no lavanda). Sem `animate-pulse` com
`prefers-reduced-motion`.

**#13 AcoesDoFormulario** passa do teto de 12 primitivos de propósito: o mesmo rodapé (erro em `role="alert"` + Cancelar + enviar) estava copiado em 5 formulários e o jscpd acusou na 5ª cópia (regra dos três). Sem regra de negócio: recebe o erro e os rótulos.

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
| `BoardShell` | Tabs, TextInput, Button, FavoritoToggle, FiltroTarefasModal, TaskModal | todas as 4 views (layout comum + estrela + **busca e botão Filtrar** (não aparecem no Dashboard) + "convidar" abre `IntegrantesModal`; o **+ "Novo item"** abre o `TaskModal` de criação com o primeiro grupo escolhido (trocável), em qualquer visão; desabilitado se o board não tem grupo — Sair mora na Sidebar) |
| `FiltroTarefasModal` | Modal, Checkbox, Select, Field, Button | botão "Filtrar" do `BoardShell`. Status e prioridade (caixas), responsável (seletor), "somente atrasadas". Aplica na hora; o estado é a URL (`lib/filtro.ts`) |
| `ResumoFiltro` | Button | "Mostrando X de Y tarefas" + limpar, quando há busca ou filtro. Só aparece dentro de `VisaoDoBoard` |
| `Esqueletos` | StateView (`BlocoEsqueleto`) | as formas de carregamento por tela: `EsqueletoTabela`, `EsqueletoKanban`, `EsqueletoGantt`, `EsqueletoDashboard`, `EsqueletoPaineis`, `EsqueletoFeed` (espelham os grids e cartões reais) e `EsqueletoDaRota` (página inteira pela rota, `lib/esqueleto.ts` — fallback do `<Suspense>` do AppShell e da abertura). Um arquivo de decoração, não componentes de domínio |
| `VisaoDoBoard` | StateView, ResumoFiltro, Button | Tabela, Kanban e Gantt: os 4 estados da consulta dos grupos + o resumo. Unificado na 3ª ocorrência (regra dos três). "Nada encontrado" com filtro ligado tem texto próprio, diferente do board vazio |
| `EnumCell` | Badge, Menu | base genérica de `StatusCell` e `PriorityCell` (edita um enum do banco por menu; o status/prioridade aparece como pílula). Não é usada direto nas telas |
| `StatusCell` | EnumCell | tabela, kanban, modal |
| `PriorityCell` | EnumCell | tabela, modal |
| `AssigneeCell` | Avatar, Menu | tabela, kanban, modal |
| `DueDateCell` | Badge (`tone=atrasado`) | tabela, kanban, gantt |
| `TaskTable` | StateView, Checkbox, ProgressBar, *Cells | Tabela Principal |
| `TaskGroup` | ProgressBar, Badge, Button, Menu | Tabela Principal. Um grupo real (menu ⋮ Renomear/Excluir, "Adicionar item") ou, com `status`, um bloco de visão "agrupar por status" (sem menu nem adicionar, barra na cor do status) — variante, não componente novo |
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
| `Sidebar` | Avatar, Button, Modal (`drawer`) | navegação do workspace, dentro do AppShell. Duas formas: **trilho** de botões redondos (md+, expandem em pílula com o rótulo no hover/foco — ver `responsive.md`) e **drawer** com rótulos (celular). Mesma função de item para as duas |
| `EmConstrucaoPage` | StateView | 3 rotas "em construção" (Notificações, Ajuda, Configurações) |
| `FeedAtividades` | Badge | lista de eventos (criou, mudou status, comentou) — `/atividades` e card do Dashboard. Só apresentação; o texto vem de `lib/atividade.ts` |
| `IntegrantesModal` | Modal, Badge, Button, Field, TextInput, StateView | "Compartilhar workspace" (seletor do menu lateral e tela Workspaces) — integrantes do workspace inteiro; saiu da barra do painel em 2026-10-01. Novo porque nenhum modal existente lista pessoas; `BoardFormModal`/`TaskModal` editam uma entidade só |
| `FavoritoToggle` | Button (`ghost`, `iconOnly`) | estrela de favorito autossuficiente (lê e alterna sozinha) — BoardShell e BoardCard |
| `BoardCard` | Menu | um board em Meus Painéis — link pro board + menu Renomear/Excluir |
| `BoardFormModal` | Modal, Field, TextInput, Button | criar e renomear board (PaineisPage, Sidebar) — mesma dualidade criar/editar do TaskModal |
| `UsuarioFormModal` | Modal, Field, TextInput, AcoesDoFormulario | tela Usuários (master): cadastrar (senha provisória) e editar nome/e-mail/senha. Novo: campos de conta, nenhum modal existente edita credencial |
| `ExcluirUsuarioDialog` | Modal, Field, TextInput, AcoesDoFormulario (`danger`) | exclusão de conta confirmada digitando o e-mail; explica o que o cascade apaga. Mesmo freio do ExcluirBoardDialog, regra destrutiva diferente |
| `SeletorWorkspace` | Menu | logo do trilho (md+) e cabeçalho do drawer: troca o workspace aberto, Novo, Compartilhar (o workspace inteiro), Gerenciar |
| `WorkspaceFormModal` | Modal, Field, TextInput, AcoesDoFormulario | criar (já abre) e renomear workspace |
| `ExcluirWorkspaceDialog` | Modal, Field, TextInput, AcoesDoFormulario (`danger`) | exclusão de workspace confirmada pelo nome; o cascade leva os painéis |
| `ExcluirBoardDialog` | Modal, Field, TextInput, Button (`danger`) | exclusão definitiva de board, confirmada digitando o nome. Separado do BoardFormModal: regra destrutiva diferente, nada em comum além do Modal |
| `GrupoFormModal` | Modal, Field, TextInput, Select, Button | criar e renomear/recolorir grupo da tabela (`BoardPage`). Novo porque `BoardFormModal` não tem cor e é específico de board; é a 2ª ocorrência do padrão "modal de nome" — a regra dos três manda unificar só na 3ª |
| `AvisoPWA` | Button | raiz do app (`App.tsx`), fora das rotas. Barra fixa no rodapé com no máximo um aviso: versão nova do PWA (prioridade) ou instalar o app. Novo porque nenhum componente existente é um aviso global; não vira `Toast` genérico porque só ele usa (ver "FORA dos primitivos"). Spec: `docs/superpowers/specs/2026-09-29-pwa-design.md` |

**`ModelosPage` sem `StateView`:** o catálogo de `lib/modelos.ts` é estático — não
há loading/erro/vazio de lista. O único estado assíncrono é criar o board: botões
desabilitados enquanto cria e erro em `role="alert"`. Card inline na página (uso
único; regra dos três).

**Nota sobre `StatusCell` / `PriorityCell` / `AssigneeCell` / `DueDateCell`:**
`StatusCell` e `PriorityCell` **são** unificados: editam um enum do banco por menu,
com o mesmo comportamento, e por isso são wrappers finos de `EnumCell` (a primeira
versão tinha dois componentes; o comportamento idêntico justificou juntar).
`AssigneeCell` e `DueDateCell` **não** entram nessa unificação: cada um tem editor,
validação e formato diferentes, e um `<Cell type=...>` genérico viraria um `switch`
mais difícil de ler que os arquivos separados. A regra é olhar o comportamento, não
a aparência.

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
