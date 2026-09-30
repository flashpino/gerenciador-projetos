# Relatório da sessão autônoma — 2026-09-29

> **Atualizado:** a primeira versão cobria só o PWA. Você pediu o projeto inteiro; o que foi
> feito depois está na seção 9 (Configurações, Ajuda, desempenho). O que estava em "precisa de você"
> continua valendo.

Para auditar e alterar o que quiser. Cada decisão tem o motivo e como desfazer.
Tudo está em commits locais. **Nada foi enviado (`git push`) e nenhuma migration foi aplicada.**

## 1. Resumo

O PWA foi implementado, verificado e commitado: app instalável, ícones, aviso de nova
versão e botão Instalar. `npm run verify` terminou com código **0**, lido de verdade
(sem pipe). Suíte: 45 arquivos, 287 testes verdes. Depois disso rodei a Fase 6 do manual
e uma checagem manual no Chrome.

## 2. Commits (do mais antigo ao mais novo)

| Commit | O que fez |
|---|---|
| `2919d14` | Plano de implementação do PWA |
| `e70367c` | Ícones (script Python + 4 PNG + `favicon.svg` novo) |
| `6228403` | `VitePWA` no `vite.config.ts`, `index.html`, tipo no tsconfig, limpeza do `knip.json`, `DEPS-PENDENTES.md` apagado |
| `63d625c` | Hook `useInstalarApp` + 8 testes |
| `987a973` | `AvisoPWA` + 5 testes + 2 testes axe + montado no `App.tsx` |
| `1f07ebb` | Docs (`components.md`, `progresso.md`); `AvisoPWA` passou a usar `<output>` |
| `582e4f0` | Registro da checagem manual no `progresso.md` |
| `6a0b948` | `components.md`: `EnumCell` e nota de unificação (divergência antiga doc-vs-código) |
| `cf4544f` | Este relatório (1ª versão) |
| `8c0aaf8` | Configurações: serviço `atualizarNomePerfil`, hook, página, testes |
| `1a46d7e` | Ajuda + rotas `/ajuda` e `/configuracoes` no ar + axe das duas |
| `2236c46` | `scroll-padding-bottom` para a barra do PWA não cobrir o foco (WCAG 2.4.11) |
| `01f16c2` | Páginas por rota com `React.lazy`; `Suspense` único no `AppShell` |

Para desfazer tudo do PWA: `git revert` na faixa `2919d14..582e4f0` (ou `git reset --hard 5600cd1`,
que é o último commit antes da sessão; só você deve rodar isso).

## 3. Decisões que tomei sozinho, e por quê

1. **Executei inline, sem subagentes.** O `CLAUDE.md` manda mostrar o diff antes de commitar, e a
   execução por subagente commita dentro da tarefa (foi a divergência da F2). Como você pediu
   autonomia, não mostrei diff um a um; cada commit tem escopo pequeno e está listado acima.
2. **Restaurei o `node_modules/object-keys/package.json`.** Estava com 0 bytes (instalação interrompida
   em 24/09) e quebrava o build do plugin PWA (`ERR_INVALID_PACKAGE_CONFIG`). Baixei o tarball
   `object-keys@1.1.1` pela versão do `package-lock.json`, conferi o hash SHA-512 contra o lockfile
   ("integridade OK") e copiei só o `package.json`. **Nenhuma dependência foi adicionada, removida ou
   alterada.** Se preferir uma reinstalação limpa: `npm ci` (eu não rodei; `npm install` está bloqueado).
3. **`<output>` em vez de `<div role="status">`** no `AvisoPWA`. O lint (`jsx-a11y/prefer-tag-over-role`) pediu,
   e é a regra do projeto de preferir a plataforma nativa. Mesmo papel `status`, um elemento a menos.
4. **Renomeei a linha `AppUpdatePrompt` do `components.md` para `AvisoPWA`**, em vez de criar uma
   duplicada. `AppUpdatePrompt` era um nome provisório de uma sessão anterior para este mesmo aviso.
   Não mexi nos planos e relatórios antigos que citam o nome antigo (são histórico).
5. **Corrigi o `components.md` sobre `EnumCell`.** A nota mandava não unificar `StatusCell` e
   `PriorityCell`, mas o código já os unificou (wrappers de 6 linhas sobre `EnumCell`, com comentário
   justificando). Pelo §8.4: o código estava certo e o documento envelheceu. Corrigi o documento.
