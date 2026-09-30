---
name: gerenciador-projetos
description: Alimenta e atualiza o Gerenciador de Projetos (board de tarefas do usuário). Use quando um plano de implementação foi criado ou aprovado (crie as tarefas no sistema), quando uma tarefa do plano começa, termina ou trava (atualize o status), quando o usuário pedir para "lançar/atualizar/sincronizar no gerenciador", ou ao retomar um projeto que já tem board. Funciona para projeto novo e existente, de qualquer pasta.
---

# Gerenciador de Projetos — alimentar o board e manter o status em dia

O usuário acompanha os projetos num board (Tabela, Kanban, Gantt, Dashboard). **Você é quem executa o trabalho, então
é você quem mantém o board fiel.** A CLI `gp.mjs` faz isso; ela usa uma conta de serviço já configurada na máquina.

```bash
GP="$HOME/.claude/skills/gerenciador-projetos/gp.mjs"      # no Windows/Git Bash também funciona
node "$GP" ajuda
```

Rode sempre de dentro do projeto: o vínculo (`.gerenciador.json`, sem segredo, pode ir para o git) é procurado da pasta atual para cima.

## 0. Antes de tudo: a conta funciona?

```bash
node "$GP" eu
```

- Mostra a conta, os workspaces (com **dono**) e os boards a que ela tem acesso.
- "configuração incompleta" → **pare e avise o usuário**: ele roda `node "$GP" configurar` uma vez. **Nunca peça nem escreva a senha.**
- "sem permissão" / board não aparece → a conta de serviço não foi convidada no workspace. Diga ao usuário: *"Convidar integrantes"* no board, com o e-mail da conta.

## 1. Projeto NOVO — quando o plano estiver definido

1. Garanta que o plano está num arquivo. **Plano do `superpowers:writing-plans` (`### Task N:` + `- [ ] **Step k**`) serve direto** — não converta.
   Sem esse formato, escreva um JSON (seção 5) num arquivo temporário.
2. Simule primeiro: `node "$GP" importar docs/superpowers/plans/AAAA-MM-DD-nome.md --criar "Nome do sistema" --dry-run`
3. Se o resumo estiver certo, rode sem `--dry-run`. Com mais de um workspace, ele lista as opções: escolha por **id** com `--workspace <id>` (os nomes se repetem!) — **pergunte ao usuário qual é o dele** se não souber.
4. O projeto fica vinculado (`.gerenciador.json`). Daqui em diante não precisa de `--board`.

## 2. Projeto EXISTENTE (o board já existe)

```bash
node "$GP" boards                                   # descobrir o board
node "$GP" vincular --board "<nome ou id>"          # uma vez por projeto
node "$GP" importar <plano> --dry-run               # depois sem --dry-run
node "$GP" tarefas                                  # o que já está lá (refs e status)
```

Se o board tem tarefas que não vieram de um plano, elas **não são tocadas** (só se reconhece o que tem `ref`). Não duplique tarefas na mão: importe.

## 3. Durante a execução — mantenha o status em dia (isto é o mais importante)

| Momento | Comando |
|---|---|
| Vai começar uma tarefa | `node "$GP" iniciar <ref>` |
| Terminou **e verificou** (testes verdes, commit feito) | `node "$GP" concluir <ref> --comentario "o que foi feito · commit abc123"` |
| Pronta, esperando revisão de alguém | `node "$GP" revisar <ref>` |
| Bloqueada | `node "$GP" travar <ref> --comentario "por que travou"` (o motivo é obrigatório) |
| Marcou várias caixas do plano de uma vez | `node "$GP" importar <plano>` (sincroniza tudo) |

- O `<ref>` de um plano em markdown é `<nome-do-arquivo>#T<N>` (ex.: `pwa#T3`). Na dúvida: `node "$GP" tarefas`.
- Só marque `concluir` depois de **verificar** de verdade. Status no board é uma promessa ao usuário.
- Reimportar **nunca desfaz** progresso (status e subtarefas só avançam), então sincronizar de novo é sempre seguro.

## 4. Regras que não se negociam

- **Nunca invente `ref`, id de board ou de workspace.** Descubra com `tarefas`, `boards`, `eu`.
- **Nunca exiba, grave em arquivo do projeto ou coloque em commit** e-mail/senha/chave da conta. `.gerenciador.json` é o único arquivo da integração que vai para o git.
- **Não apague nem edite** tarefas na mão pelo banco; a CLI só cria e atualiza (apagar é decisão do usuário, na interface).
- Erro de validação lista **todos** os problemas do plano e não grava nada: corrija e rode de novo.
- Se um comando falhar por rede/permissão, **conte ao usuário** em vez de seguir como se o board estivesse atualizado.

## 5. Plano em JSON (quando não há markdown no formato do superpowers)

```json
{
  "nomeBoard": "Sistema de Faturas",
  "grupos": [
    {
      "nome": "Fase 1 — Fundação",
      "cor": "azure",
      "tarefas": [
        {
          "ref": "fat-01",
          "titulo": "Modelar tabelas e RLS",
          "descricao": "texto opcional",
          "prioridade": "high",
          "inicio": "2026-10-01",
          "prazo": "2026-10-03",
          "etiquetas": ["banco"],
          "subtarefas": ["Escrever migration", { "titulo": "Testar isolamento", "feita": false }]
        },
        { "ref": "fat-02", "titulo": "Entrega da versão beta", "marco": true, "prazo": "2026-10-20" }
      ]
    }
  ]
}
```

- `ref`: **obrigatório**, único e **estável** (é o que evita duplicar ao reimportar). Use um prefixo do projeto. Letras, números e `_ . # : -`, até 60.
- `prioridade`: `low | medium | high | critical` · `status`: `not_started | working | review | done | stuck` · `cor`: `azure | grape | mint | crimson`.
- Datas `AAAA-MM-DD`; `prazo` não pode ser antes de `inicio`; **marco** é data única (precisa de `prazo`).
- Campo omitido só vale para **criar**; nunca sobrescreve o que uma pessoa ajustou no board.
