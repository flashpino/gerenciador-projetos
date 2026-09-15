# Manual de Vibecode Disciplinado com Claude Code
### Do repositório vazio ao deploy, sem retrabalho

**Versão:** 1.0 · Setembro de 2026
**Escopo:** web apps e PWAs (React + TypeScript + Vite + Supabase)
**Base:** revisão e correção do documento "Fluxo Universal para Web Apps & PWAs" (ECC + Superpowers + Ponytail + Graphify)

---

## Sumário

- [Parte 0 — Leia antes de instalar qualquer coisa](#parte-0)
- [Parte 1 — Instalação (comandos corrigidos)](#parte-1)
- [Parte 2 — Fase 0: Fundação (a fase que faltava)](#parte-2)
- [Parte 3 — Fase 1: Descoberta e especificação](#parte-3)
- [Parte 4 — Fase 2: Design system e arquitetura](#parte-4)
- [Parte 5 — Fase 3: Esqueleto e primeira fatia vertical](#parte-5)
- [Parte 6 — Fase 4: Ciclo TDD](#parte-6)
- [Parte 7 — Fase 5: Implementação em lote](#parte-7)
- [Parte 8 — Fase 6: Antiduplicação e revisão](#parte-8)
- [Parte 9 — Fase 7: Acessibilidade, responsividade e performance](#parte-9)
- [Parte 10 — Fase 8: Segurança](#parte-10)
- [Parte 11 — Fase 9: Verificação e CI](#parte-11)
- [Parte 12 — Fase 10: Deploy](#parte-12)
- [Parte 13 — Fase 11: Pós-deploy e manutenção](#parte-13)
- [Anexo A — CLAUDE.md pronto para copiar](#anexo-a)
- [Anexo B — Tabela mestre de comandos](#anexo-b)
- [Anexo C — Os 18 erros bobos mais comuns e como evitá-los](#anexo-c)
- [Anexo D — O que o documento original não cobria](#anexo-d)

---

<a name="parte-0"></a>
## Parte 0 — Leia antes de instalar qualquer coisa

### 0.1 O que mudou no vibecode

O termo foi cunhado por Andrej Karpathy em fevereiro de 2025 e a definição original era deliberadamente informal: descrever o que você quer, aceitar o que a IA gera e não ler o código. Isso funciona para protótipos descartáveis. Para qualquer coisa que vá para produção, o mercado consolidou uma segunda prática — **desenvolvimento assistido por IA com disciplina de engenharia**.

Os números de 2026 explicam por quê. Análises de times de engenharia mostram que a adoção de ferramentas de IA para código aumenta a dívida técnica entre 30% e 41%, com **duplicação de código subindo 48%** e atividade de refatoração caindo 60%. As falhas se concentram em quatro padrões:

1. Tratamento de erro ausente
2. Lógica duplicada
3. Funções que resolvem quatro assuntos não relacionados
4. Código que funciona e ninguém sabe por quê

A causa raiz é simples: **o agente otimiza para fazer o prompt atual funcionar, não para manter uma arquitetura coerente ao longo do tempo.** Todo este manual existe para compensar isso.

### 0.2 As três regras que governam tudo

> **Regra 1 — Zona Vermelha.**
> Autenticação, validação de dados, lógica financeira, permissões e qualquer coisa sob regulação são de **autoria humana**. A IA pode sugerir, você escreve e revisa linha a linha. Não negocie isso.

> **Regra 2 — Risco de regressão.**
> Adicionar uma feature ou mudar um prompt quebra silenciosamente partes que funcionavam. Toda iteração precisa de re-verificação, não só de teste do que mudou. Por isso a cobertura de testes é um **portão de merge**, não uma métrica retrospectiva.

> **Regra 3 — Teto do vibecode.**
> Existe um ponto em que a complexidade do projeto ultrapassa o que o desenvolvimento assistido por IA sustenta com segurança. Reconhecer isso cedo é a prática, não a falha.

### 0.3 Verificação de sanidade das ferramentas

Antes de qualquer instalação, entenda o que cada uma realmente faz e onde ela **não** ajuda:

| Ferramenta | Faz | **Não** faz / ressalva |
|---|---|---|
| **Superpowers** | Impõe brainstorm → spec → plano → TDD → review | É opinativo. Se você discorda de test-first, vai brigar com a própria skill o dia inteiro |
| **Ponytail** | Reduz código gerado (~54% em média nos benchmarks do autor) e força reuso antes de criar | Governa **o que** se constrói, não o design da UI. Ganho é quase zero em código que já é mínimo |
| **Graphify** | Grafo consultável do código, evita reler arquivos | **Inútil em repositório vazio.** O valor real aparece a partir de ~500 arquivos. Em projeto pequeno, `grep` sai mais barato |
| **ECC** | Catálogo grande de skills especializadas (frontend, a11y, segurança, QA) | 281 skills. Carregar tudo estoura contexto. Use perfil seletivo |

**Ressalva sobre os benchmarks.** Os números de redução (54% menos código, 71,5× menos tokens) são medições dos próprios autores em cenários específicos. Trate como ordem de grandeza, não como promessa. Há relatos de usuários de Graphify em que o Claude Code sozinho, com `grep`/`ripgrep`, consumiu menos tokens que 3–4 invocações do CLI de query (~2K tokens cada).

---

<a name="parte-1"></a>
## Parte 1 — Instalação (comandos corrigidos)

> ⚠️ **Correções críticas em relação ao documento original.** Três dos quatro comandos de instalação do documento original estão errados ou desatualizados. Use os abaixo.

### 1.1 Pré-requisitos

```bash
node --version     # precisa ser >= 18
python --version   # precisa ser >= 3.10  (só para Graphify)
git --version
claude --version   # Claude Code >= 2.1
```

**Obs:** `node` precisa estar no PATH do **shell não interativo**. Usuários de nvm/Nix: se o Ponytail reclamar em todo prompt, é isso.

### 1.2 Superpowers ✅ (o original estava correto)

```
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

**Alternativa (marketplace oficial da Anthropic):**
```
/plugin install superpowers@claude-plugins-official
```

**Obs:** os dois caminhos instalam o mesmo plugin. **Escolha um.** Verifique com `/help` — devem aparecer `/superpowers:brainstorm`, `/superpowers:write-plan` e `/superpowers:execute-plan`.

**Ressalva:** a skill de brainstorming agora tem um *hard gate* — ela **intercepta tentativas de entrar em plan mode** e redireciona para o brainstorm. Isso é intencional. Se você quer plan mode puro, desative o plugin temporariamente em vez de brigar com ele.

### 1.3 Ponytail ❌ (o original estava errado)

**Original (não funciona):**
```bash
npx skills add https://github.com/dietrichgebert/ponytail --skill ponytail
```

**Correto:**
```
/plugin marketplace add DietrichGebert/ponytail
/plugin install ponytail@ponytail
```

**Obs:** os dois comandos precisam ser enviados como **prompts separados**. Enviar juntos falha.

**Ressalva:** o plugin roda dois hooks de ciclo de vida em Node. Sem `node` no PATH, as skills continuam funcionando, mas a ativação automática fica silenciosa.

**Comandos disponíveis depois de instalado:**
- `/ponytail lite|full|ultra` — intensidade (padrão: `full`)
- `/ponytail-review` — acha o que apagar no seu diff
- `/ponytail-debt` — compila comentários `ponytail:` num ledger de dívida
- `/ponytail-help`
- `"stop ponytail"` / `"normal mode"` — desliga

**Quando usar `ultra`:** só quando o codebase já está inchado e você quer uma passada agressiva. Em greenfield, `full` basta.

### 1.4 Graphify ⚠️ (funciona, mas há um caminho melhor)

**Original:**
```bash
pip install graphifyy && graphify install
```

O nome do pacote está certo — é `graphifyy`, com dois "y". Outros pacotes `graphify*` no PyPI **não são oficiais**. Mas `pip` é o caminho pior.

**Correto:**
```bash
uv tool install graphifyy     # recomendado (ambiente isolado)
# ou: pipx install graphifyy
graphify install              # registra a skill /graphify no Claude Code
```

**Obs — evite `pip install` em Mac/Windows.** A skill resolve o Python em tempo de execução a partir de `graphify-out/.graphify_python`. Se isso apontar para um ambiente diferente de onde o `pip` instalou, você recebe `ModuleNotFoundError: No module named 'graphify'`. `uv tool` e `pipx` isolam e evitam o problema.

**Obs — `graphify: command not found`.** O binário vai para `~/.local/bin`, que muitas vezes não está no PATH em macOS + zsh novo. Rode `uv tool update-shell` (ou `pipx ensurepath`) e abra um terminal novo.

**Obs — PowerShell.** Use `graphify .` sem a barra. A `/` inicial é separador de caminho no PowerShell e quebra o comando.

**Ressalva de custo escondida:** o Graphify escreve `graph.json` e `graphify-out/` dentro do workspace. Se esses caminhos não forem ignorados, **cada escrita invalida o cache de prompt do Claude Code**, forçando reupload completo do contexto na próxima mensagem, a preço de cache-write. Crie agora:

```
# .claudeignore
graph.json
graphify-out/
```

**Ressalva de timing (a mais importante):** o documento original manda rodar `/graphify .` na Fase 1.4, antes de existir código. Isso não produz nada útil. **Mova o Graphify para depois da primeira fatia vertical funcionando** (nossa Fase 5). Em projeto abaixo de ~200 arquivos, considere pular inteiramente.

### 1.5 ECC ❌ (o original estava errado e é o mais perigoso)

**Original (não é o caminho oficial):**
```bash
npx skills add https://github.com/affaan-m/ECC --skill frontend-design-direction
```

**Correto — escolha UM dos dois caminhos:**

```
# Caminho A — plugin nativo (recomendado)
/plugin marketplace add https://github.com/affaan-m/ECC
/plugin install ecc@ecc
```

```bash
# Caminho B — skills via CLI
npx -y skills add affaan-m/ecc --agent claude-code
```

> 🚨 **Não empilhe os dois.** O README do projeto é explícito: os dois caminhos instalam o mesmo escopo `ecc@ecc`. Instalar em ambos gera conflito de hooks e duplicação de skills.

**Obs — canais oficiais.** Instale ECC apenas de: o repositório `github.com/affaan-m/ECC`, os pacotes npm `ecc-universal` e `ecc-agentshield`, o GitHub App, o slug `ecc@ecc` ou o site `ecc.tools`. Re-uploads de terceiros não são mantidos nem revisados e podem conter malware.

**Ressalva — contexto.** O caminho B instala **281 skills** em `.claude/skills/`. O plugin anuncia o catálogo inteiro para o modelo. Isso come contexto antes de você digitar a primeira palavra. Use um **perfil seletivo/manual**, não o completo.

**Ressalva — nomes de skills.** Os nomes citados no documento original (`frontend-design-direction`, `agent-architecture-audit`, `research-ops`, `agent-self-evaluation`, `verification-loop`, `browser-qa`, `AgentShield`) vêm de um catálogo que muda semanalmente. **Antes de escrever prompts que citam uma skill pelo nome, confirme que ela existe:**

```bash
ls .claude/skills/ | grep -i design
```

Se a skill não existir, o Claude vai simplesmente ignorar a menção e improvisar — que é exatamente o comportamento que este manual tenta eliminar.

### 1.6 Checklist de instalação

```
[ ] node >= 18 no PATH (inclusive shell não interativo)
[ ] Claude Code >= 2.1
[ ] Superpowers instalado por UM caminho, /help mostra os 3 comandos
[ ] Ponytail instalado, dois prompts separados, /ponytail-help responde
[ ] Graphify via uv/pipx, .claudeignore criado (adiar o uso)
[ ] ECC por UM caminho, perfil seletivo, skills confirmadas com ls
[ ] Nenhuma ferramenta instalada duas vezes
```

---

<a name="parte-2"></a>
## Parte 2 — Fase 0: Fundação (a fase que faltava)

> Esta fase **não existia** no documento original. É a que mais reduz retrabalho. Sem ela, todas as outras fases estão compensando um problema que não precisava existir.

### 2.1 Por que isso vem primeiro

Um agente sem contexto persistente reinventa o padrão a cada sessão. Foi assim que "duplicação de código sobe 48%" virou estatística. O `CLAUDE.md` é o antídoto: um arquivo curto, na raiz, que o Claude lê em toda sessão e que define **como** o código deste projeto é escrito.

O consenso da comunidade em 2026 é direto: skills genéricas ajudam pouco; **contexto específico do projeto é o que transforma o resultado.** Um "code review" genérico é ok. Um arquivo que conhece as regras de validação e os padrões de URL do *seu* app é outra coisa.

### 2.2 Passo a passo

**0.1 — Criar o projeto**
```bash
npm create vite@latest meu-webapp -- --template react-ts
cd meu-webapp && npm install
```
> **Obs:** o template `react-ts` já vem com TypeScript em modo estrito. Não relaxe o `strict` para "resolver" um erro. O modo estrito é metade da sua rede de proteção contra código gerado.

**0.2 — Git antes de qualquer código**
```bash
git init && git add . && git commit -m "chore: scaffold vite react-ts"
```
> **Obs:** commit inicial limpo é seu ponto de rollback. Todo comando que o agente rodar depois pode ser desfeito contra este ponto.

**0.3 — Dependências de base**
```bash
npm i -D vite-plugin-pwa workbox-window
npm i -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npm i -D eslint-plugin-jsx-a11y vitest-axe
npm i -D jscpd knip
```
> **Ressalva:** `@testing-library/react-hooks` (citado no documento original) está **descontinuado**. No React 18+, use `renderHook` importado de `@testing-library/react`. Instalar o pacote antigo gera um erro de peer dependency que o agente vai tentar "consertar" com `--legacy-peer-deps` — e aí começa o retrabalho.
>
> `jscpd` (detector de copy-paste) e `knip` (detector de código morto e exports não usados) são os dois pacotes que atacam diretamente sua dor de "componentes e códigos repetidos". Voltamos a eles na Fase 6.

**0.4 — Estrutura de pastas decidida agora, não depois**
```bash
mkdir -p src/{components/ui,components/features,hooks,lib,services,types,styles,test}
mkdir -p docs
```

> **Obs:** a fronteira que importa é **`components/ui` (primitivos genéricos, sem regra de negócio) vs `components/features` (composições que sabem do domínio)**. Sem essa separação escrita, o agente cria um `<BotaoSalvarTransacao>` quando já existe um `<Button variant="primary">`. Essa é a origem número um de componente duplicado.

**0.5 — Escrever o CLAUDE.md**

Use o [Anexo A](#anexo-a). Não delegue este arquivo para o agente escrever sozinho — ele vai produzir algo genérico. Escreva as regras, peça para o agente revisar.

```bash
git add . && git commit -m "chore: project constitution (CLAUDE.md) + structure"
```

**0.6 — Variáveis de ambiente e segredos**
```bash
printf 'VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=\n' > .env.example
printf '.env\n.env.local\ngraph.json\ngraphify-out/\n' >> .gitignore
cp .env.example .env.local
```

> 🚨 **Ressalva de segurança que o documento original não faz.** Tudo com prefixo `VITE_` é **embutido no bundle e visível para qualquer usuário**. A `anon key` do Supabase é feita para isso e é segura *desde que* o Row Level Security esteja ativo. A `SUPABASE_SERVICE_ROLE_KEY` **nunca** entra num projeto Vite, em nenhuma circunstância, nem com prefixo `VITE_`, nem "só para testar". Ela ignora RLS por design. Se o agente sugerir isso, é um bug de segurança crítico, não uma otimização.

**0.7 — Scripts de qualidade no package.json**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "lint": "eslint . --max-warnings=0",
    "test": "vitest run",
    "test:cov": "vitest run --coverage",
    "dup": "jscpd src --min-lines 8 --threshold 1",
    "dead": "knip",
    "verify": "npm run lint && npm run build && npm run test:cov && npm run dup && npm run dead"
  }
}
```
> **Obs:** `npm run verify` é o comando único que você e o agente vão rodar antes de qualquer commit relevante. Um comando, não seis. O agente esquece o sexto.

### 2.3 Saída da Fase 0

```
✅ Repositório com commit inicial
✅ CLAUDE.md escrito por você
✅ Estrutura de pastas com fronteira ui/features
✅ .env.example + .gitignore + .claudeignore
✅ npm run verify funcionando (mesmo que sem testes ainda)
```

---

<a name="parte-3"></a>
## Parte 3 — Fase 1: Descoberta e especificação

### 3.1 Brainstorm

```
/superpowers:brainstorm
```

O agente refina a ideia com perguntas socráticas e apresenta o design em seções para validação.

> **Obs:** existe um *hard gate* — nenhuma skill de implementação, nenhum código e nenhum scaffolding até o design ser apresentado **e aprovado por você**. Se o agente tentar pular para código, ele está com o plugin mal instalado.
>
> **Ressalva:** o gate escala as seções de design pela complexidade **da seção**, não do projeto. Um projeto simples com uma parte complicada ainda vai receber tratamento detalhado nessa parte. Isso é correto, não é excesso.

### 3.2 Pesquisa de referência

**Prompt (UX + acessibilidade):**
```
Pesquise as melhores práticas de UX para um app de [tipo].
Foque em: padrões de navegação mobile, WCAG 2.2 AA e performance em PWA.
Separe explicitamente FATOS (com fonte e data) de INFERÊNCIAS suas.
Não proponha implementação ainda.
```

**Prompt (concorrência):**
```
Analise os 3 principais concorrentes de [nicho] no Brasil.
Liste as 5 funcionalidades mais usadas e as 3 maiores reclamações dos usuários.
Quero isso para cortar escopo do MVP, não para expandir.
```

> **Obs:** a frase "para cortar escopo, não para expandir" muda materialmente a saída. Sem ela, você recebe uma lista de 20 features e volta ao ponto de partida.
>
> **Ressalva:** o agente vai citar fontes. **Abra pelo menos duas.** Pesquisa de mercado é a área onde alucinação passa despercebida porque a saída soa plausível.

### 3.3 Escrever o specs.md

```
Com base no brainstorm e na pesquisa, crie docs/specs.md com:

1. PERSONA — quem usa, em que contexto, em que dispositivo
2. MVP — exatamente 5 funcionalidades. Se der 6, corte uma e justifique
3. CRITÉRIOS DE ACEITE — por funcionalidade, no formato:
   Dado [contexto], quando [ação], então [resultado observável]
4. FORA DE ESCOPO — o que explicitamente NÃO será feito na v1
5. NÃO-FUNCIONAIS:
   - Performance: LCP < 2.5s em 4G, bundle inicial < 200KB gzip
   - Offline: quais telas funcionam sem rede
   - Acessibilidade: WCAG 2.2 AA
   - Responsividade: breakpoints 375 / 768 / 1440
6. ZONA VERMELHA — quais partes são de autoria humana

Markdown limpo. Sem código.
```

> **Obs — a seção 4 (Fora de Escopo) é a que mais economiza tempo.** Ela dá ao agente permissão explícita para dizer "isso não faz parte" em vez de construir por precaução. É o combustível do Ponytail.
>
> **Obs — critérios de aceite observáveis.** "O formulário deve ser fácil de usar" não é testável. "Dado um valor 0, quando clico em Enviar, então o botão fica desabilitado e aparece a mensagem X" vira teste direto.

### 3.4 Plano de execução

```
/superpowers:write-plan
```

Gera `plan.md` com tarefas de 2–5 minutos, cada uma com caminhos de arquivo exatos e passos de verificação.

> **Ressalva:** revise o `plan.md` **inteiro** antes de executar. É mais barato corrigir uma linha do plano agora do que 200 linhas de código depois. Procure especificamente por: tarefas que criam componentes cujo nome já existe, tarefas sem passo de verificação, e tarefas que tocam em código da Zona Vermelha.

### 3.5 O que NÃO fazer aqui

❌ **Não rode `/graphify .` nesta fase.** Não há código. O grafo sai vazio e você gastou tokens.
❌ **Não rode `verification-loop`, `tdd-workflow` ou `AgentShield`.** Essas skills precisam de arquivos para analisar. Rodar antes gera relatório vazio ou, pior, alucinado.

---

<a name="parte-4"></a>
## Parte 4 — Fase 2: Design system e arquitetura

> Esta fase é o coração da sua exigência de "design com usabilidade, responsividade e sem componentes repetidos". O documento original tinha uma versão superficial disso.

### 4.1 Tokens antes de componentes

O princípio é **design token como fonte única da verdade**. Em vez de `#3B82F6` espalhado por 40 arquivos, você define `--color-primary-600` uma vez e referencia em todo lugar. Quando a marca muda, você muda um token.

**Prompt:**
```
Crie src/styles/tokens.css com custom properties CSS para:
- Cores: escala semântica (primary, surface, text, border, danger, success)
  em light e dark, com contraste mínimo 4.5:1 para texto normal
- Espaçamento: escala de 4px (space-1 a space-12)
- Tipografia: escala modular, line-height, pesos
- Raio, sombras, z-index, durações de transição
- Breakpoints como custom media queries: 375 / 768 / 1440

Depois mapeie os tokens no tailwind.config.ts via theme.extend,
lendo das CSS variables — NÃO duplique os valores nos dois arquivos.

Regra: nenhum componente pode usar valor hardcoded de cor, espaço ou fonte.
```

> 🚨 **Ressalva — a armadilha da duplicação de tokens.** O erro mais comum é o agente escrever os valores em `tokens.css` **e** repetir os mesmos hex no `tailwind.config`. Aí você tem duas fontes da verdade e a divergência aparece três semanas depois. O `tailwind.config` deve **ler** as variáveis (`primary: 'var(--color-primary-600)'`), não copiá-las.
>
> **Obs:** valores hardcoded criam dívida de manutenção e quebram troca de tema. Essa regra vai para o `CLAUDE.md` e é verificável por lint.

### 4.2 Inventário de componentes (o passo antimultiplicação)

**Prompt:**
```
Com base no docs/specs.md, crie docs/components.md listando:

TABELA 1 — PRIMITIVOS (src/components/ui/)
| Componente | Variantes | Estados | Props principais |
Só o que aparece em 2+ telas. Máximo 12 primitivos.

TABELA 2 — FEATURES (src/components/features/)
| Componente | Compõe quais primitivos | Tela onde vive |

REGRA DE OURO a incluir no topo do arquivo:
"Antes de criar qualquer componente, consulte esta tabela.
Se algo parecido existe, adicione uma VARIANTE, não um componente novo.
Componente novo exige justificativa escrita nesta tabela."

Não escreva código ainda.
```

> **Obs — variantes em vez de componentes separados.** `<Button variant="danger" size="sm">` em vez de `<DangerButtonSmall>`. Essa única regra elimina a maior parte da duplicação de UI.
>
> **Obs — o teto de 12 primitivos** força priorização. Sem teto, o agente lista 40 e constrói 40, dos quais 25 são usados uma vez.
>
> **Ressalva:** este arquivo só funciona se for **relido**. Coloque no `CLAUDE.md`: *"antes de criar componente, leia docs/components.md"*.

### 4.3 Direção visual

```
Use a skill de direção de design de frontend para definir a direção visual.
Público-alvo: [descreva]. Referências: [2-3 produtos].
Entregue: hierarquia visual, par tipográfico, aplicação da paleta,
grid e regras de motion (duração, easing, o que anima e o que não anima).

Restrição: tudo expresso em termos dos tokens de src/styles/tokens.css.
Se precisar de um token que não existe, proponha adicioná-lo — não hardcode.
```

> **Ressalva:** confirme antes que a skill existe no seu catálogo (`ls .claude/skills/`). O nome `frontend-design-direction` citado no documento original pode ter mudado. Se não existir, o prompt acima funciona sozinho — só remova a primeira frase.

### 4.4 Contrato de responsividade

**Prompt:**
```
Crie docs/responsive.md definindo, para cada tela do MVP:
- O que muda em 375px (mobile-first é o padrão)
- O que muda em 768px
- O que muda em 1440px
- Áreas de toque: mínimo 44x44px em mobile
- Comportamento de navegação em cada breakpoint
- O que acontece com tabelas e listas longas em mobile

Regra: mobile é o layout base. Desktop é o override, não o contrário.
```

> **Obs:** sem esse arquivo, "responsivo" vira "adicionei `md:flex` em alguns lugares". Com ele, responsividade é testável.

### 4.5 Auditoria de arquitetura

**Prompt:**
```
Com base em docs/specs.md, docs/components.md e plan.md, audite a arquitetura
ANTES de implementar. Verifique:
- O modelo de dados suporta todos os 5 critérios de aceite?
- Onde está a fronteira entre camada de dados e camada de UI?
- Gargalos em listas grandes (virtualização necessária?)
- Estado global: o que realmente precisa estar lá?
- Loops de retry ocultos em chamadas de API
- Qual parte é Zona Vermelha e não deve ser gerada

Relatório com severidade (crítico/alto/médio) e correção código-primeiro.
Não implemente nada.
```

### 4.6 Modelo de dados e RLS (se usar Supabase)

> 🚨 **O documento original menciona Supabase mas nunca menciona RLS.** Essa é a falha de segurança mais provável do fluxo inteiro.

```
Projete o schema no Supabase para o MVP. Para CADA tabela, entregue:
1. DDL
2. Política de Row Level Security explícita — nenhuma tabela sem RLS
3. Índices para as queries que o app realmente faz
4. O teste que prova que o usuário A não lê os dados do usuário B

Zona Vermelha: eu reviso todas as políticas antes de aplicar.
Não aplique migration sem minha aprovação explícita.
```

> **Ressalva:** RLS desativado numa tabela com a anon key exposta no bundle significa que **qualquer pessoa lê o banco inteiro**. Não é hipotético — é o vazamento padrão de app vibecoded com Supabase.

---

<a name="parte-5"></a>
## Parte 5 — Fase 3: Esqueleto e primeira fatia vertical

> Esta fase também não existia no original. Ela evita o pior padrão do vibecode: construir 20 componentes bonitos que nunca se conectam a nada.

### 5.1 A fatia vertical

Escolha **uma** funcionalidade do MVP — a mais representativa — e construa ela ponta a ponta: UI → hook → serviço → banco → volta. Só depois construa as outras quatro.

**Prompt:**
```
Vamos construir UMA fatia vertical completa: [funcionalidade X].
Ponta a ponta: componente → hook → serviço → Supabase → de volta à UI.

Nesta fatia, estabeleça os padrões que TODAS as outras vão seguir:
- Como se busca dados (qual biblioteca, qual formato de erro)
- Como se trata loading, erro, vazio e sucesso — os quatro estados, sempre
- Como se nomeia arquivo, hook, tipo e teste
- Como se valida entrada

Ao terminar, documente esses padrões em docs/patterns.md.
As próximas features vão referenciar esse arquivo em vez de reinventar.
```

> **Obs — os quatro estados.** Loading, erro, vazio e sucesso. Código gerado por IA quase sempre entrega só o estado de sucesso. Estado vazio ausente é a "falha boba" mais frequente em app vibecoded.
>
> **Obs:** `docs/patterns.md` escrito a partir de código real vale dez vezes mais que um guia escrito antes. Ele descreve o que existe, não o que se imaginou.

### 5.2 Error boundary e fallback global

```
Adicione:
1. Um ErrorBoundary no topo da árvore, com fallback que não perde o estado do usuário
2. Uma rota 404
3. Um fallback offline (a shell do app)

Mínimo necessário. Não crie um sistema de logging ainda.
```

### 5.3 Agora sim, o Graphify

Com código real no repositório, o grafo passa a ter valor.

```bash
graphify install --project        # instala a skill no projeto
graphify claude install           # CLAUDE.md + hook PreToolUse
graphify hook install             # rebuild automático em commit e troca de branch
```
```
/graphify .
```

> **Obs — `graphify hook install`** faz o grafo se manter atualizado sozinho a cada `git commit` e a cada `git checkout` de branch, sem custo de API (extração de código é local, via tree-sitter). Depois de `git pull` ou `git merge`, rode `graphify update .` manualmente — esse é o único passo que não é automático. Dá para automatizar:
> ```bash
> git config --global alias.gpull '!git pull && graphify update .'
> ```
>
> **Obs — modo estrito.** `graphify install --project --strict` **bloqueia** a primeira leitura de arquivo bruto da sessão e redireciona para o grafo, depois volta ao modo suave. Sem `--strict`, é só um empurrãozinho que o agente frequentemente ignora.
>
> **Ressalva:** confirme que `graph.json` e `graphify-out/` estão no `.claudeignore` (Fase 0.6). Sem isso você paga cache-write a cada rebuild.

### 5.4 Query de antiduplicação

A partir daqui, **antes de criar qualquer coisa**:

```
/graphify query "já existe uma função que calcula/valida/formata [X]?"
/graphify query "quais componentes já renderizam uma lista com paginação?"
/graphify path "ComponenteA" "ServicoB"
```

> **Obs:** toda aresta do grafo vem marcada como `EXTRACTED` (explícito no código) ou `INFERRED` (deduzido). Se a resposta que importa for `INFERRED`, confirme lendo o arquivo. O grafo é mapa, não território.

---

<a name="parte-6"></a>
## Parte 6 — Fase 4: Ciclo TDD

### 6.1 A ordem correta

```
RED  → escreve o teste, ele FALHA
GREEN → código mínimo para passar
REFACTOR → melhora sem quebrar
```

A skill `test-driven-development` do Superpowers ativa sozinha durante implementação e impõe o ciclo.

> ⚠️ **Ressalva importante sobre o documento original.** Ele coloca TDD manual na Fase 3 **e** `/superpowers:execute-plan` na Fase 4 — mas o `execute-plan` já roda TDD internamente. Fazer os dois duplica trabalho e confunde o agente. **Escolha:** TDD manual para as partes de Zona Vermelha e para a fatia vertical; `execute-plan` para o resto.

### 6.2 Prompts por tipo de alvo

**Componente de formulário:**
```
Crie o primeiro teste em src/components/features/__tests__/Formulario.test.tsx.
Verifica: o formulário NÃO permite enviar com valor zero ou negativo.
React Testing Library, consulta por role/label acessível — NUNCA por classe CSS.
O teste deve FALHAR agora (RED). Não implemente ainda.
```
> **Obs:** consultar por `getByRole`/`getByLabelText` em vez de `querySelector('.btn')` faz o teste virar, de graça, um teste de acessibilidade. Teste que passa por role prova que o leitor de tela encontra o elemento.

**Hook de dados:**
```
Teste para o hook useTransacoes cobrindo:
1) carregamento inicial  2) adicionar item
3) remover item e recalcular total  4) erro de rede  5) lista vazia
Use renderHook importado de '@testing-library/react'.
Deve falhar (RED).
```
> 🚨 **Correção:** o documento original manda usar `@testing-library/react-hooks`. Esse pacote está **descontinuado** desde o React 18. `renderHook` mora em `@testing-library/react`. Usar o antigo gera conflito de peer deps e uma sessão inteira de "conserto".

**Service worker / offline:**
```
Teste que verifica se o service worker cacheia a shell quando o app fica offline.
Mock do workbox. Deve falhar (RED).
```
> **Ressalva:** testar service worker em jsdom é notoriamente frágil. Se o teste custar mais que o valor, teste o comportamento offline manualmente no DevTools e cubra por E2E depois. Isso é uma decisão legítima de Ponytail, não preguiça.

### 6.3 O filtro Ponytail antes de cada teste

```
Antes de escrever este teste, responda em uma linha cada:
1. Esta funcionalidade precisa existir? (YAGNI)
2. Já existe algo neste codebase que faz isso? (consulte docs/components.md)
3. A plataforma nativa já resolve? (<input type="date">, CSS, constraint no banco)
4. Uma dependência já instalada resolve?
```

> **Obs:** o Ponytail é "preguiçoso quanto à solução, nunca quanto à leitura". Ele **não** corta validação em fronteira de confiança, tratamento de perda de dados, segurança ou acessibilidade. Se ele cortou uma dessas, não foi o Ponytail — foi alucinação.
>
> **Obs:** lógica não trivial (um branch, um loop, um parser, um caminho de dinheiro ou segurança) deixa **uma** verificação executável. Um-liner trivial não precisa de teste — YAGNI vale para testes também.

### 6.4 Cobertura como portão

```json
"test:cov": "vitest run --coverage --coverage.thresholds.lines=80"
```

> **Obs:** cobertura é **portão de merge**, não métrica de relatório. Nenhum PR que toca caminho crítico passa sem cobertura comportamental. Times que evitaram o "acerto de contas dos 90 dias" foram os que trataram infraestrutura de teste como pré-requisito da adoção de IA, não como consequência.
>
> **Ressalva:** 80% de cobertura com asserções fracas (`expect(x).toBeDefined()`) é pior que 50% com asserções reais, porque dá falsa confiança. Peça periodicamente: *"revise meus testes e aponte os que passariam mesmo se a lógica estivesse errada"*.

---

<a name="parte-7"></a>
## Parte 7 — Fase 5: Implementação em lote

### 7.1 Executar o plano

```
/superpowers:execute-plan
```

Despacha subagentes por tarefa, com revisão em duas etapas: conformidade com a spec, depois qualidade.

> **Obs — contexto.** Rode `/clear` entre features grandes. Contexto poluído é a causa de o agente "esquecer" o padrão que ele mesmo estabeleceu duas features atrás.
>
> **Obs — custo.** Padrão consolidado em 2026: **plan mode com o modelo mais forte, execução com o modelo mais rápido**. Você paga qualidade de planejamento sem pagar preço de topo em cada token de implementação. O Graphify reduz o custo de orientação; o plan mode reduz o custo de raciocínio — os dois se somam.

### 7.2 Prompt de implementação com guarda

```
Implemente [tarefa N do plan.md].

ANTES de escrever qualquer arquivo:
1. /graphify query "já existe algo que faz [X]?"
2. Leia docs/components.md e docs/patterns.md
3. Se for criar componente novo, justifique em uma linha por que uma
   variante de um primitivo existente não resolve

DURANTE:
- Só tokens de src/styles/tokens.css. Zero valor hardcoded
- Os quatro estados: loading, erro, vazio, sucesso
- Mobile-first conforme docs/responsive.md
- Código mínimo para o teste passar (GREEN)

DEPOIS:
- Refatore extraindo o que repetiu (IMPROVE)
- npm run verify
- Me mostre o diff antes de commitar
```

> **Obs — "me mostre o diff antes de commitar"** é a linha mais valiosa do prompt. Revisar diff é a única forma de manter fluência técnica sobre código que você não escreveu. Times que aguentam a manutenção em 2027 são os que continuaram lendo diffs.

### 7.3 Ritmo de commits

```bash
git add -p                        # revisão granular
git commit -m "feat(escopo): descrição"
```

> **Obs:** um commit por tarefa do plano. Commit gigante gerado por IA é impossível de bisectar quando algo quebra. `git add -p` força você a olhar cada hunk.

### 7.4 Sinais de que é hora de parar

Pare e reavalie se qualquer um destes aparecer:

- 🚩 O agente "conserta" um teste alterando a asserção em vez do código
- 🚩 Aparece um segundo componente com nome parecido com um existente
- 🚩 O agente adiciona dependência para algo que a plataforma resolve
- 🚩 Uma função passa de ~50 linhas ou cuida de mais de um assunto
- 🚩 Você não conseguiria explicar o que o último diff faz
- 🚩 Você entrou no *loop de depuração*: cada correção cria um bug novo

> **Obs sobre o loop de depuração:** a saída não é mais um prompt. É `git reset --hard` para o último commit bom e uma abordagem diferente. Iterar sobre código gerado sem reset aumenta vulnerabilidades e dívida técnica de forma cumulativa.

---

<a name="parte-8"></a>
## Parte 8 — Fase 6: Antiduplicação e revisão

> Esta é a fase que ataca diretamente sua exigência de "sem componentes repetidos e códigos repetidos". Duplicação sobe 48% com IA — aqui é onde você derruba de volta.

### 8.1 Detecção automática (roda em segundos, custa zero token)

```bash
npm run dup     # jscpd — blocos copiados
npm run dead    # knip — arquivos, exports e deps não usados
```

> **Obs:** rode **antes** de pedir revisão ao agente. Ferramenta determinística encontra duplicação literal de graça; o agente encontra duplicação *conceitual*. Usar o agente para o trabalho da ferramenta é caro e menos confiável.

### 8.2 Revisão conceitual

```
/ponytail-review
```
Revisa o diff procurando over-engineering e sugere simplificações.

**Prompt complementar:**
```
Rode uma auditoria de duplicação CONCEITUAL em src/ (o jscpd já pegou a literal).
Procure:
- Componentes diferentes que renderizam a mesma estrutura visual
- Hooks diferentes com a mesma forma de fetch/estado
- Funções de formatação, validação ou cálculo repetidas com nomes diferentes
- Tipos TypeScript equivalentes declarados em arquivos distintos
- Valores hardcoded que deveriam ser tokens

Para cada achado: os arquivos, a abstração proposta e o RISCO de unificar.
Não refatore ainda — quero aprovar caso a caso.
```

> 🚨 **Ressalva — abstração prematura é o erro oposto.** Duas coisas parecidas hoje podem divergir amanhã. A regra prática é a **regra dos três**: unifique na terceira ocorrência, não na segunda. Peça o risco junto com a proposta e recuse unificações que acoplam features não relacionadas.

### 8.3 Ledger de dívida

```
/ponytail-debt
```
Compila os comentários `ponytail:` num ledger.

> **Obs:** dívida registrada é dívida gerenciável. Dívida invisível é o que vira o acerto de contas dos 90 dias — você abre uma função para corrigir um bug pequeno e encontra 300 linhas cuidando de quatro assuntos, sem comentário, sem contexto de commit, sem ticket.

### 8.4 Reauditoria de arquitetura

```
Reaudite a arquitetura DEPOIS da implementação:
- Regressão de wrapper na camada de integração
- Chamadas diretas ao banco fora da camada de serviço
- Estado global que cresceu além do necessário
- Divergências entre o código e docs/specs.md
- Componentes criados que não constam em docs/components.md

Para cada divergência: código errado ou documento desatualizado? Diga qual.
```

> **Obs:** a última pergunta importa. Às vezes o código está certo e o documento envelheceu. Atualizar o documento também é trabalho — e ele é o que o agente lê na próxima sessão.

---

<a name="parte-9"></a>
## Parte 9 — Fase 7: Acessibilidade, responsividade e performance

### 9.1 Acessibilidade automática primeiro

```bash
npx eslint . --max-warnings=0     # com eslint-plugin-jsx-a11y ativo
```

**Teste automatizado com axe:**
```
Adicione um teste em src/test/a11y.test.tsx que roda vitest-axe
em cada tela principal e falha se houver violação de WCAG 2.2 AA.
```

### 9.2 Auditoria manual

```
Audite a UI inteira para WCAG 2.2 AA:
- Contraste: 4.5:1 texto normal, 3:1 texto grande e componentes de UI
- Navegação completa por teclado: Tab, Shift+Tab, Enter, Esc, setas
- Foco visível e ordem de foco lógica em todos os elementos interativos
- ARIA labels em todo elemento interativo que é só ícone
- Gestão de foco em modais: trap ao abrir, retorno ao fechar
- Alvos de toque >= 44x44px em mobile
- Estrutura de headings (um h1, sem pular níveis)
- Formulários: label associado, erro anunciado, erro ligado ao campo

Formato: | Arquivo:linha | Violação | Critério WCAG | Correção |
```

> **Obs — ícones sem label são a violação campeã** em código gerado. Leitor de tela não interpreta ícone visual.
>
> **Obs — importe ícones individualmente** (`import { Check } from 'lucide-react'`), nunca por namespace. Import de namespace derruba o tree-shaking e adiciona 500KB–2MB de bundle por biblioteca de ícones.
>
> **Ressalva:** a ferramenta automatizada pega mais ou menos 30% das violações. Contraste, ARIA e ordem de foco ela pega; "isso faz sentido para quem usa leitor de tela" ela não pega. Teste com teclado de verdade pelo menos uma vez.

### 9.3 Responsividade real

```
Verifique cada tela contra docs/responsive.md em 375, 768 e 1440.
Reporte: overflow horizontal, texto cortado, alvos de toque pequenos,
tabela ilegível em mobile, imagem sem dimensão causando layout shift.
```

> **Obs:** overflow horizontal em mobile é a falha boba número um. Normalmente vem de largura fixa em px ou de uma tabela sem container com scroll.
> **Obs:** teste também em zoom de 200% — é requisito WCAG e quase ninguém testa.

### 9.4 Performance

```bash
npm run build
npx vite-bundle-visualizer
```

```
Analise o bundle de produção. Para cada chunk acima de 100KB:
que dependência causa e existe alternativa nativa ou mais leve?
Aplique code splitting por rota. Meta: bundle inicial < 200KB gzip.
```

> **Obs:** IA prioriza funcionalidade sobre eficiência. O código passa nos testes iniciais e cede sob carga de produção. Soluções geradas costumam faltar modularidade e otimização em escala.
> **Obs:** teste também em modo dark. Troca de tema afeta contraste e legibilidade, e é onde token mal aplicado aparece.

---

<a name="parte-10"></a>
## Parte 10 — Fase 8: Segurança

### 10.1 Varredura

```
Rode o security-scan em src/ e nos arquivos de configuração. Procure:
- Chaves de API hardcoded (SUPABASE_SERVICE_ROLE_KEY é crítico)
- Segredo em variável com prefixo VITE_ (vai para o bundle público)
- SQL injection nas queries
- XSS: uso de dangerouslySetInnerHTML
- Validação de entrada apenas no cliente
- Permissões excessivas em hooks do Git
- Risco de prompt injection em mensagens de erro exibidas

Relatório com severidade e correção.
```

```bash
npm audit --audit-level=high
```

### 10.2 Checklist manual da Zona Vermelha

Estes itens **você** verifica lendo o código, não perguntando ao agente:

```
[ ] RLS ativo em TODAS as tabelas do Supabase, sem exceção
[ ] Política de RLS testada: usuário A não consegue ler dados de B
[ ] SERVICE_ROLE_KEY não aparece em nenhum lugar do frontend
[ ] .env não está no git (git log --all -- .env deve vir vazio)
[ ] Validação de entrada existe no SERVIDOR, não só no cliente
[ ] Fluxo de auth revisado linha a linha por um humano
[ ] Rate limiting em endpoints públicos
[ ] Senha nunca em texto plano, em lugar nenhum, em log nenhum
```

> 🚨 **Ressalva.** Em um experimento de 30 dias documentado no início de 2026, a velocidade inicial quintuplicou — e a IA introduziu falhas críticas: senha em texto plano e chave de API exposta. A varredura automática ajuda; ela não substitui leitura humana do caminho de autenticação.
>
> **Obs:** vibecode não é só risco de código. A configuração vaza também. `.claude/`, `.env.local`, arquivos de backup do editor e artefatos de build entram no `.gitignore` antes do primeiro push.

---

<a name="parte-11"></a>
## Parte 11 — Fase 9: Verificação e CI

### 11.1 Loop local

```bash
npm run verify
```
```
Rode o loop de verificação completo e me dê um relatório com APROVADOS e BLOQUEANTES:
1. Type-check (tsc --noEmit)     2. Lint (zero warnings)
3. Testes com cobertura >= 80%   4. Build de produção
5. jscpd (duplicação)            6. knip (código morto)
7. npm audit --audit-level=high  8. Revisão do git diff atual

Não declare pronto se houver qualquer bloqueante.
```

> **Obs:** a skill `verification-before-completion` do Superpowers ativa sozinha antes do agente declarar conclusão. Deixe ativa.

### 11.2 CI como portão real

> O documento original não tinha CI. Sem CI, todas as verificações acima dependem de alguém lembrar.

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm run test:cov
      - run: npm run dup
      - run: npm audit --audit-level=high
```

> **Obs:** proteja a branch `main` exigindo que o CI passe. É o que transforma "cobertura de 80%" de intenção em regra.
> **Obs:** ative Dependabot. Dependência desatualizada é dívida que se acumula sozinha.

### 11.3 Checklist PWA

```
[ ] manifest.json válido: name, short_name, start_url, display, theme_color
[ ] Ícones 192x192 e 512x512, mais uma variante maskable
[ ] Service worker registrado e atualizando
[ ] Estratégia de cache definida por tipo de recurso
    (shell: cache-first · API: network-first · imagens: stale-while-revalidate)
[ ] Fallback offline com mensagem clara — não uma tela em branco
[ ] UX de atualização: usuário avisado quando há versão nova
[ ] beforeinstallprompt tratado, prompt de instalação não intrusivo
[ ] Lighthouse PWA >= 90
```

> 🚨 **Ressalva — `registerType: 'autoUpdate'`** (usado no exemplo do documento original) atualiza o service worker em background, mas **a aba aberta continua na versão antiga até recarregar**. Sem aviso ao usuário, ele fica preso numa versão velha por dias e reporta bugs já corrigidos. Ou você trata o evento de atualização com um toast "nova versão disponível, recarregar", ou aceita conscientemente o atraso.
>
> **Ressalva — cache-first em rota de API** serve dado velho indefinidamente. Cache-first é para a shell (JS, CSS, fontes). Dado dinâmico é network-first com fallback.

---

<a name="parte-12"></a>
## Parte 12 — Fase 10: Deploy

### 12.1 Sequência

```bash
npm run verify                     # tem que estar 100% verde
npm run build
git add . && git commit -m "feat: MVP" && git push
npx vercel --prod                  # ou: npx netlify deploy --prod
```

### 12.2 Variáveis de ambiente

Configure na plataforma (Vercel/Netlify), **não** em arquivo commitado:
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

> **Obs:** faça um deploy de preview antes do `--prod`. Vercel e Netlify criam preview por PR automaticamente — use.
> **Ressalva:** variável de ambiente no Vite é resolvida em **build time**, não em runtime. Mudou a variável? Precisa rebuildar. Esquecer isso gera meia hora de confusão.

### 12.3 QA em produção

```
Rode QA de navegador na URL [URL]. Teste:
1. Navegação entre todas as páginas
2. Preenchimento e envio de todos os formulários (inclusive caminhos de erro)
3. Responsividade: 375, 768, 1440
4. Lighthouse: performance, a11y, best practices, SEO, PWA
5. Offline: desligar rede e recarregar
6. Instalação como PWA
7. Modo dark
8. Voltar do navegador em cada fluxo

Falhas com screenshot e passos para reproduzir.
```

> **Ressalva:** o botão "voltar" do navegador é o teste que ninguém faz e que quebra em quase todo SPA gerado por IA — modal que não fecha, estado que não restaura, scroll que não volta.

### 12.4 Plano de rollback

```
[ ] Sei qual comando reverte o deploy (vercel rollback / netlify)
[ ] Última migration do banco tem script de reversão escrito e testado
[ ] Sei qual commit é o último estado bom conhecido
[ ] Monitoramento de erro configurado ANTES do deploy, não depois
```

> **Obs:** migration de banco é a coisa mais difícil de reverter. Escreva o `down` junto com o `up`, sempre, mesmo quando parecer desnecessário.

---

<a name="parte-13"></a>
## Parte 13 — Fase 11: Pós-deploy e manutenção

### 13.1 Autoavaliação da iteração

```
Avalie o trabalho deste ciclo em:
1. Precisão  2. Completude  3. Clareza  4. Acionabilidade  5. Concisão
Liste 3 lições aprendidas e 2 melhorias para a próxima iteração.
Proponha atualizações concretas ao CLAUDE.md com base nos erros deste ciclo.
```

> **Obs — este é o passo que faz o sistema aprender.** Cada erro recorrente vira uma linha no `CLAUDE.md` e não se repete. É a diferença entre um fluxo que melhora e um que só se repete mais rápido.

### 13.2 Manutenção do grafo

```bash
/graphify ./src --update      # re-extrai só o que mudou
graphify update .             # depois de todo git pull/merge
graphify hook status          # confirma que os hooks estão ativos
```

> **Ressalva:** se um refactor apagou arquivos, os nós antigos ficam no grafo. Use `--force` para sobrescrever mesmo quando o rebuild tiver menos nós.

### 13.3 Fechar a branch

```
finishing-a-development-branch
```
Decide entre merge direto ou PR.

### 13.4 Ritual permanente

| Frequência | Ação |
|---|---|
| Todo commit | `git add -p` — leia o diff |
| Toda feature | `npm run verify` antes de abrir PR |
| Toda semana | `npm run dup` + `npm run dead` |
| Todo mês | `npm audit`, atualizar deps, revisar `CLAUDE.md` |
| Todo trimestre | Reauditoria de arquitetura, revisar ledger de dívida |

> **Obs final desta parte.** A capacidade de ler código gerado por IA sem a ajuda da IA — identificar a dívida e corrigir sistematicamente — é a habilidade que sustenta esses sistemas a médio prazo. Não terceirize 100% da leitura.

---

<a name="anexo-a"></a>
## Anexo A — CLAUDE.md pronto para copiar

Salve na raiz do projeto. Ajuste os `[colchetes]`.

```markdown
# [Nome do Projeto]

## O que é
[Uma frase.] Público: [quem].

## Stack
React 18 + TypeScript (strict) + Vite + Tailwind + Supabase + Vitest + RTL

## Documentos que você DEVE ler antes de codar
- docs/specs.md — o que construir e o que NÃO construir
- docs/components.md — inventário de componentes (consultar ANTES de criar um)
- docs/patterns.md — padrões extraídos do código real
- docs/responsive.md — contrato de breakpoints

## Estrutura
src/components/ui/        primitivos genéricos, sem regra de negócio
src/components/features/  composições que conhecem o domínio
src/hooks/                lógica de estado reutilizável
src/services/             acesso a dados — ÚNICO lugar que fala com Supabase
src/lib/                  utilitários puros
src/types/                tipos compartilhados
src/styles/tokens.css     fonte única de cor, espaço, tipografia

## Regras inegociáveis

### Antes de criar qualquer coisa
1. Consulte docs/components.md
2. Se existe algo parecido: adicione VARIANTE, não componente novo
3. Componente novo exige justificativa escrita em docs/components.md
4. Verifique se a plataforma nativa resolve (<input type="date">, CSS, constraint)

### Estilo
- Zero valor hardcoded de cor, espaço, raio ou fonte. Só tokens
- Mobile-first. Desktop é override
- Alvo de toque mínimo 44x44px
- Ícones importados individualmente, nunca por namespace

### Estados
Todo componente que busca dados trata OS QUATRO:
loading · erro · vazio · sucesso

### Testes
- TDD: teste falha primeiro
- Consulta por role/label acessível. NUNCA por classe CSS
- Cobertura mínima 80% em caminho crítico
- renderHook vem de '@testing-library/react' (o pacote react-hooks está morto)

### Acessibilidade
WCAG 2.2 AA. Contraste 4.5:1. Todo elemento interativo é alcançável por teclado
e tem foco visível. Ícone sem texto tem aria-label.

### ZONA VERMELHA — autoria humana, você NÃO gera
- Autenticação e autorização
- Políticas de Row Level Security
- Validação de entrada no servidor
- Qualquer cálculo financeiro
- Migrations de banco (proponha, não aplique)

### Segurança
- Segredo NUNCA em variável VITE_ (vai para o bundle público)
- SERVICE_ROLE_KEY nunca toca o frontend
- Toda tabela do Supabase tem RLS ativo

## Como trabalhar comigo
- Antes de implementar: mostre o plano, espere aprovação
- Antes de commitar: mostre o diff
- Se algo do specs.md contradiz o que peço agora: aponte, não escolha sozinho
- Não adicione dependência sem perguntar
- Não "conserte" um teste alterando a asserção
- Se não souber: diga que não sabe. Não invente API nem nome de arquivo

## Comando único de verificação
npm run verify
```

---

<a name="anexo-b"></a>
## Anexo B — Tabela mestre de comandos

| Fase | Ferramenta | Comando / Prompt | Ressalva principal |
|---|---|---|---|
| Instalação | Superpowers | `/plugin marketplace add obra/superpowers-marketplace` + `/plugin install superpowers@superpowers-marketplace` | Um caminho só |
| Instalação | Ponytail | `/plugin marketplace add DietrichGebert/ponytail` + `/plugin install ponytail@ponytail` | Dois prompts separados; node no PATH |
| Instalação | Graphify | `uv tool install graphifyy` + `graphify install` | Evite pip no Mac/Win; `.claudeignore` |
| Instalação | ECC | `/plugin marketplace add https://github.com/affaan-m/ECC` + `/plugin install ecc@ecc` | Não empilhe com `npx skills add` |
| **0** Fundação | — | `npm create vite@latest -- --template react-ts` | strict ligado, não relaxe |
| **0** Fundação | — | Escrever `CLAUDE.md` | Você escreve; agente revisa |
| **0** Fundação | — | `npm run verify` (script único) | Um comando, não seis |
| **1** Plan | Superpowers | `/superpowers:brainstorm` | Hard gate: nada de código antes da aprovação |
| **1** Plan | ECC | *"Pesquise UX para [app]. Separe fatos de inferências."* | Abra ao menos 2 fontes |
| **1** Plan | — | *"Crie docs/specs.md com Persona, MVP, Aceite, Fora de Escopo, Não-funcionais, Zona Vermelha"* | "Fora de Escopo" é obrigatório |
| **1** Plan | Superpowers | `/superpowers:write-plan` | Revise o plano inteiro antes de executar |
| **2** Design | — | *"Crie tokens.css e mapeie no tailwind lendo as variáveis"* | Não duplicar valores nos 2 arquivos |
| **2** Design | — | *"Crie docs/components.md, máx. 12 primitivos"* | Variante > componente novo |
| **2** Design | ECC | *"Defina a direção visual em termos dos tokens"* | Confirme que a skill existe |
| **2** Design | — | *"Crie docs/responsive.md: 375/768/1440"* | Mobile é base, não override |
| **2** Design | — | *"Schema + RLS por tabela + teste de isolamento"* | Zona Vermelha: você aprova |
| **3** Fatia | — | *"Uma fatia vertical ponta a ponta + docs/patterns.md"* | Os 4 estados desde o início |
| **3** Fatia | Graphify | `graphify install --project --strict` + `/graphify .` | Só agora, com código real |
| **3** Fatia | Graphify | `graphify hook install` | Rebuild automático em commit/checkout |
| **4** TDD | Superpowers | ativa sozinha (`test-driven-development`) | Não duplique com execute-plan |
| **4** TDD | ECC | *"Crie o teste. Deve FALHAR (RED)."* | Consulta por role, não por classe |
| **4** TDD | Ponytail | *"Precisa existir? Já existe? A plataforma resolve?"* | Nunca corta segurança/a11y |
| **5** Impl | Superpowers | `/superpowers:execute-plan` | `/clear` entre features grandes |
| **5** Impl | Graphify | `/graphify query "já existe [X]?"` | Cheque `INFERRED` no arquivo |
| **5** Impl | — | `git add -p` | Leia todo hunk |
| **6** Review | — | `npm run dup` + `npm run dead` | Determinístico primeiro, agente depois |
| **6** Review | Ponytail | `/ponytail-review` | Regra dos três antes de unificar |
| **6** Review | Ponytail | `/ponytail-debt` | Dívida registrada é gerenciável |
| **7** A11y | — | `eslint` + `vitest-axe` | Automático pega ~30% |
| **7** Perf | — | `npx vite-bundle-visualizer` | Ícones: import individual |
| **8** Sec | ECC | *"security-scan em src/ e configs"* | Zona Vermelha revisada por humano |
| **8** Sec | — | `npm audit --audit-level=high` | Ative Dependabot |
| **9** Verify | ECC | *"verification-loop completo, aprovados e bloqueantes"* | Nunca declare pronto com bloqueante |
| **9** Verify | — | GitHub Actions + branch protection | CI é o que torna a regra real |
| **10** Deploy | — | `npm run verify && npm run build && npx vercel --prod` | Preview antes de prod |
| **10** Deploy | ECC | *"browser-qa na URL de produção"* | Teste o botão voltar |
| **11** Pós | ECC | *"Avalie o ciclo e proponha updates ao CLAUDE.md"* | É aqui que o sistema aprende |
| **11** Pós | Graphify | `/graphify ./src --update` | `--force` depois de refactor grande |
| **11** Pós | Superpowers | `finishing-a-development-branch` | — |

---

<a name="anexo-c"></a>
## Anexo C — Os 18 erros bobos mais comuns e como evitá-los

| # | Erro | Prevenção |
|---|---|---|
| 1 | Componente duplicado com nome diferente | `docs/components.md` + `/graphify query` antes de criar |
| 2 | Valor hardcoded em vez de token | Regra no `CLAUDE.md` + revisão no `ponytail-review` |
| 3 | Estado vazio ausente | Regra dos 4 estados no `CLAUDE.md` |
| 4 | Overflow horizontal em mobile | `docs/responsive.md` + teste em 375px |
| 5 | Ícone sem `aria-label` | `eslint-plugin-jsx-a11y` com `--max-warnings=0` |
| 6 | `@testing-library/react-hooks` (morto) | `renderHook` de `@testing-library/react` |
| 7 | Segredo em variável `VITE_` | Checklist de segurança + varredura |
| 8 | RLS desativado no Supabase | Teste de isolamento entre usuários |
| 9 | Teste "consertado" mudando a asserção | Revisar diff; regra explícita no `CLAUDE.md` |
| 10 | Import de ícones por namespace | Regra no `CLAUDE.md`; visível no bundle analyzer |
| 11 | Cache-first em rota de API | Estratégia de cache por tipo de recurso |
| 12 | PWA preso em versão antiga | Tratar evento de update com aviso ao usuário |
| 13 | `graphify-out/` invalidando cache de prompt | `.claudeignore` |
| 14 | ECC instalado por dois caminhos | Escolher um; conferir com `/plugin` |
| 15 | Ponytail instalado em um prompt só | Enviar os dois comandos separados |
| 16 | Rodar skills de verificação sem código | Só a partir da Fase 3 |
| 17 | Variável de ambiente mudada sem rebuild | Vite resolve em build time |
| 18 | Botão voltar quebrando o SPA | Item fixo no QA de produção |

---

<a name="anexo-d"></a>
## Anexo D — O que o documento original não cobria

Resumo das lacunas encontradas na revisão, para referência:

### Comandos incorretos
1. **Ponytail** — `npx skills add ... --skill ponytail` não é o caminho oficial
2. **ECC** — `npx skills add https://github.com/affaan-m/ECC --skill X` não é o caminho oficial; e há risco real de empilhar duas instalações
3. **Graphify** — `pip install` funciona mas quebra em Mac/Windows; `uv tool` é o caminho recomendado
4. **`@testing-library/react-hooks`** — pacote descontinuado

### Ordem incorreta
5. `/graphify .` na Fase 1 (repositório vazio) — inútil, movido para depois da primeira fatia
6. TDD manual (Fase 3) + `execute-plan` (Fase 4) — trabalho duplicado

### Ausências estruturais
7. **`CLAUDE.md`** — o artefato de maior impacto do fluxo inteiro
8. **Design tokens** como fonte única — origem direta de UI inconsistente
9. **Inventário de componentes** — origem direta de componente duplicado
10. **Contrato de responsividade** — sem ele, "responsivo" é opinião
11. **Fatia vertical primeiro** — evita 20 componentes que não conectam a nada
12. **Os quatro estados** (loading/erro/vazio/sucesso)
13. **Detecção automática de duplicação** (`jscpd`, `knip`)
14. **RLS no Supabase** — a falha de segurança mais provável do fluxo
15. **Distinção anon key vs service role key**
16. **CI/CD** — sem ele, toda verificação depende de memória humana
17. **Zona Vermelha** — o que não se delega à IA
18. **Plano de rollback** e reversão de migration
19. **Gestão de contexto e custo** (`/clear`, modelo forte para planejar, rápido para executar)
20. **Ritual de manutenção** e ciclo de aprendizado que alimenta o `CLAUDE.md`

### Nuances das ferramentas
21. Hard gate do brainstorming intercepta plan mode
22. Ponytail não corta segurança, a11y nem tratamento de perda de dados
23. Arestas do Graphify vêm marcadas `EXTRACTED` vs `INFERRED`
24. Modo `--strict` do Graphify muda o comportamento materialmente
25. Nomes de skills do ECC mudam — precisam ser confirmados antes de citar em prompt

---

## Fontes principais

- Graphify — README oficial (`github.com/Graphify-Labs/graphify`)
- Ponytail — README e releases (`github.com/DietrichGebert/ponytail`)
- Superpowers — repositório e marketplace (`github.com/obra/superpowers`)
- ECC — README e canais oficiais (`github.com/affaan-m/ECC`)
- Análises de dívida técnica em vibecode (2026): thevibelog.dev, getautonoma.com, exadel.com
- Boas práticas de vibecode responsável: rtslabs.com, daily.dev
- Design tokens e sistemas de design orientados a IA: vp0.com, minhvo.is-a.dev

> **Ressalva sobre este manual.** O ecossistema de skills do Claude Code muda semanalmente. Comandos de instalação e nomes de skills foram verificados em setembro de 2026. Antes de seguir qualquer comando de instalação, confira o README oficial da ferramenta — é a única fonte que não envelhece.