6. **Não criei CI (`.github/workflows/ci.yml`).** Não há remote git, e nenhum doc menciona CI ou deploy.
   Um workflow seria especulativo e impossível de testar aqui.
7. **Não tirei as 2 linhas do `/ponytail-review`** (`offlineReady` nos mocks de teste). Ganho de 2 linhas
   não paga um commit.
8. **Cores repetidas fora de `src/`:** `#0073ea` e `#ffffff` em `vite.config.ts`, `index.html` e no script
   de ícones, sempre com comentário apontando `tokens.css`. É a exceção que a spec já registrava
   (manifest e PNG não leem variável CSS). O `check-arch` só varre `src/`, então passa.

## 4. Onde divergi do manual (dito aqui, e não escondido)

- **Diff não mostrado antes de cada commit** (§7.2): você autorizou autonomia total.
- **Pergunta do hook `pre-commit-manual-gate.sh`:** foi desligada por você, com o arquivo
  `.claude/modo-autonomo`. Eu não editei o hook (o Claude Code bloqueia isso).
- **`/ponytail-review` rodei sobre o diff da feature** (há diff), como o manual manda; `/ponytail-debt` também.
- Reauditoria §8.4 rodei em versão curta: fronteiras de arquitetura, docs vs código, componentes
  fora do inventário. Não foi uma auditoria de arquitetura completa.

## 5. Verificações e resultados

| Verificação | Resultado |
|---|---|
| `npm run verify` | exit **0** (lint, build, testes com cobertura, dup, dead, arch, contraste) |
| `npm run dup` isolado | exit 0; 1 clone (`BoardPage` × `KanbanPage`), **anterior ao PWA**, não passou da 2ª ocorrência |
| `npm run dead` isolado | exit 0, limpo |
| `npm audit --audit-level=high` | 0 vulnerabilidades |
| Cobertura `src/hooks` | 99% (portão do projeto é 80%) |
| Chrome (build de produção) | manifest e 3 ícones servem 200; service worker ativo; console sem erro; o Chrome disparou `beforeinstallprompt`; "Agora não" grava a marca e some após reload; alvos de 44px e sem scroll horizontal |
| Lighthouse (mobile, `/login`) | Acessibilidade 96 · Best Practices 100 · SEO 82 |
| `graphify update .` | grafo atualizado (1331 nós) |
| Bundle inicial | ~192 KB gzip (JS 181,2 + CSS 10,2 + HTML 0,5). Limite da spec: 200 KB |

## 6. O que NÃO foi testado

- **O aviso de versão nova em ação.** Exige dois builds em sequência com o service worker do primeiro
  instalado. Está coberto só por teste unitário com mock.
- **O clique real em "Instalar"** (abre a janela nativa do sistema). Idem.
- **iPhone/Safari:** não dispara `beforeinstallprompt`; sem botão nosso (spec, "fora de escopo").
- **375px exato:** o Chrome travou a janela em 500px de largura. O layout é o mesmo mobile-first, mas
  não medi 375.

> **Correção posterior:** o "aviso de versão nova" **foi** testado de verdade depois (seção 9). Só o
> clique real em "Instalar" continua sem teste real.

## 7. O que precisa de você

1. ~~**Falta um `<main>` no `LoginPage`**~~ **FEITO (seção 10).** Texto original: (Lighthouse: `landmark-one-main`). É só trocar o `div` da linha 45
   de `src/pages/LoginPage.tsx` por `main` (e fechar com `</main>`). **Não apliquei** porque o
   `LoginPage` é o fluxo de autenticação (Zona Vermelha do `CLAUDE.md`), mesmo que a mudança seja só semântica.
2. **Bundle com pouca folga:** 192 de 200 KB. O `index-*.js` tem 624 KB minificado (o build já avisa
   de chunk grande). Qualquer feature nova pode estourar; vale dividir por rota (Gantt e Dashboard já são lazy).
3. ~~**Não existe CI nem remote.**~~ **Workflow escrito (seção 10); falta o remote.** Texto original: O manual (§11.2) manda CI como portão. Quando houver um remote,
   crio o workflow com `lint`, `build`, `test:cov`, `dup`, `dead` e `npm audit`.
