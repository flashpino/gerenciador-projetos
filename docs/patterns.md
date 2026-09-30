# Padrões Extraídos do Código Real

**Fase do manual:** 5.1 · Escrito **depois** da fatia vertical, a partir do código que existe.

As próximas features referenciam este arquivo em vez de reinventar. Se um padrão
aqui divergir do código, o código venceu — atualize este arquivo no mesmo commit.

---

## 1. O caminho de um dado, ponta a ponta

```
componente  →  hook            →  serviço          →  Supabase
TaskGroup      useQuadro.ts       services/boards.ts   tabela tasks
   ↑              ↑                   ↑
   │              │                   └─ único lugar que importa o client
   │              └─ cache, os 4 estados, update otimista
   └─ só recebe props; não sabe que Supabase existe
```

`npm run arch` falha o build se essa ordem for violada. Não é convenção.

---

## 2. Os quatro estados — uma regra, um lugar

```tsx
const estado = estadoDaQuery(query, {
  titulo: 'Nenhuma tarefa ainda',
  descricao: 'Crie o primeiro grupo para começar.',
  acao: <Button variant="primary">Criar primeiro grupo</Button>,
}, () => void query.refetch())

<StateView estado={estado}>{/* só renderiza no sucesso */}</StateView>
```

`Estado` é uma **união discriminada** de 4 variantes. Esquecer o estado vazio não
é indisciplina: é erro de compilação. Toda tela que busca dados usa isto.

---

## 3. Mutação = update otimista com rollback

Padrão obrigatório para **toda** escrita. Está em `useAtualizarTarefa`:

```ts
onMutate: async ({ id, campos }) => {
  await qc.cancelQueries({ queryKey: chave })   // 1. cancela refetch em voo
  const anterior = qc.getQueryData(chave)       // 2. snapshot
  qc.setQueryData(chave, /* aplica local */)    // 3. UI muda JÁ
  return { anterior }
},
onError:  (_e, _v, ctx) => qc.setQueryData(chave, ctx.anterior),  // 4. desfaz
onSettled: () => qc.invalidateQueries({ queryKey: chave }),       // 5. reconcilia
```

**O passo 1 não é opcional.** Sem cancelar os refetches em voo, um deles chega
depois do update otimista e sobrescreve com o dado velho — o bug aparece uma vez
a cada vinte cliques e é impossível de reproduzir sob demanda.

**O passo 5 roda em sucesso E em erro**, porque o banco pode ter normalizado algo
(trigger de `updated_at`, constraint) que o otimista não previu.

---

## 4. Erro nunca vaza o banco para a tela

`services/erros.ts` traduz código do PostgREST em mensagem de domínio:

| Código | Vira |
|---|---|
| `23514` (check) | "Os dados informados não são válidos…" |
| `42501` / `PGRST301` | "Você não tem permissão para isso." |
| qualquer outro | "Não foi possível completar a operação." |

A mensagem crua do Postgres cita nome de tabela, de coluna e de constraint. Isso
é reconhecimento de superfície de graça para quem estiver olhando.

---

## 5. Nomenclatura

| Camada | Idioma | Por quê |
|---|---|---|
| `src/types/domain.ts` | **inglês** | espelha os nomes do banco 1:1; traduzir cria um dicionário mental a cada query |
| resto do código | **português** | é o idioma do domínio e da equipe |

Arquivo: `PascalCase.tsx` para componente, `camelCase.ts` para o resto.
Teste ao lado do arquivo, mesmo nome, sufixo `.test.`

---

## 6. Acessibilidade — os padrões que se repetem

**Status e prioridade:** o rótulo em texto vive *dentro* do badge. Cor sozinha
reprova em WCAG 1.4.1. O par fundo+texto vem sempre junto do token
(`STATUS[s].classe`) — separar quebra os 4.5:1 que o `check-contrast` valida.

**Botão que só mostra visual:** o texto real vai num `sr-only` e o visual recebe
`aria-hidden`. Ver `EnumCell`:

```tsx
<span className="sr-only">Status de {nomeTarefa}: {rotulo}. Alterar</span>
<Badge className="pointer-events-none"><span aria-hidden="true">{rotulo}</span></Badge>
```

**Gráfico:** os números são **texto real** em `sr-only`, e a figura fica
`aria-hidden`. Não use `aria-label` com os números — texto real é selecionável,
traduzível e sobrevive a falha de CSS.

**Alvo de toque:** `min-h-touch md:min-h-8`. O tamanho compacto **só** a partir de
768px; aplicar em mobile quebra WCAG 2.5.8.

---

## 7. Responsivo: troca de componente, não de CSS

A tabela e a lista de cards são **dois componentes**, alternados por
`hidden md:table` e `md:hidden`. `display:none` remove do DOM acessível, então o
leitor de tela nunca vê os dois.

Não transforme `<table>` em cards por CSS: o `role="table"` continua lá e o leitor
anuncia "tabela, 7 colunas" para algo que virou lista.

---

## 8. Datas

Nunca use `new Date(stringDoBanco)`. O tipo `date` do Postgres chega como
`"2026-09-15"`, e `new Date()` disso cria meia-noite **UTC** — em UTC-3 vira dia 14.
Use sempre `parseDataSimples` de `lib/date.ts`.

Diferença em dias é contada por calendário, nunca dividindo milissegundos por
86.400.000: dia de mudança de horário de verão tem 23 ou 25 horas.

---

## 9. Percentuais que somam 100

`distribuicaoStatus` usa o **método do maior resto**. Arredondar cada fatia de
forma independente dá 99,9% ou 100,1%, e a barra empilhada fica com uma fresta ou
estoura o container. Qualquer outra divisão percentual no app deve reusar essa função.

---

## 10. Estado de tela na URL, e o campo que perde tecla

Busca e filtros do board moram na query da URL (`?q=…&status=…`): sobrevive à troca de visão, ao
reload e ao voltar, e o link é compartilhável. A lógica é pura em `lib/filtro.ts`
(`lerFiltro`/`escreverFiltro`/`aplicarFiltro`), o hook `useFiltroTarefas` só liga isso ao roteador.

**Não ligue um campo de texto direto à URL.** Cada tecla vira uma navegação assíncrona do
roteador e a seguinte chega antes de a anterior voltar: digitei "tarefa" e a URL ficou "trefa".
No jsdom **isso não aparece** (tudo é síncrono, o teste passa), só no navegador real. O padrão
certo é `useBuscaDoBoard`: estado local enquanto se digita, escrita na URL depois de uma pausa
(250 ms), e um `ref` com o último valor escrito para distinguir "eu escrevi" de "mudou por fora
(limpar, voltar)". Vale para qualquer campo de texto que reflita na URL.

Lição de processo: teste de digitação em jsdom **não prova** que um campo controlado assíncrono
funciona. Rode no navegador.

---

## 11. O que NÃO fazer

| Não | Por quê |
|---|---|
| Escrever função de serviço "para depois" | O knip aponta como export morto e o `verify` fica vermelho. Escreva no commit da feature que usa |
| Criar um componente porque dois parecem iguais | Regra dos três. Mas se o **comportamento** é idêntico (status × prioridade), unifique na segunda |
| `setState` dentro de `useEffect` para derivar estado | Calcule no evento que causou a mudança. Ver `Menu.abrir()` |
| Ler exit code de comando encanado | `npm run verify \| head` devolve o código do `head` |
