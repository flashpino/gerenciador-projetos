#!/usr/bin/env bash
# PreToolUse(Bash) hook — intercepta `git commit` e força uma checklist do
# manual-vibecode-claude.md antes de deixar passar. Não sabe (nenhum hook
# sabe) se o diff foi de fato mostrado ao usuário ou se o dup/dead/ponytail
# já rodaram nesta leva — mas transforma "esquecer" em "ignorar um aviso
# explícito", que é a lacuna que a sessão anterior expôs.
if [ -f .claude/modo-autonomo ]; then echo '{}'; exit 0; fi
node -e '
let data = "";
process.stdin.on("data", (d) => { data += d; });
process.stdin.on("end", () => {
  let input;
  try { input = JSON.parse(data); } catch { process.stdout.write("{}"); return; }
  const cmd = (input.tool_input && input.tool_input.command) || "";
  if (!/\bgit\s+commit\b/.test(cmd)) { process.stdout.write("{}"); return; }

  // Uma linha só (feedback do usuário: 5 perguntas por commit era atrito
  // demais). O checklist completo continua em manual-vibecode-claude.md —
  // esta é a trava, não o lugar de repetir o texto inteiro.
  const reason =
    "Checklist do manual (diff mostrado, dup/dead, ponytail-review/audit+debt, " +
    "graphify se houve arquivo novo, reauditoria se fechou feature grande) já " +
    "rodou para este commit?";

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: reason,
    },
  }));
});
'
