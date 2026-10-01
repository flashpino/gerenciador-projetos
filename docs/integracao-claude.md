# Integração Claude → Gerenciador de Projetos

Permite que o Claude, **em qualquer sessão e em qualquer pasta**, crie as tarefas de um plano no sistema e vá
atualizando o status conforme conclui. Serve para projeto **novo** e para projeto que **já existe**.
Spec e decisões: `docs/superpowers/specs/2026-09-30-integracao-claude-design.md`.
Sem a CLI (outra ferramenta, outra linguagem): a API HTTP direta está em [`docs/api-tarefas.md`](api-tarefas.md).

## Como funciona, em uma frase

Uma **conta de serviço** (um usuário comum do app, convidado no seu workspace) + uma **CLI** (`gp.mjs`) que essa conta
usa para criar/atualizar tarefas + uma **skill** que ensina o Claude *quando* chamar a CLI. Sem mudança no servidor:
o Claude tem exatamente o acesso de um membro do workspace, nada além.

## Configuração (uma vez; só você pode fazer, envolve senha)

### 1. Crie a conta de serviço

Logado como **master**, use a tela **Usuários** → **Novo usuário** (ou, sem ser master, cadastre numa janela anônima)
uma conta dedicada (ex.: `claude.bot@seudominio.com`), com **senha forte e única**. Não reutilize sua conta pessoal. Ao cadastrar, o app cria para ela um workspace próprio; ignore-o.

### 2. Convide-a no seu workspace

Logado como **você** (dono do workspace): no menu lateral, clique no logo (seletor de workspace) → **Compartilhar workspace** (ou tela **Workspaces** → Compartilhar) → e-mail da conta de serviço.
O convite é do **workspace inteiro**: a conta vê todos os painéis dele (não há convite por painel).
Só funciona para quem já tem conta (por isso o passo 1 vem antes); nenhum e-mail é enviado.

- Revogar depois = remover a conta de serviço na mesma janela. Ela perde o acesso na hora.
- Cada workspace precisa do convite (a conta só enxerga os workspaces em que é membro).

### 3. Instale a CLI e a skill nesta máquina

```bash
node integracao-claude/instalar.mjs
```

Copia tudo para `~/.claude/skills/gerenciador-projetos/`. A partir daí **toda sessão do Claude nesta máquina** (qualquer projeto)
enxerga a skill. Não tem dependência de `npm install`: só precisa de Node 18+.

### 4. Configure a conta (a senha nunca passa pelo Claude)

```bash
node ~/.claude/skills/gerenciador-projetos/gp.mjs configurar
```

Ele pergunta: URL do projeto Supabase, a **chave pública** (a mesma `VITE_SUPABASE_ANON_KEY` do `.env.local`, feita para ficar
no navegador), e-mail e senha da conta de serviço (a senha não aparece na tela). **Só grava se o login funcionar.** O arquivo
fica em `~/.config/gerenciador-projetos/config.json`, legível só por você (no Windows, o modo é ignorado: proteja sua pasta de usuário).

### 5. Teste

```bash
node ~/.claude/skills/gerenciador-projetos/gp.mjs eu
```

Deve mostrar a conta, os workspaces (com o **dono**) e os boards. Se o seu workspace não aparecer, falta o passo 2.

## Uso: você só conversa com o Claude

Em qualquer projeto, na sessão do Claude:

| Você diz | O que acontece |
|---|---|
| "crie o plano e alimente o gerenciador" | Ele importa o plano como projeto novo (`--criar`). Se a conta estiver em mais de um workspace, **ele pergunta qual** |
| "esse projeto já tem board, lança as tarefas lá" | `boards` → `vincular` → `importar` |
| (durante a execução) | Ele roda `iniciar` ao começar cada tarefa e `concluir --comentario "…commit…"` ao terminar, e `travar` se bloquear |
| "sincroniza o plano" | Ele reimporta o `.md` (caixas marcadas viram status). Nunca desfaz progresso |

O projeto fica **vinculado** por `.gerenciador.json` (só contém ids, **pode ir para o git**; qualquer sessão futura naquele
projeto já sabe qual é o board).

### Formato do plano

- **Markdown do `superpowers:writing-plans`** funciona direto: cada `### Task N:` vira tarefa, cada `- [ ] **Step k**` vira
  subtarefa, e o status sai das caixas (`- [x]`).
- **JSON** para qualquer outro caso (formato na `SKILL.md`). O importante é o `ref`: um identificador **estável** por tarefa.

## Outra sessão, outra conta, outra máquina

- **Outra pasta/projeto, mesma máquina:** já funciona (a skill é da máquina, não do projeto).
- **Outra conta do Claude na mesma máquina:** funciona se ela usar o mesmo `~/.claude`. Senão, rode o passo 3 de novo.
- **Outra máquina:** copie `integracao-claude/` (ou rode `instalar.mjs --destino <pasta>`) e faça o passo 4 lá com **a mesma conta de
  serviço**. Ou, sem gravar nada em disco, exporte `GP_URL`, `GP_CHAVE`, `GP_EMAIL`, `GP_SENHA` no ambiente.
- **Outra conta do sistema (não a de serviço):** também vale, desde que seja membro do workspace. É só configurar com o e-mail e a senha dela.

## Segurança

- A conta de serviço lê e escreve **tudo do workspace em que é membro**, e **nada** dos outros (o RLS do banco garante).
  O estrago de um vazamento da senha é o de qualquer membro. Por isso: conta **dedicada**, senha **única**, e você remove a conta
  do workspace se desconfiar.
- A CLI **nunca imprime** senha, token ou e-mail em erro (há teste para isso) e não usa a chave de serviço do Supabase.
- Não coloque a senha em arquivo do projeto nem em commit. Só o `.gerenciador.json` (ids) vai para o git.

## Problemas comuns

| Sintoma | Causa e saída |
|---|---|
| `configuração incompleta` | Falta o passo 4 nesta máquina |
| `login recusado` | E-mail/senha/URL/chave errados; rode `configurar` de novo |
| `sem permissão: a conta precisa ser membro` | A conta de serviço não foi convidada nesse workspace (passo 2) |
| O board não aparece em `boards` | Idem: só se enxerga o que a conta é membro |
| `a conta pertence a N workspaces` | Normal: escolha com `--workspace <id>`. Os **nomes se repetem** ("Meu Workspace"), use o id |
| Tarefas duplicadas | Não deveria: a identidade é o `ref`. Se mudou o `ref` de um plano existente, as antigas ficam e as novas são criadas |
| Status "voltou" | Não volta: reimportar só avança. Para recuar, use `gp status <ref> <status>` |
