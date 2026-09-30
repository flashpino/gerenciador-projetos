# Auditoria — Stitch vs. Implementação

**Data:** 2026-09-16 · **Escopo:** as 5 telas de `arquivos stitch/` contra o código em `src/`
**Motivo:** reclamação de que o resultado não reflete o design nem as funcionalidades do Stitch.
**Natureza:** documento de leitura. Nenhuma linha de código foi alterada para produzi-lo.

## Método

Comparação item a item entre cada `screen.png` do Stitch e o componente React
correspondente. Cada elemento do mockup recebe uma classificação:

| Símbolo | Significado |
|---|---|
| ✅ | Implementado |
| ◐ | Implementado parcialmente, ou com divergência deliberada |
| ➖ | Cortado **com registro** em `docs/specs.md` ("Fora de escopo") ou `docs/progresso.md` |
| ❌ | Ausente **sem registro em lugar nenhum** — sumiu sem decisão documentada |
| 🔴 | Defeito: contradiz um contrato escrito, ou não funciona |

A distinção que importa é entre ➖ e ❌. Cortar escopo é legítimo e o manual
incentiva. Cortar sem registrar é o que produz a sensação de "ignoraram o Stitch".

---

## Veredito em uma linha

**O design system foi seguido. O aplicativo em volta dele não foi construído.**

Os tokens do `kinetic_workstream/DESIGN.md` estão em `src/styles/tokens.css` com
fidelidade alta. O que falta é a casca: sidebar, barra superior e barra de
ferramentas do quadro — presentes nas 5 telas do Stitch, ausentes por inteiro no
código. Como a casca é o primeiro e o último elemento que aparece em qualquer
captura de tela, a impressão de "bloco de notas" tem base real, mesmo com as 5
funcionalidades do MVP implementadas e testadas por trás.

| Tela | ✅ | ◐ | ➖ | ❌ | 🔴 |
|---|---|---|---|---|---|
| Casca do app (todas as telas) | 1 | 1 | 1 | 9 | 1 |
| 1 — Tabela Principal | 9 | 3 | 1 | 4 | 2 |
| 2 — Kanban | 5 | 1 | 2 | 6 | 1 |
| 3 — Cronograma Gantt | 6 | 2 | 6 | 1 | 1 |
| 4 — Dashboard | 4 | 2 | 4 | 0 | 1 |
| 5 — Modal de Tarefa | 9 | 0 | 6 | 1 | 0 |

---

## Parte 1 — O que foi seguido (e foi bem feito)

Isto não é diplomacia; é a metade da conta que precisa aparecer para a outra
metade ter peso.

