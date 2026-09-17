# Auditoria — Fases 6 a 10 do manual (execução retroativa)

**Data:** 2026-09-17 · **Motivo:** confirmação de que "revisão, reauditoria e
security scan" nunca rodaram de fato (ver conversa anterior desta sessão).
**Natureza:** as seções 1-5 são leitura/verificação; a seção 6 lista as duas
correções de código aplicadas, com o porquê e a evidência de cada uma.

Convenção de evidência: todo comando abaixo foi rodado como
`comando > log 2>&1; echo $?` e o código lido de verdade — não inferido de
saída truncada (regra do `CLAUDE.md`, "Nunca infira sucesso de um comando
encanado").

---

## 1. Fase 6.1 — Detecção automática, isolada (§8.1)

Rodado **antes** de qualquer revisão conceitual, como o manual manda.

| Comando | Exit | Achado |
|---|---|---|
| `npm run dup` | 0 | 2 clones, 0.44% do total — abaixo do limiar de 1% do `.jscpd.json`. Um em `hooks/useQuadro.ts` (mutações otimistas com o mesmo formato onMutate/onError/onSettled), outro em `pages/BoardPage.tsx` × `KanbanPage.tsx` (setup de hooks idêntico). **Nenhum dos dois passou da 2ª ocorrência — regra dos três (§8.2) não se aplica ainda.** Pré-existente, não introduzido nesta sessão |
| `npm run dead` | 0 | Limpo depois da correção da seção 6 abaixo. Antes da correção: apontava `vitest-axe` e, na 2ª rodada, `axe-core` como entradas obsoletas em `knip.json` |

## 2. Fase 6.2 — Revisão conceitual

**Desvio do manual, dito antes de rodar, não descoberto depois:** o manual
manda `/ponytail-review` sobre o **diff da feature**. Não há diff pendente —
tudo desde a F5 já está commitado. Rodei `/ponytail-audit` (repositório
inteiro) no lugar, que é o equivalente correto quando não há diff a revisar.

**Achado real, verificado por grep (não é achado da skill isolado — confirmei
manualmente que os imports realmente não existem em `src/`):**

```
delete: @dnd-kit/sortable + @dnd-kit/utilities — zero imports em src/,
silenciados em knip.json em vez de removidos.
replacement: nada — @dnd-kit/core (useDraggable/useDroppable) já cobre o
kanban inteiro (TaskCard.tsx, KanbanColumn.tsx).
net: -2 deps possíveis.
```

`vite-plugin-pwa` também está sem uso (não aparece em `vite.config.ts`), mas
**isso não é achado** — está documentado e decidido em `docs/progresso.md:20`
("instalado, ainda não usado — fica para depois do MVP funcional").

Resto do código (`lib/date.ts`, `lib/cn.ts`, `lib/estadoDaQuery.ts`,
`services/erros.ts`, `ErrorBoundary`) já é lean: `Intl` nativo em vez de lib
de datas, `cn()` de uma linha em vez de `clsx`, nenhuma interface de
implementação única, `check-arch.mjs` (abaixo) em zero violações.

**Não removi as duas dependências agora** — é mudança de `package.json`, e o
`CLAUDE.md` pede para não adicionar/remover dependência sem perguntar.
Decisão sua.

## 3. Fase 6.3 — Ledger de dívida (§8.3)

```
grep -rniE 'ponytail' --include='*.ts' --include='*.tsx' .
```

**1 marcador, 1 sem gatilho de revisão:**

`src/components/features/BoardShell.tsx:33` — botão "Sair" chama `sair()`
direto do serviço, sem hook de erro dedicado. Ceiling: nenhum tratado
explicitamente (o comentário argumenta que não há falha esperada de
`signOut` que valha superfície de erro). **no-trigger** — não nomeia quando
revisar isso.

Nota técnica: o grep padrão da skill (`(#|//) ?ponytail:`) não encontra esse
marcador porque o comentário está em sintaxe JSX (`{/* ponytail: ... */}`),
não `//`. Ampliei a busca manualmente para não reportar "ledger limpo" por
um artefato de regex.

## 4. Fase 6.4 — Reauditoria de arquitetura código-vs-doc (§8.4)

```
npm run arch  →  exit 0: "check-arch: ok — 3 fronteiras respeitadas"
```

Isso automatiza 3 das 5 verificações que o §8.4 pede: Supabase só em
`services/`, `components/ui/` sem importar domínio, zero cor hardcoded fora
de `styles/`. As outras duas (estado global além do necessário; divergência
código vs. `specs.md`/`components.md`) exigem leitura — já foi feita
ontem em `docs/auditoria-stitch.md` (achado principal: `components.md` nunca
inventariou a sidebar que `responsive.md` contrata). Não repito aqui.

## 5. Fase 7 — Acessibilidade, responsividade, performance

### 5.1 Automatizada (§9.1) — **não existia, criada nesta sessão**

`vitest-axe`/`axe-core` já estavam instalados desde a Fase 0 (`package.json`),
mas nenhum teste jamais os usou. Criado `src/test/a11y.test.tsx`: roda `axe()`
contra as 5 telas do MVP com dado populado (não vazio) — LoginPage,
BoardPage, KanbanPage, GanttPage, DashboardPage, TaskModal em edição.

**Bug de empacotamento do pacote, não do projeto**, encontrado no processo:
`vitest-axe@0.1.0` publica `extend-expect.js` vazio e `matchers.d.ts` como
`export type * from "./dist/matchers"` — marca uma função real como
type-only. Contornado sem tocar `node_modules`: `src/test/vitest-axe.d.ts`
(augmenta `declare module 'vitest'` na convenção que esta versão do Vitest
usa de fato) + `import()` dinâmico com cast em `src/test/setup.ts`. Comentado
em ambos os arquivos.

**Rodado, e achou 2 violações reais WCAG antes da correção:**

| Tela | Regra axe | Causa | Correção |
|---|---|---|---|
| Kanban | `aria-allowed-role` | `<article role="group">` — `role="group"` não é permitido em `<article>` (ARIA-in-HTML) | `TaskCard.tsx`: `<article>` → `<div>`, mantendo o `role="group"` deliberado (dnd-kit) |
| Gantt | `heading-order` | `<h1>` da página → `<h3>` do cabeçalho de grupo, pulando `<h2>` | `GanttChart.tsx`: `<h3>` → `<h2>` |
| Kanban | `heading-order` (achado depois de corrigir o do Gantt) | Mesma causa: cabeçalho de coluna em `<h3>` sem `<h2>` na página | `KanbanColumn.tsx`: `<h3>` → `<h2>` |

```
npx vitest run src/test/a11y.test.tsx  →  exit 0, 6/6 passando
npm run test:cov (suíte inteira)        →  exit 0, 164/164 passando, cobertura 80.62%
```

### 5.2 Manual (§9.2) — leitura de código, sem ferramenta

- Contraste: `npm run contrast` → **32 pares em WCAG 2.2 AA**, script próprio
  (não estimado — medido, conforme regra do `CLAUDE.md` sobre nunca afirmar
  contraste sem rodar o script).
- Teclado: `TaskCard` tem alternativa por menu ao arrastar (F2.3, testado).
  `Modal` usa `<dialog>` nativo — trap de foco e `Esc` de graça (F5.1, testado).
- Ícone sem texto: `oxlint` (regras jsx-a11y embutidas) roda com
  `--max-warnings=0` no `verify` — pega isso automaticamente.
- Não verificado nesta rodada: navegação completa por teclado testada à mão
  num navegador real, e zoom 200%. Ferramenta automatizada cobre ~30% das
  violações (regra do manual) — o que sobra continua exigindo teste manual
  humano, que não fiz porque não tenho navegador aqui.

### 5.3 Responsividade (§9.3)

Já coberta em profundidade por `docs/auditoria-stitch.md` (tela a tela,
375/768/1440). Não repito; principal achado de lá segue aberto: sidebar
contratada em `docs/responsive.md:38-40` e nunca construída.

### 5.4 Performance (§9.4)

```
npm run build
```

```
dist/assets/index-CJAw75En.js  597.62 kB │ gzip: 174.24 kB
dist/assets/GanttPage-*.js       5.41 kB │ gzip:   1.93 kB
dist/assets/DashboardPage-*.js   3.59 kB │ gzip:   1.34 kB
```

Code splitting por rota funciona (Gantt/Dashboard não entram no chunk
inicial, conforme `App.tsx`/`specs.md`). **Bundle inicial: 174.24 kB gzip —
dentro do limite de 200 kB do `specs.md`, mas bem acima do baseline de
68.6 kB registrado no fim da Fase 0** (`specs.md:168`). Não investiguei qual
dependência cresceu — ferramenta de análise de chunk (`vite-bundle-visualizer`)
não está instalada e adicioná-la é decisão sua, não minha.

## 6. Fase 8 — Segurança (§10.1, §10.2)

Varredura por grep, sem ferramenta de terceiro:

| Item do checklist (`CLAUDE.md`/manual §10.2) | Resultado |
|---|---|
| `SERVICE_ROLE_KEY` fora de `lib/supabase.ts` | Não encontrada em lugar nenhum do frontend — só citada em comentário explicando por que não entra |
| Segredo em variável `VITE_` | `VITE_SUPABASE_ANON_KEY` é uma `sb_publishable_...` — chave pública por design, correta para o prefixo |
| `.env`/`.env.local` no git | `git log --all -- .env .env.local` → vazio. `.gitignore` cobre `.env`, `.env.local`, `.env.*.local` |
| `dangerouslySetInnerHTML` (XSS) | Zero ocorrências em `src/` |
| Validação de entrada no **servidor** | Confirmada via `supabase/migrations/0001_init.up.sql`: `check (length(trim(title)) between 1 and 200)`, `constraint periodo_coerente`, `constraint marco_tem_data`, `progress between 0 and 100` — não é só validação de cliente |
| RLS ativo em todas as tabelas | Não reverificado nesta rodada — já testado e registrado em `docs/data-model.md` e `docs/progresso.md` (3 blocos OK). Zona Vermelha: não é este agente que reaplica migration |
| `npm audit --audit-level=high` | **0 vulnerabilidades** |

## 7. `npm run verify` — resultado final, depois de todas as correções

```
npm run verify > log 2>&1; echo $?
→ 0
```

Ordem executada: lint (0 warnings) → build (typecheck + bundle) → testes com
cobertura (164/164, 80.62%) → dup (0.44%, sob o limiar) → dead (limpo) →
arch (0 violações) → contrast (32/32).

---

## O que ficou de fora, deliberadamente

- **Não removi `@dnd-kit/sortable`/`@dnd-kit/utilities`** — mudança de
  dependência, pede sua aprovação.
- **Não toquei nos achados de `docs/auditoria-stitch.md`** (sidebar, botões
  mortos, coluna Tags) — essa auditoria já tem sua própria lista de
  prioridades (Parte 6 daquele documento) e é decisão sua o que entra
  primeiro, não desta rodada.
- **Teste manual de teclado/leitor de tela em navegador real** — não fiz;
  fica registrado como pendente, não como feito.
- **Investigação do crescimento do bundle** (68.6 kB → 174.24 kB) — reportado,
  não investigado a fundo nem corrigido.
