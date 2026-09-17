# F4 (Bloco A) — Dashboard de Métricas, núcleo

**Data:** 2026-09-16 · **Status:** aprovado, aguardando plano de implementação

## Escopo

Só os 4 critérios de aceite já existentes em `docs/specs.md` seção "F4 — Dashboard":

1. Taxa de conclusão, contagem de atrasadas e distribuição por status, derivadas das tarefas reais.
2. Distribuição em gráfico **e** em texto — o gráfico não é a única forma de ler o dado.
3. Board sem tarefas mostra estado vazio, nunca "0%"/"NaN".
4. Taxa de conclusão = `concluídas / total`, uma casa decimal; distribuição soma exatamente 100%.

Blocos B (carga de trabalho), C (feed de atividades) e D (filtros de período/exportar/personalizar) ficam fora — ver adendo em `docs/specs.md`.

## Arquitetura

```
DashboardPage → useBoardAtual + useGruposComTarefas (hooks existentes, sem mudança)
              → tarefas = grupos.flatMap(g => g.tasks)
              → lib/metrics.ts (já existe, já testado):
                  taxaDeConclusao, contarAtrasadas, distribuicaoStatus, progressoDoGrupo
              → StateView via estadoDaQuery
```

Nenhum hook novo, nenhum serviço novo, nenhuma migration. `lib/metrics.ts` e `metrics.test.ts` já cobrem os 4 cálculos, incluindo os casos de borda (lista vazia, divisão não exata, soma em 100%).

**Estado vazio (critério F4.3):** `estadoDaQuery` recebe a lista de tarefas **achatada** (`grupos.data?.flatMap(g => g.tasks)`), não os grupos — diferente de `BoardPage`/`GanttPage`, que tratam "vazio" como "zero grupos". Isso cobre o caso de grupos existentes sem nenhuma tarefa. Reaproveita `estadoDaQuery` sem alterá-la (é genérica sobre `data: T[]`).

## Componentes novos

Todos já constam em `docs/components.md` Tabela 2 (Dashboard), nenhum componente novo sem linha na tabela.

| Componente | Composição | Responsabilidade |
|---|---|---|
| `MetricTile` | `Badge`, `ProgressBar` | Um KPI: título + valor grande. Usado 2×: Taxa de Conclusão (com `ProgressBar` do próprio percentual) e Atrasadas (com `Badge` tom "atenção" quando > 0) |
| `StatusDonut` | SVG próprio, sem lib de gráfico | Recebe `FatiaStatus[]` de `distribuicaoStatus`. Anel via `stroke-dasharray`, cores dos tokens `--color-status-*` já existentes em `tokens.css` |
| `GroupProgressList` | `ProgressBar` | Uma linha por grupo, usando `progressoDoGrupo(grupo.tasks)` |
| `DashboardPage` (`src/pages/`) | os 3 acima + `StateView` + `BoardShell` | Orquestra, mesmo padrão de `GanttPage.tsx` |

### Mapeamento de cor do donut

`lib/status.ts` ganha um registro `CORES_STATUS: Record<TaskStatus, string>` apontando para `var(--color-status-*)`, ao lado de `STATUS`/`ORDEM_STATUS` já existentes — fonte única, sem duplicar hex no componente.

### Acessibilidade do gráfico (critério F4.2)

Segue `docs/patterns.md` §6: números reais em `sr-only`, SVG com `aria-hidden`. A legenda ao lado do donut é texto visível normal (não só `sr-only`), o que já satisfaz "mesmos números em texto" tanto para leitor de tela quanto visualmente.

## Layout

```
[ Taxa de Conclusão ] [ Atrasadas ]
[ StatusDonut + legenda ]  [ GroupProgressList ]
```

Mobile: empilhado (`grid-cols-1 md:grid-cols-2`), reaproveitando o padrão de grid já usado nas outras telas — sem componente novo de responsividade.

## Rotas e navegação

- `src/App.tsx`: rota `/dashboard` com `React.lazy` (code splitting, mesmo padrão do Gantt).
- `src/components/features/BoardShell.tsx`: adiciona `{ id: '/dashboard', rotulo: 'Dashboard', href: '/dashboard' }` ao array `VIEWS` (o comentário `// F4 (Dashboard) acrescenta sua linha aqui` já reserva o lugar).

## Testes (TDD — RED antes do componente)

- `MetricTile.test.tsx` — título/valor visíveis por `getByText`, `Badge` de atenção quando aplicável.
- `StatusDonut.test.tsx` — números reais em `sr-only` batem com as fatias recebidas.
- `GroupProgressList.test.tsx` — uma linha por grupo, percentual correto.
- `metrics.test.ts` já cobre os 4 cálculos — nada novo aqui.
- Sem teste de página isolado (`DashboardPage`), mesmo padrão de `BoardPage`/`KanbanPage`/`GanttPage` — nenhuma delas tem teste próprio; a cobertura vem dos componentes e do `lib`.

## Fora de escopo (v1.1, ver adendo em docs/specs.md)

Feed de atividades, carga de trabalho (Zona Vermelha), filtros de período/exportar/personalizar widgets.
