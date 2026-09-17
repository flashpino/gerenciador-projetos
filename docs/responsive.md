# Contrato de Responsividade

**Fase do manual:** 4.4 · Atualizado em 2026-09-15

**Regra base: mobile é o layout padrão. Desktop é o override.**
Em Tailwind isso significa que classe sem prefixo é mobile, e `md:` / `lg:`
adicionam. Se você escreveu `lg:flex-col` para "consertar" o mobile, inverteu.

**Breakpoints:** `375` (base, sem prefixo) · `768` (`md:`) · `1440` (`lg:`)

**Premissa vinda da persona (`docs/specs.md` §1):** mobile é **consulta e ajuste
pontual**, não planejamento. Isso autoriza cortar *densidade* em 375px. Não
autoriza cortar *funcionalidade*: tudo que se faz no desktop tem que ser possível
no celular, mesmo que com mais toques.

---

## Regras globais

| Regra | Valor | Verificação |
|---|---|---|
| Scroll horizontal de página | **Proibido** em qualquer largura | `document.body.scrollWidth <= clientWidth` |
| Alvo de toque | mínimo 44×44px até 768px | token `--spacing-touch` |
| Zoom | legível e operável a 200% | WCAG 1.4.4 |
| Imagens e avatares | `width`/`height` sempre declarados | evita layout shift |
| Largura fixa em px | proibida em container | origem nº 1 de overflow |

A única exceção ao scroll horizontal é a **linha do tempo do Gantt**, que rola
dentro do próprio container — a página não rola. Essa exceção é deliberada e é a
única.

---

## Navegação (todas as telas)

| Largura | Comportamento |
|---|---|
| 375 | Sidebar vira **drawer** sobre o conteúdo, aberto por botão com `aria-expanded`. Fecha com `Esc`, no clique fora e ao navegar. Foco preso enquanto aberto |
| 768 | Sidebar como rail de ícones, 64px, rótulo em tooltip |
| 1440 | Sidebar completa, 240px, ícone + rótulo |

O seletor de views (Tabela/Kanban/Gantt/Dashboard) é `Tabs` em todas as larguras.
Em 375px ele rola horizontalmente **dentro da própria faixa** — isso é `Tabs`,
não a página.

---

## F1 — Tabela Principal

| Largura | Layout |
|---|---|
| **375** | **Vira `TaskCardList`.** Um card por tarefa: título, responsável, status, prazo, progresso. Grupos viram seções com cabeçalho fixo. Edição por toque abre o `Menu` do campo |
| **768** | Tabela real com colunas essenciais: Tarefa, Responsável, Status, Prazo. Prioridade, Progresso e Tags ficam ocultas |
| **1440** | Tabela completa, 7 colunas, como no Stitch |

**Por que troca de componente e não só de CSS:** uma `<table>` transformada em
cards por CSS mantém `role="table"` e leitor de tela anuncia "tabela, 7 colunas"
para algo que virou lista. `TaskCardList` é uma `<ul>` de verdade. Dois
componentes, cada um semanticamente honesto no seu breakpoint
(`docs/components.md`, Tabela 2).

---

## F2 — Kanban

| Largura | Layout |
|---|---|
| **375** | **Uma coluna por vez.** Faixa de abas no topo mostra as colunas com contagem; deslizar ou tocar troca. Mover tarefa é pelo `Menu` do card ("Mover para…"), não por arrastar |
| **768** | Grade de 2 colunas: as 5 colunas de status empilham em 2×3, sem scroll horizontal |
| **1440** | Todas as colunas, largura fluida |

**Arrastar não é a única forma de mover em nenhuma largura.** O `Menu` do card
existe em todas. Isso atende WCAG 2.5.7 (Dragging Movements) e resolve mobile de
graça — a alternativa acessível e a solução mobile são a mesma coisa.

---

## F3 — Cronograma Gantt

| Largura | Layout |
|---|---|
| **375** | Coluna de tarefas **fixa** (`position: sticky`, 140px). Só a linha do tempo rola horizontalmente. Escala força "Semanas". Aviso discreto: "melhor visualizado em tela maior" — aviso, não bloqueio |
| **768** | Coluna de tarefas 240px, escala Dias/Semanas/Meses |
| **1440** | Layout completo do Stitch: tarefas, responsável, duração, timeline, marcos |

O painel de "Capacidade e Alocação" (rodapé do Stitch) **não aparece abaixo de
768px**. É denso, é leitura de planejamento, e planejamento não acontece no
celular. Está acessível pelo Dashboard.

---

## F4 — Dashboard

| Largura | Layout |
|---|---|
| **375** | Uma coluna. Os 2 cartões de métrica empilham. Donut acima da legenda. Barras por grupo em largura total |
| **768** | Métricas em 2×2. Donut e progresso por grupo lado a lado |
| **1440** | Métricas em linha de 4. Grade de 2 colunas como no Stitch |

Todo gráfico tem os números **em texto** ao lado, em qualquer largura (critério
F4.2). Isso resolve leitor de tela e resolve tela pequena ao mesmo tempo.

---

## F5 — Modal de Tarefa

| Largura | Layout |
|---|---|
| **375** | **Tela cheia**, não caixa flutuante. Cabeçalho fixo com voltar e salvar. Abas (Detalhes / Subtarefas / Comentários) rolam horizontalmente |
| **768** | Caixa centrada, 90vw × 90vh |
| **1440** | Duas colunas como no Stitch: atributos + descrição à esquerda, conversas à direita |

Em 375px o modal ocupa a tela inteira porque caixa flutuante em celular deixa
alvos de toque nas bordas e o teclado virtual cobre metade do formulário.

---

## Como isto é verificado

1. **Automático** — teste que renderiza cada tela em 375, 768 e 1440 e falha se
   `body.scrollWidth > body.clientWidth`
2. **Automático** — teste que percorre elementos interativos e falha se algum
   ficar abaixo de 44×44 no viewport mobile
3. **Manual, uma vez por tela** — navegar só com teclado; zoom em 200%

O item 3 não é automatizável e não deve fingir que é. Ferramenta pega ~30% das
violações de a11y; "isso faz sentido para quem usa leitor de tela" ela não pega.
