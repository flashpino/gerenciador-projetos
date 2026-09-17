#!/usr/bin/env bash
# SessionStart hook — força o protocolo do manual-vibecode-claude.md no
# contexto de TODA sessão nova (inclusive /clear e resume), em vez de
# depender de alguém ler o CLAUDE.md e lembrar sozinho.
#
# Motivo: uma sessão anterior implementou a F2 (Kanban) inteira sem isso —
# ver CLAUDE.md, seção "Erros já cometidos neste projeto". Documentação que
# só é lida "se alguém lembrar" não é proteção; um hook que injeta o
# lembrete a cada sessão é.
node -e '
const msg = [
  "PROTOCOLO OBRIGATORIO DESTE PROJETO (manual-vibecode-claude.md + CLAUDE.md).",
  "Antes de tocar em qualquer arquivo, confirme ao usuario que leu o manual",
  "(frase minima: \"Li o manual-vibecode-claude.md e vou seguir os passos dele\").",
  "",
  "Durante o trabalho, nao pule silenciosamente:",
  "1. /graphify query \"ja existe algo que faz [X]?\" ANTES de escrever arquivo novo.",
  "2. npm run dup e npm run dead ISOLADOS, antes de pedir revisao conceitual.",
  "3. /ponytail-review (ha diff pendente) ou /ponytail-audit (sem diff) + /ponytail-debt",
  "   antes de considerar uma feature concluida — a skill de execucao de plano",
  "   (subagent-driven-development etc.) NAO substitui isso.",
  "4. Mostrar o DIFF ao usuario ANTES do commit acontecer, nao depois.",
  "5. Reauditoria de arquitetura codigo-vs-doc depois de feature grande (manual 8.4).",
  "6. graphify update . depois de qualquer leva de commits.",
  "",
  "Se uma skill tornar impraticavel seguir um passo a risca, diga isso ao",
  "usuario ANTES de prosseguir — nao substitua silenciosamente e narre depois.",
].join("\n");
process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: msg },
}));
'