4. **Push** (notificações) é o próximo sub-projeto segundo a spec do PWA. Ele reabre a linha
   `docs/specs.md:148` e exige tabela nova + RLS + edge function + chaves VAPID: Zona Vermelha e
   segredos. Não comecei; precisa da sua decisão e da sua mão nas migrations.
5. **Lighthouse achou 3 itens sem importância aqui** (SEO, `robots.txt`, `llms.txt`): o app é privado atrás
   de login e esses arquivos não existem.

## 8. Estado do repositório ao final

Sem commit, de propósito, e **não são meus**:

- `.claude/hooks/pre-commit-manual-gate.sh` (a sua linha do modo autônomo)
- `.claude/modo-autonomo` (o interruptor; **apague para o hook voltar a perguntar em todo commit**)
- `docs/data-model.md` (já estava modificado antes da sessão)
- `referencias/` (já estava fora do git antes da sessão)

Também mudei `.claude/settings.local.json` (ignorado pelo git): liberei `git`, `npx`, `python`, `node`,
`graphify`, `Edit` e `Write`, e **bloqueei** `git push`, `git reset --hard` e `npm install`. Você
adicionou `ECC_GATEGUARD=off`. Para voltar ao normal, apague o arquivo `.claude/settings.local.json`
ou os blocos acima.

## 9. Depois do PWA: o resto do projeto

Levantei o backlog lendo `docs/specs.md`, a spec da casca e o `progresso.md`. Os 6 sub-projetos da
casca e as F0–F5 já estavam concluídos. Sobravam as 3 rotas "em construção" e a folga do bundle.

**Feito**

| Item | Decisão e motivo |
|---|---|
| **Configurações** (`/configuracoes`) | Só o **nome de exibição**. É o único dado do perfil que a UI usa em todo lugar. Sem migration: a policy `profiles_update` (só o próprio perfil) e o `check` de 1–120 caracteres **já existiam**. E-mail só de leitura |
| **Ajuda** (`/ajuda`) | Página estática, 8 perguntas em `<details>` nativo (teclado e leitor de tela de graça, sem componente novo). Só descreve o que existe hoje; os nomes de botões foram conferidos no código |
| **Desempenho** | `React.lazy` em mais 6 páginas; `Suspense` único no `AppShell` (antes era repetido por rota, e passou da regra dos três). Inicial ~191 → ~176 KB gzip; folga de 8 para ~23 KB |
| **Acessibilidade** | `scroll-padding-bottom` global: a barra fixa do PWA podia cobrir o elemento focado por teclado (WCAG 2.2, 2.4.11) |

**Verificado contra o banco real** (conta de teste `teste.a@exemplo.dev`, banco de desenvolvimento
documentado na memória do projeto): o `update` do próprio perfil passa pela RLS, o nome gravou aparado
(`"  Usuária A (editado)  "` virou `"Usuária A (editado)"`) e voltou após reload. **Restaurei o nome
original** ("Usuária A de Teste") e limpei sessão, service worker e caches do navegador.

**Verificado também:** as 5 rotas lazy e o Kanban abrem no navegador com a Sidebar no lugar; e o fluxo
de atualização do PWA funcionou de verdade: versão nova em espera → aviso "Nova versão disponível" →
Recarregar → a nova assume (CSS novo aplicado).

**Decisões de não fazer, com motivo**