| Item do `DESIGN.md` | Onde está |
|---|---|
| Paleta completa (superfícies, tinta, status, prioridade, grupo) | [tokens.css:56-127](../src/styles/tokens.css#L56-L127) |
| Plus Jakarta Sans, 9 níveis tipográficos, `cell-data` 13px/500 | [tokens.css:17-54](../src/styles/tokens.css#L17-L54), fonte carregada em [index.html](../index.html) |
| `tabular-nums` para alinhamento vertical de números e datas | [tokens.css:171](../src/styles/tokens.css#L171) |
| Escala de raio e as duas sombras (`drag`, `overlay`) | [tokens.css:148-157](../src/styles/tokens.css#L148-L157) |
| Densidade de linha 40px / cabeçalho 44px | [tokens.css:144-145](../src/styles/tokens.css#L144-L145) |
| Célula de status full-bleed com texto branco | [EnumCell.tsx](../src/components/features/EnumCell.tsx), prop `bleed` |
| Barra de progresso segmentada multicolor do rodapé de grupo | [ProgressBar.tsx](../src/components/ui/ProgressBar.tsx), prop `segments` |
| Fonte única de token — sem `tailwind.config` para divergir | Tailwind v4 CSS-first, `@theme` |

**Melhoria deliberada sobre o Stitch:** 9 de 14 pares cor/texto do mockup
reprovavam em WCAG 2.2 AA — o pior era branco sobre o âmbar "Em Revisão", a
1.90:1 contra os 4.5:1 exigidos. A correção preferiu trocar a cor do *texto* a
escurecer o fundo, o que preservou 5 das 8 cores originais. Está documentada no
cabeçalho do `tokens.css` e é portão do `npm run verify` via `npm run contrast`.
Esse é um caso onde divergir do Stitch foi correto.

---

## Parte 2 — A lacuna estrutural: a casca do app

Esta é a seção que explica a reclamação inteira.

O `BoardShell` — o componente que embrulha as 4 views — tem 50 linhas e contém:
um `<h1>`, um botão "Sair" e a faixa de abas. Nada mais.
Ver [BoardShell.tsx](../src/components/features/BoardShell.tsx).

| Elemento do Stitch (aparece nas 5 telas) | Estado |
|---|---|
| Sidebar escura: logo do workspace, plano, "Novo Painel" | ❌ |
| Sidebar: Workspaces · Meus Painéis · Favoritos · Atividades · Modelos | ❌ |
| Sidebar rodapé: Notificações · Ajuda · Configurações · perfil do usuário | ❌ |
| Sidebar como drawer em 375px / rail 64px em 768px / 240px em 1440px | 🔴 contratado em [responsive.md:38-40](responsive.md#L38-L40), não implementado |
| Barra superior: título do board | ✅ |
| Barra superior: favoritar (estrela), info, badge de sprint | ❌ |
| Barra superior: busca no workspace | ❌ |
| Barra superior: ícones de filtro / pessoa / ordenação / ajustes | ❌ |
| Barra superior: "Convidar / Integrantes" | ➖ `specs.md` corta permissão por papel e múltiplos workspaces |
| Barra superior: botão "Novo Item" global | ✅ (2026-09-30): o + abre "Nova tarefa" em qualquer visão |
| Barra superior: avatar do usuário logado | ❌ |
| Abas de visão com ícone por view | ◐ abas existem e são `<nav>` real com `aria-current`; sem ícones |
| "+ Adicionar Exibição" | ❌ |

**A prova de que a sidebar foi esquecida, não cortada:** os tokens dela existem e
nunca foram usados por uma linha de código —
[`--color-sidebar`, `--color-sidebar-hover`, `--color-sidebar-fg`, `--color-sidebar-fg-muted`](../src/styles/tokens.css#L65-L68).
Alguém extraiu a cor da sidebar do Stitch e depois ninguém construiu a sidebar.

**Onde o processo falhou:** a Tabela 2 do [components.md:92](components.md#L92)
registrou o `BoardShell` como "Tabs, Button" já na Fase 2. A omissão entrou no
inventário de componentes e o `responsive.md` passou a contradizer o
`components.md` sem que ninguém apontasse. O passo do manual que pegaria isso é a
**reauditoria de arquitetura código-vs-doc (§8.4)** — um dos passos que o próprio
`CLAUDE.md` registra como pulado.

---

## Parte 3 — Tela por tela

### Tela 1 — Tabela Principal (`quadro_de_projetos_tabela_principal`)

**Barra de ferramentas do quadro** — a linha inteira abaixo das abas:

| Controle | Estado |
|---|---|
| "Novo Item" com split button | ❌ |
| "Buscar neste quadro" | ❌ `specs.md` só corta a busca **global entre boards**; a busca dentro do board não está em nenhuma lista |
| "Pessoa" (filtrar por responsável) | ❌ |
| "Filtrar" com contador de filtros ativos | ❌ |
| "Agrupar por" | ❌ |
| "Ocultar Colunas" | ➖ `specs.md`: colunas customizáveis pelo usuário |
| Exportar / automações / menu "..." | ➖ `specs.md`: exportação e automações |

**Grupo e tabela:**

| Elemento | Estado |
|---|---|
| Caret de expandir/colapsar com `aria-expanded` | ✅ |
| Título do grupo em cor de identidade | ✅ |
| Pill com contagem de itens | ✅ |
| Progresso do grupo no canto direito do cabeçalho | ✅ |
| Menu "..." do grupo | ❌ |
| Barra de cor contínua ligando as linhas do grupo | ◐ existe como marca de 6px no cabeçalho, não como faixa vertical contínua |
| Checkbox de seleção por linha | ✅ (marca como concluída; no Stitch é seleção múltipla — divergência não registrada) |
| Colunas Item · Responsável · Status · Prazo · Prioridade · Progresso | ✅ |
| Coluna **Tags** | 🔴 `tags text[]` existe no banco ([0001_init.up.sql:67](../supabase/migrations/0001_init.up.sql#L67)), no tipo ([domain.ts:36](../src/types/domain.ts#L36)) e nas fixtures; [responsive.md:53](responsive.md#L53) manda exibir em 1440px. Não é renderizada em lugar nenhum |
| Status como célula saturada de ponta a ponta | ✅ |
| Prazo com destaque de atraso, anunciado por texto | ✅ (critério F1.5) |
| Barra de progresso + percentual | ✅ |
| Título riscado quando concluído | ✅ |
| Avatar do responsável (foto, com fallback para iniciais) | ✅ |
| "+ Adicionar item..." como input inline no rodapé do grupo | ◐ é um botão que abre o modal, não um input inline |
| Rodapé: Total de tarefas · distribuição segmentada · Média % | ✅ |
| Rodapé: "N integrantes" e intervalo de datas do grupo | ❌ |
| "+ Adicionar Novo Grupo" | ✅ entregue (2026-09-30): botão "Novo grupo" no fim da tabela + renomear/recolorir/excluir pelo menu ⋮ do grupo. Exclui só grupo vazio e nunca o último |
| Estado vazio com ação "Criar primeiro grupo" | ✅ corrigido (2026-09-30): o botão abre o modal "Novo grupo" |
| Lista de cards abaixo de 768px em vez de tabela virada por CSS | ✅ decisão boa e acima do Stitch (ver `components.md`) |

### Tela 2 — Kanban (`quadro_de_projetos_visualiza_o_kanban`)

| Elemento | Estado |
|---|---|
| Faixa "FILTROS": avatares, Prioridade, Tags, Sprint Atual | ❌ |
| Faixa: "Progresso da Sprint: 58%" e "12 dias restantes" | ➖ não existe conceito de sprint no schema (`specs.md`) |
| Uma coluna por status, com contagem | ✅ — e o código faz **melhor**: 5 colunas (todos os status), o Stitch mostra só 3 |
| Ponto colorido de status no cabeçalho da coluna | ❌ |
| Botões "+" e "..." no cabeçalho da coluna | ❌ |
| "+ Adicionar Cartão" no rodapé da coluna | ❌ — não há nenhuma forma de criar tarefa a partir do Kanban |
| Coluna vazia continua existindo e aceita drop | ✅ (F2.5), com texto real em vez de retângulo tracejado mudo |
| Card: título | ✅ |
| Card: chip de prazo / urgência | ✅ |
| Card: avatar do responsável | ✅ |
| Card: barra de progresso | ✅ (sem o percentual em texto que o Stitch mostra) |
| Card: badge de prioridade | ✅ |
| Card: **tags** | ❌ mesmo dado do banco não usado |
| Card: contador de subtarefas ("4/6 subtarefas") | ❌ a tabela `subtasks` existe e o modal já a consome |
| Card: contador de comentários | ❌ a tabela `comments` existe e o modal já a consome |
| Card: anexos e preview de imagem | ➖ `specs.md`: upload de anexos fora de escopo |
| Mover por arrastar **e por teclado** | ✅ (F2.3) — acima do Stitch, que só desenha o arrastar |
| Estado vazio com ação "Criar primeira tarefa" | 🔴 botão sem `onClick` ([KanbanPage.tsx:22](../src/pages/KanbanPage.tsx#L22)) |

### Tela 3 — Cronograma Gantt (`quadro_de_projetos_cronograma_gantt`)

Esta é a tela com melhor aderência, e é a única cujos cortes foram registrados de
forma completa ([progresso.md:62](progresso.md#L62)).

| Elemento | Estado |
|---|---|
| Escala Dias / Semanas / Meses | ✅ (F3.2) |
| Escala Trimestres | ➖ registrado |
| Botão "Hoje" / marcador de hoje | ✅ (F3.3) |
| Barra por período, dimensionada pelas datas | ✅ (F3.1) |
| Percentual dentro da barra | ✅ |
| Cor da barra por status | ✅ |
| Marco como losango | ✅ (F3.4) |
| Tarefa sem datas listada como "sem período definido" | ✅ (F3.5) — o Stitch não resolve esse caso |
| Coluna fixa de tarefas com rolagem só na timeline | ✅ (F3.6) |
| Coluna "RESP." com avatar na lista lateral | ❌ |
| Coluna "DUR." com duração em dias | ◐ a duração está implícita na barra, não em coluna |
| Swimlanes com rótulo por trilha ("TIMELINE – INFRA & BACKEND") | ◐ agrupado, sem a faixa rotulada |
| Setas de dependência entre tarefas | ➖ registrado (`task_dependencies` existe no schema) |
| Zoom 100% | ➖ registrado |
| Filtro "Responsável: Todos os membros" | ➖ registrado |
| "Buscar no cronograma" | ➖ registrado |
| "+ Adicionar Marco (Milestone)" / "+ Adicionar Nova Tarefa" | ❌ não há criação a partir do Gantt |
| Painel "Capacidade & Alocação de Esforço da Equipe" | ➖ registrado — **Zona Vermelha**, autoria humana |
| Estado vazio com ação "Ver Tabela Principal" | 🔴 botão sem `onClick` ([GanttPage.tsx:17](../src/pages/GanttPage.tsx#L17)) |

### Tela 4 — Dashboard de Métricas (`quadro_de_projetos_dashboard_de_m_tricas`)

| Elemento | Estado |
|---|---|
| KPI "Taxa de Conclusão" | ✅ |
| KPI "Tarefas em Atraso" com selo de atenção | ✅ |
| KPI "Velocidade Média (pts/semana)" | ➖ não existe story point no schema (`specs.md`) |
| KPI "Eficiência de Prazo" | ➖ idem |
| Comparação "vs sprint anterior" e sparkline nos KPIs | ➖ não existe sprint nem histórico |
| Donut de distribuição de status | ✅ SVG puro, sem dependência nova |
| Legenda do donut com contagem e percentual **em texto** | ✅ (F4.2) — acima do Stitch em acessibilidade |
| Total no centro do donut | ✅ |
| "Progresso por Squad/Épico" com barra empilhada multi-status por linha | ◐ existe como "Progresso por Grupo", barra simples de média — não empilhada por status |
| "Velocidade de entrega agregada" e links de breakdown | ➖ |
| Painel "Carga de Trabalho da Equipe (Workload)" | ➖ **Zona Vermelha** (`CLAUDE.md`), registrado |
| "Feed de Atividades Recentes" | ➖ registrado — exige tabela de eventos nova |
| Filtros de período (Últimos 30 dias / Este Sprint / Q3) | ➖ registrado |
| "Exportar Relatório" e "Personalizar Widgets" | ➖ registrado |
| Layout de 4 KPIs numa faixa | ◐ 2 KPIs em `md:grid-cols-2` |
| Estado vazio com ação "Ver Tabela Principal" | 🔴 botão sem `onClick` ([DashboardPage.tsx:24](../src/pages/DashboardPage.tsx#L24)) |

### Tela 5 — Modal de Tarefa (`modal_de_cadastro_e_edi_o_tarefa_e_projeto`)

A tela com os cortes mais bem combinados — `progresso.md:98` registra que foram
acordados com você antes de começar.

| Elemento | Estado |
|---|---|
| Título e descrição | ✅ |
| Status, Prioridade, Responsável | ✅ (reusam `StatusCell`/`PriorityCell`/`AssigneeCell` da tabela) |
| Período / Prazo com validação de fim antes do início | ✅ (F5.4) |
| Grupo de destino | ✅ |
| Horas estimadas e gastas | ✅ campos existem |
| Barra "14h / 20h · 70% consumido" | ❌ os dois campos existem e não há a barra que o Stitch desenha |
| Checkbox "É um marco" | ✅ (necessário para F3.4) |
| Abas de seções (descrição / subtarefas / comentários) | ✅ |
| Subtarefas com contador que atualiza na hora | ✅ (F5.5, update otimista) |
| Comentários com estado vazio convidativo | ✅ (F5.6) |
| Foco preso, `Esc` fecha, foco volta à origem | ✅ (F5.1, via `<dialog>` nativo) |
| Tags editáveis com "+ Adicionar Tag" | ➖ registrado |
| Editor rich text (negrito, listas, código, @menção) | ➖ registrado |
| Anexos em comentário, com download e versão | ➖ registrado |
| Reações e "Responder" (thread) | ➖ registrado |
| Log automático de atividade ("Status Alterado") | ➖ registrado |
| Cargo do comentarista ("Tech Lead • há 20 min") | ➖ registrado |

---

## Parte 4 — Defeitos encontrados de passagem

Não são questões de fidelidade ao Stitch. São coisas quebradas.

1. **Quatro botões mortos.** Todos os estados vazios oferecem uma ação que não faz
   nada — nenhum tem `onClick`:
   [BoardPage.tsx:44](../src/pages/BoardPage.tsx#L44),
   [KanbanPage.tsx:22](../src/pages/KanbanPage.tsx#L22),
   [GanttPage.tsx:17](../src/pages/GanttPage.tsx#L17),
   [DashboardPage.tsx:24](../src/pages/DashboardPage.tsx#L24).
   O `StateView` cumpriu o papel dele — obrigou o estado vazio a existir. Ninguém
   ligou o fio.

2. ~~**Não existe forma de criar um grupo pela UI.**~~ **Resolvido em 2026-09-30** (criar, renomear e excluir grupo na tabela). Texto original: `criarGrupo` estava declarado como
   não escrito em `boards.ts`. Na prática o
   trigger `handle_new_user` semeia grupos no cadastro, então o caso raramente
   aparece — mas quem apagar todos os grupos fica sem saída.

3. **Criar tarefa só existe na Tabela Principal**, dentro de um grupo. Kanban, Gantt
   e Dashboard não têm nenhum ponto de criação, e o Stitch tem "Novo Item" no topo
   de todas as telas.

4. **Coluna Tags contratada e não entregue** — ver Tela 1.

5. **Contrato de sidebar contratado e não entregue** — ver Parte 2.

---

## Parte 5 — Por que isto passou

Não é mistério e já está escrito no próprio repositório.

O `CLAUDE.md` registra, na seção "Erros já cometidos neste projeto", que a
implementação da F2 rodou sem `/graphify query` antes de cada arquivo novo, sem
`/ponytail-review`, sem `/ponytail-debt` e sem mostrar o diff antes de cada
commit. Três dos passos pulados são exatamente os que pegariam os achados acima:

- **`/ponytail-review` e revisão de diff** pegariam os quatro botões sem `onClick`.
- **Reauditoria código-vs-doc (§8.4 do manual)** pegaria a contradição entre
  `responsive.md` (que exige sidebar em 3 breakpoints e Tags em 1440px) e
  `components.md` (que nunca inventariou nenhum dos dois).
- **Registro de corte por feature** existe para F3, F4 e F5 em `progresso.md`, e
  **não existe para F1 e F2** — que são justamente as duas telas com mais ❌ nesta
  auditoria. O hábito de registrar cortes começou depois das duas primeiras
  features, e os cortes das duas primeiras nunca foram escritos.

---

## Parte 6 — Recomendação, em ordem de impacto

Ordenado por quanto muda a percepção por unidade de trabalho. Nada aqui foi
executado — é material para você decidir.

| # | Item | Por quê | Tamanho |
|---|---|---|---|
| 1 | **Casca do app:** sidebar nos 3 breakpoints + barra superior | É 100% do que se vê antes de ver qualquer feature, e já está contratado no `responsive.md`. Os tokens já existem | Grande |
| 2 | **Ligar os 4 botões mortos** | Defeito puro, correção de poucas linhas | Trivial |
| 3 | **Coluna Tags** | Dado já existe em banco, tipo e fixture; contrato já escrito | Pequeno |
| 4 | ~~**"Novo Item" acessível de todas as views + criar grupo**~~ ✅ 2026-09-30 | Fecha o buraco de "não dá para criar nada fora da tabela" | Médio |
| 5 | **Contadores de subtarefa e comentário no card do kanban** | Dado já existe, alto retorno visual | Pequeno |
| 6 | **Barra de horas no modal** (`14h / 20h`) | Os dois campos já existem | Trivial |
| 7 | **Buscar e filtrar dentro do board** | Nunca foi cortado formalmente; precisa entrar no escopo ou na lista de "fora de escopo" — hoje está em limbo | Médio |
| 8 | **Retroativo: registrar os cortes de F1 e F2** no `progresso.md` | As duas únicas features sem nota de corte | Trivial |
| 9 | **Reconciliar `components.md` × `responsive.md`** | Enquanto divergirem, a próxima sessão vai ler o inventário e repetir a omissão | Pequeno |

**Fora desta lista, deliberadamente:** tudo marcado ➖. Esses cortes têm motivo
escrito e continuam válidos — em especial os dois blocos de **Zona Vermelha**
(capacidade/alocação de esforço no Gantt e no Dashboard), que por regra do
`CLAUDE.md` são de autoria humana e não devem ser gerados.
