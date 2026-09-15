# Dependências instaladas e ainda não usadas

Criado em 2026-09-15, no fim da Fase 0.

Estas dependências foram instaladas conforme o design aprovado, mas nenhum arquivo
as importa ainda. Elas estão em `ignoreDependencies` no `knip.json` **apenas para
não mascarar achados reais** enquanto o app não existe.

**Regra: ao usar uma delas pela primeira vez, remova-a do `knip.json` no mesmo commit.**
Quando esta tabela esvaziar, apague este arquivo e o bloco correspondente do `knip.json`.
Se alguma sobrar aqui no fim do MVP, ela não era necessária — desinstale (o manual
chama isso de código morto, Fase 6).

| Dependência | Entra em | Para quê |
|---|---|---|
| `@supabase/supabase-js` | Fase 3 (fatia vertical) | client em `src/services/` |
| `@tanstack/react-query` | Fase 3 (fatia vertical) | cache, os 4 estados, update otimista |
| `react-router-dom` | Fase 3 (esqueleto) | rotas das 4 views + 404 |
| `lucide-react` | Fase 2 (design system) | ícones, import individual |
| `@testing-library/user-event` | Fase 4 (TDD) | interação em teste |
| `@dnd-kit/core` | Fase 5 (Kanban) | drag-and-drop com suporte a teclado |
| `@dnd-kit/sortable` | Fase 5 (Kanban) | reordenação dentro da coluna |
| `@dnd-kit/utilities` | Fase 5 (Kanban) | helpers de transform do dnd-kit |
| `vitest-axe` | Fase 7 (a11y) | asserção de violação WCAG |
| `vite-plugin-pwa` | Fase 7 (PWA) | manifest + service worker |