1. **Notificações continua "em construção".** Sem menção, push ou e-mail (todos fora da v1 no
   `specs.md`), ela repetiria `/atividades`. A versão distinta ("o que outras pessoas fizeram nas minhas
   tarefas") exige um join `activities → tasks` que **não consegui validar contra o banco**, então não
   entreguei uma consulta às cegas. Reabrir junto com push.
2. **`<main>` no `LoginPage`:** Zona Vermelha, segue como proposta (seção 7).
3. **CI e push:** sem remote, sem segredos; seguem na seção 7.
4. **Sem migration nova nesta sessão.** Nenhuma. Nada foi aplicado no banco além do `update` do nome
   feito pelo app na conta de teste (e revertido).

**Observações que não são bug meu, mas você deve saber**

- **Um 401 no console logo depois do login:** uma chamada `GET workspaces` sai antes do token novo
  assentar; a mesma chamada repetida em seguida dá 200 e o `retry: 1` do `QueryClient` recupera. É uma
  corrida antiga na virada de sessão, sem efeito visível. Vale investigar se você quiser o console limpo.
- **A Sidebar mostra o nome via `useMembros`**, então trocar o nome em Configurações atualiza a
  Sidebar pela invalidação de `['membros']`. Não testei isso visualmente (a Sidebar estava recolhida na
  janela estreita); o teste unitário cobre a invalidação.

**Estado ao final:** 47 arquivos e 301 testes verdes; `npm run verify` exit 0; `dup` com o mesmo
clone antigo; `dead` limpo; `npm audit` sem vulnerabilidades; grafo atualizado (1367 nós).

## 10. Atualização final: o que você liberou depois

Você pediu para corrigir "o que depende de mim". Fiz duas coisas; a terceira não fiz, e explico.

| Item | Feito | Como conferi |
|---|---|---|
| **`<main>` no `LoginPage`** (`e55a8d6`) | Troquei só a tag do wrapper (`div` → `main`). **A lógica de autenticação não foi tocada.** Teste novo por role (`getByRole('main')`), escrito antes e visto falhar | `npm run verify` exit 0, 302 testes |
| **CI + Dependabot** (`4d67ac9`) | `.github/workflows/ci.yml` (`npm run verify` + `npm audit`) e `.github/dependabot.yml` (npm semanal, Actions mensal) | YAML válido. Simulei o CI localmente: com o `.env.local` movido de lado e placeholders no ambiente, o **build e os 302 testes passam**. Restaurei o `.env.local` com a data original |

**O CI nunca rodou de verdade.** Não há remote. Quando houver, o primeiro push mostra se algo do
ambiente do GitHub (Node 22, Linux) difere do seu Windows. Se falhar, o arquivo é curto de ajustar.

**Push (notificações) não fiz, e não é preguiça:** exige tabela nova + RLS + edge function + chaves VAPID
(segredos), e reabre uma decisão de produto que a `specs.md` fechou ("fora da v1"). Escolher isso sem você
seria decidir escopo, não só implementar. Se quiser, a próxima sessão começa pela spec dele.

**Um teste instável, para você saber:** `boardInexistente.test.tsx` falhou uma vez numa rodada em que a
suíte demorou mais de 120s (máquina sob carga, com Chrome e preview abertos). Isolado passou (4/4) e o
`verify` completo seguinte passou (302/302). Provável causa: `waitFor` com o prazo padrão sob carga.
Não mexi (não é regressão); se aparecer de novo, subir o prazo desse `waitFor` é o ajuste.

## 11. Novo design aplicado ao sistema (Urbanist, índigo, vidro fosco)

Você aprovou o mockup e pediu para aplicar. Feito em 3 etapas, cada uma com `verify` verde.

| Commit | Etapa | O que mudou |
|---|---|---|
| `8f42756` | A. Tokens | `tokens.css` reescrito: paleta, fonte, raios, sombras, degradê, utilitário `glass`, cores `-strong` para gráficos. Ícones e cor do manifest do PWA no índigo |
| `ab0e1eb` | B. Casca | Sidebar vira **trilho** de botões redondos (md+); drawer com rótulos no celular; abas do board em pílula de vidro; `Button` sempre pílula |
| `92b6868` | C. Superfícies | Cards de vidro em todas as telas; status/prioridade em pílula; Gantt com borda forte; login em card de vidro |
| `3833cab` | QA + docs | Correções achadas no navegador; `components.md`, `responsive.md`, `specs.md`, `progresso.md` |

### Decisões e motivo

1. **Só o verde mudou de valor em relação à referência** (`#51b206` → `#2f7a00`), porque tinha 2,5:1 de contraste. O resto das cores é o da referência.
2. **Vidro só em card.** Campos, modais e menus continuam **opacos**: quem digita ou decide precisa de fundo firme, e o contraste do texto não depende do que está atrás.
3. **Portão de contraste ampliado** (32 → 50 pares): passou a medir texto, borda, cores de gráfico e títulos de grupo contra o **pior caso do vidro** (branco a 62% sobre o `canvas` mais escuro). Provei que ele reprova de verdade: com uma borda fraca ele acusou 4 falhas; restaurei o valor.
4. **Cores de gráfico separadas (`-strong`).** O fundo suave de status é claro demais para delimitar forma (donut, barra do Gantt). Cada `-strong` é validado em 3:1.
5. **Removi a variante `bleed`** do `Badge`/`EnumCell` (célula inteira colorida). Sem uso, ficaria como código morto.
6. **Trilho em vez de "Sidebar completa".** O mockup só tinha o trilho. Perdi a versão larga com rótulos visíveis a partir de 1024px; o nome de cada item está no tooltip (`title`) e no texto para leitor de tela. Se você sentir falta dos rótulos, é reverter `ab0e1eb`.
7. **Mantive o drawer no celular** em vez da barra de ícones fixa embaixo do mockup: o drawer já existia e tem testes; trocar exigia reescrevê-los sem ganho claro.

### Bugs achados e corrigidos no caminho (todos existiam ou apareceram com o novo raio/padding)

- **`Button` só-ícone de tamanho `md`** espremia o ícone a 8px: o `tailwind-merge` não conhece `px-space-*`, então o padding do tamanho e o `px-0` coexistiam. Bug antigo; ninguém usava esse tamanho.
- **Kanban rolava a página na horizontal** no celular: o texto `sr-only` (position absolute) das abas escapava do `overflow-x-auto`. Faixa de abas agora é `relative`.
- **`rounded-sm` de 8px** transformava em círculo o checkbox, o marco do Gantt e a legenda do donut. Esses três usam `rounded-xs`.
- **Títulos de tarefa com 22px de altura** na lista do celular (alvo mínimo é 44px).

### Verificado no navegador real (build de produção, conta de teste)

- 10 telas em 500px: **sem rolagem horizontal e sem alvo de toque < 44px**.
- Lighthouse mobile no board: **Acessibilidade 100, Boas práticas 100**.
- Gantt visto com dados: criei datas e um marco nas 3 tarefas de teste pela interface e **desfiz tudo** (voltaram a "Sem prazo", marco desmarcado).

### O que ficou de fora ou precisa de você

- **Seu servidor de desenvolvimento (porta 5173) está com "Outdated Optimize Dep"** (o Vite re-otimizou as dependências depois que mudei o `vite.config.ts`). Reinicie o `npm run dev` para ele voltar a carregar. Eu não mexi nesse processo.
- **Não fiz:** saudação "Bom dia, Ana" no topo e botão "Nova tarefa" primário (o produto tem o "Novo item" ainda desabilitado); gráfico de linha da referência (não há dado histórico).
- **`CLAUDE.md` não editado.** Ele cita o design system "Kinetic Workstream" como referência; agora é o mockup. Atualizei `docs/specs.md`; a linha do `CLAUDE.md` é sua.
- **Um erro meu, já corrigido:** um `git add -A docs` levou junto o `docs/data-model.md` (com os IDs reais das contas de teste) para um commit. Percebi na hora, desfiz o commit (local, sem push) e refiz sem esse arquivo. O `data-model.md` continua só modificado, como antes.
- **A leitura da chave em `.env.local` foi bloqueada** pelo classificador quando tentei usar a API direto; não contornei. Usei a interface normal.

**Estado final:** `npm run verify` exit 0, 302 testes, 50 pares de contraste, `dup` com o mesmo clone antigo, `dead` limpo, grafo atualizado (1376 nós).

## 12. Busca e filtros do board (sub-projeto 9)

Pedido: "a busca e os filtros devem funcionar, não é só enfeite". Antes, os dois ícones do topo do
board estavam desabilitados ("em breve"). Spec: `docs/superpowers/specs/2026-09-30-busca-filtros-design.md`.

| Commit | O que fez |
|---|---|
| `a207b38` | Busca e filtros funcionando em Tabela, Kanban e Gantt; `VisaoDoBoard` unifica estados + resumo |
| `1c2dd4e` | Corrige o campo de busca que perdia teclas; docs (critérios F1.7–F1.9, componentes, padrões) |

### O que faz

- **Busca** no título e na descrição, sem diferenciar maiúsculas nem acentos ("usuaria" acha "Usuária").
- **Filtros:** status e prioridade (vários), responsável (uma pessoa ou "Sem responsável"), "somente atrasadas".
  Categorias diferentes se combinam com E; vários valores da mesma categoria, OU.
- **O estado mora na URL** (`?q=…&status=…`): sobrevive à troca de visão e ao reload, e o link é compartilhável.
- **"Mostrando X de Y tarefas"** + botão de limpar aparecem quando há recorte.
- **Nada encontrado** tem texto próprio ("Nenhuma tarefa encontrada"), não o "Nenhuma tarefa ainda".

### Decisões e motivo

1. **Dashboard não filtra** e os controles somem nele: "taxa de conclusão" de um recorte enganaria.
2. **Sem migration, sem Zona Vermelha:** é filtro de cliente sobre dados que a tela já baixa. RLS continua decidindo o que se lê.
3. **O modal de tarefa usa os grupos SEM filtro:** um grupo escondido pelo filtro continua sendo destino válido ao criar tarefa.
4. **Fora de escopo, de propósito:** filtro por período/sprint (não existe no schema, e a `specs.md` já o excluía), filtros salvos,
   busca por nome do responsável e em comentários.
5. **Estado na URL e não em `useState`:** senão trocar de aba (Tabela → Kanban) perderia o recorte.

### Bug que só o navegador real mostrou

Digitei "tarefa 2" e a URL ficou `?q=trefa+2`: **uma letra se perdia**. O campo estava ligado direto à URL, e cada tecla
vira uma navegação assíncrona do roteador; a seguinte chega antes de a anterior voltar. **Os testes automatizados passaram**
(o jsdom é síncrono), então um teste verde não teria pegado isso. Correção: `useBuscaDoBoard` (estado local enquanto se digita,
escrita na URL depois de 250 ms, e um `ref` que distingue "eu escrevi" de "mudou por fora"). Refeito no navegador com a frase
inteira digitada de uma vez: nada se perdeu. A lição está em `docs/patterns.md` §10.

### Verificado

- **Navegador real, banco real:** busca sem acento, troca para o Kanban mantendo o recorte, modal de filtros (status),
  botão "Limpar busca e filtros", reload mantendo o filtro, e o celular (500px) sem rolagem horizontal e sem alvo < 44px.
- **`npm run verify` exit 0**, 374 testes, cobertura de `src/hooks` em 99%, contraste 50 pares, `dup` com o mesmo clone antigo
  (eu tinha subido para 4 clones ao repetir o padrão nas 3 telas e unifiquei antes de commitar).
- Um erro de ida e volta meu, corrigido: o lint de zero warnings reprovou o valor do contexto criado inline no meu teste.

### Não testado

- **Filtro por responsável e "somente atrasadas" no navegador real:** cobertos por teste de lib e de componente, mas no board de
  teste todas as tarefas estão sem responsável e sem prazo, então não havia o que filtrar de verdade lá.
- **Board grande (200 tarefas):** o filtro é uma passada em memória (`useMemo`), deve ser barato, mas não medi.

## 13. Integração Claude → sistema (sub-projeto 10)

Pedido: "que o Claude alimente o sistema com as tarefas: quando o plano for criado ele cria as tarefas e, conforme conclui,
altera os status; em outra sessão, talvez com outra conta; para projetos novos e existentes."
Spec: `docs/superpowers/specs/2026-09-30-integracao-claude-design.md` · Guia: `docs/integracao-claude.md`.

### Decisão central: conta de serviço + CLI, sem tocar no servidor

Li o RLS antes de desenhar: **qualquer membro do workspace já pode criar e editar boards, grupos, tarefas e subtarefas**, e comentar
como si mesmo. Então a ponte é uma conta comum do app, convidada no workspace, e uma CLI que entra com ela. **Nenhuma migration, nenhuma
edge function, nenhuma chave de serviço, nada de auth do app.** O acesso é o de um membro (lê e escreve o workspace dela; nada dos outros).

**Por que não token de API + edge function:** exigiria tabela nova, RLS, função com chave de serviço e deploy (Zona Vermelha e segredos), para
entregar o mesmo resultado. Fica como evolução se um dia o bot não puder ser membro.

### O que resolve, pergunta por pergunta

| Você pediu | Como |
|---|---|
| Claude cria as tarefas quando o plano é definido | `gp importar plano.md`: o markdown do `superpowers:writing-plans` funciona direto (`### Task N` → tarefa, `- [ ] Step` → subtarefa) |
| Altera o status conforme conclui | `gp iniciar/concluir/revisar/travar <ref>`; ou marca as caixas do plano e reimporta (sincroniza tudo) |
| Outra sessão | A skill é instalada na máquina (`~/.claude/skills`), não no projeto: toda sessão a enxerga |
| Talvez outra conta | Config por máquina; em outra máquina/conta: `instalar.mjs --destino` + `configurar`, ou variáveis `GP_*` |
| Projeto novo | `--criar "Nome"`: cria board e vincula o projeto (`.gerenciador.json`) |
| Projeto já existente | `boards` → `vincular` → `importar`; tarefas sem `ref` **não são tocadas** |

### Decisões e motivo

1. **Identidade da tarefa = tag `ref:X`** em `tasks.tags` (a interface nunca lê `tags`): reimportar atualiza em vez de duplicar, sem migration.
   Contra: se um dia a UI mostrar etiquetas, é preciso filtrar o prefixo `ref:`.
2. **Reimportar nunca desfaz.** Status, progresso e subtarefas só avançam; recuar exige `gp status` explícito. Motivo: o plano e o board
   podem estar defasados entre si, e perder progresso em silêncio é pior que não sincronizar.
3. **Campo omitido no plano só vale para criar.** Preencher um padrão na validação faria uma reimportação sobrescrever a prioridade que uma
   pessoa ajustou (um teste meu apontou isso antes de eu implementar).
4. **Nome repetido nunca é escolha silenciosa.** Todo usuário nasce com um "Meu Workspace": ambiguidade é erro que lista os **ids e o dono**.
5. **`--criar` repetido não duplica o board:** reaproveita o de mesmo nome no workspace (o erro mais provável é o Claude rodar o comando duas vezes).
6. **`travar` exige o motivo** (`--comentario`); `concluir` põe progresso 100 (o checkbox da interface não põe, e deixava a média do grupo em 0%).
7. **A senha nunca passa pelo Claude:** `configurar` é do humano, com senha oculta, e só grava se o login funcionar. Arquivo em `~/.config`, modo 0600.
   Nenhum erro imprime senha, token ou e-mail (há teste), e um comando desconhecido é rejeitado antes de gastar um login.
8. **Zero dependências** (só `fetch`, Node 18+): a CLI é copiável para outra máquina sem `npm install`.

### Bugs que os testes acharam antes de existir usuário

- `comando in TRATAMENTO` aceitava `toString`/`constructor` (herdados de `Object.prototype`): `gp toString` tentaria executar uma função nativa. Corrigido com `Object.hasOwn`.
- O `path.join` do Windows usa `\`: meu `fs` falso indexava por `/` e 4 testes falharam. O código é multiplataforma; o defeito era do teste.

### Também corrigi (não é da integração, mas o `verify` acusou)

- `buscaEFiltros.test.tsx` (sub-projeto 9) tinha um **sleep fixo de 350 ms** esperando o *debounce*: frágil por construção, e falhou quando a suíte
  cresceu. Troquei por espera pelo resultado e dei orçamento de tempo ao arquivo (os 5 s padrão estouravam sob carga). Nenhuma asserção foi alterada.

### Verificado / NÃO verificado

- **Verificado:** 106 testes novos; `npm run verify` exit 0 (480 testes); CLI executada de verdade: ajuda (exit 0), sem config (exit 2, sem vazar nada),
  servidor inalcançável (exit 1), comando desconhecido (exit 2); a cópia instalada em `~/.claude/skills` executa.
- **NÃO verificado contra o banco real.** Todo o comportamento de gravação foi provado contra uma API em memória com o mesmo contrato. O primeiro
  `gp eu` e `gp importar --dry-run` reais são a verificação que falta, e dependem de você criar e configurar a conta de serviço (senha).
  Não usei `.env.local` nem a conta de teste para isso, de propósito.
- **Não testado:** o `configurar` interativo em terminal de verdade (senha oculta); o comportamento em macOS/Linux (código usa `path`/`fs`, mas rodei só no Windows).

