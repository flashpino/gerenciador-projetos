# Gerenciador de Projetos

## O que é
Workspace de gestão de projetos no estilo Monday.com: um board de tarefas visto de 4 formas
(tabela, kanban, gantt, dashboard). Público: squads multidisciplinares, PMs e liderança.

## Stack
React 19 + TypeScript (strict) + Vite 8 + Tailwind v4 + Supabase + TanStack Query + Vitest + RTL

## Documentos que você DEVE ler antes de codar
- `docs/specs.md` — o que construir e, principalmente, o que NÃO construir
- `docs/components.md` — inventário de componentes. Consultar ANTES de criar qualquer um
- `docs/patterns.md` — padrões extraídos do código real (existe a partir da fatia vertical)
- `docs/responsive.md` — contrato de breakpoints
- `docs/data-model.md` — schema, RLS e índices
- `arquivos stitch/` — referência visual e de funcionalidades (design system "Kinetic Workstream")

## Estrutura
```
src/components/ui/        primitivos genéricos. Sem regra de negócio, sem dados
src/components/features/  composições que conhecem o domínio
src/hooks/                estado e dados via TanStack Query
src/services/             ÚNICO lugar que importa o Supabase
src/lib/                  utilitários puros (formatação, datas, cálculo)
src/types/                tipos compartilhados
src/pages/                uma tela por rota
src/styles/tokens.css     fonte ÚNICA de cor, espaço, tipografia, raio, sombra
```

Essas fronteiras não são convenção, são verificadas: `npm run arch` falha o build se
o Supabase vazar para fora de `services/`, se um primitivo importar domínio, ou se
aparecer cor hardcoded fora de `styles/`.

## Regras inegociáveis

### Antes de criar qualquer coisa
1. Consulte `docs/components.md`
2. Se existe algo parecido: adicione uma **VARIANTE**, não um componente novo
   (`<Button variant="danger" size="sm">`, nunca `<DangerButtonSmall>`)
3. Componente novo exige justificativa escrita em `docs/components.md`
4. Verifique se a plataforma nativa já resolve (`<input type="date">`, `<dialog>`,
   `<details>`, CSS `:has()`, constraint no banco)
5. Regra dos três: unifique na terceira ocorrência, não na segunda. Abstração
   prematura é o erro oposto e custa igual

### Estilo
- Zero valor hardcoded de cor, espaço, raio ou fonte. Só tokens. Isso inclui
  valores arbitrários do Tailwind (`bg-[#0073EA]` é violação)
- Tailwind v4: os tokens vivem em `@theme` dentro de `tokens.css`. Não existe
  `tailwind.config` — não crie um. Fonte única, sem divergência possível
- Mobile-first. Desktop é override, nunca o contrário
- Alvo de toque mínimo 44x44px em mobile
- Ícones importados individualmente (`import { Check } from 'lucide-react'`),
  NUNCA por namespace — namespace derruba o tree-shaking

### Os quatro estados
Todo componente que busca dados trata **loading · erro · vazio · sucesso**.
Use `<StateView>`; ele torna "esqueci o estado vazio" impossível por construção.

### Testes
- TDD: o teste falha primeiro (RED), depois o código mínimo (GREEN), depois refatora
- Consulta por `getByRole` / `getByLabelText`. **NUNCA** por classe CSS —
  teste por role é, de graça, um teste de acessibilidade
- Cobertura mínima 80% em caminho crítico. É portão de merge, não relatório
- `renderHook` vem de `@testing-library/react`. O pacote `@testing-library/react-hooks`
  está morto desde o React 18 — não instale
- Não "conserte" um teste alterando a asserção

### Acessibilidade
WCAG 2.2 AA. Contraste 4.5:1 (texto normal) e 3:1 (texto grande e componentes).
Todo elemento interativo alcançável por teclado, com foco visível.
Ícone sem texto tem `aria-label`. Modal faz trap de foco ao abrir e devolve ao fechar.

### ZONA VERMELHA — autoria humana. Você propõe, NÃO aplica
- Fluxo de autenticação e autorização
- Políticas de Row Level Security
- Validação de entrada no servidor
- Migrations de banco (escreva o arquivo, não execute)
- Cálculo de capacidade e alocação de esforço da equipe

### Segurança
- Segredo NUNCA em variável `VITE_` — tudo com esse prefixo vai para o bundle público
- `SUPABASE_SERVICE_ROLE_KEY` não toca o frontend em nenhuma circunstância
- Toda tabela do Supabase tem RLS ativo. Sem exceção
- Toda migration tem o `down` escrito junto com o `up`

## Como trabalhar comigo
- Antes de implementar: mostre o plano, espere aprovação
- Antes de commitar: mostre o diff
- Se algo do `docs/specs.md` contradiz o que peço agora: aponte, não escolha sozinho
- Não adicione dependência sem perguntar
- Se não souber: diga que não sabe. Não invente API nem nome de arquivo

## Erros já cometidos neste projeto (não repita)
- **Nunca infira sucesso de um comando encanado.** `npm run verify | head` devolve o
  exit code do `head`, não do npm. Já commitei com o verify vermelho por causa disso,
  duas vezes. Rode `cmd > log 2>&1; echo $?` e leia o código de verdade.
- **Nunca afirme um número de contraste sem medir.** Escrevi "3:1" num token que era
  1.84:1. Rode `npm run contrast`.

## Comando único de verificação
```
npm run verify
```
Roda, em ordem: lint (zero warnings) → typecheck + build → testes com cobertura →
jscpd (duplicação literal) → knip (código morto) → check-arch (fronteiras).
Um comando, não seis. O sexto é o que se esquece.
