#!/usr/bin/env bash
# PreToolUse(Bash) hook — intercepta `git commit` e força uma checklist do
# manual-vibecode-claude.md antes de deixar passar. Não sabe (nenhum hook
# sabe) se o diff foi de fato mostrado ao usuário ou se o dup/dead/ponytail
# já rodaram nesta leva — mas transforma "esquecer" em "ignorar um aviso
# explícito", que é a lacuna que a sessão anterior expôs.
node -e '
let data = "";
process.stdin.on("data", (d) => { data += d; });
process.stdin.on("end", () => {
  let input;
  try { input = JSON.parse(data); } catch { process.stdout.write("{}"); return; }
  const cmd = (input.tool_input && input.tool_input.command) || "";
  if (!/\bgit\s+commit\b/.test(cmd)) { process.stdout.write("{}"); return; }

  const reason = [
    "Antes deste commit (manual-vibecode-claude.md + CLAUDE.md), confirme:",
    "1) O diff desta leva de mudanças já foi MOSTRADO ao usuário nesta conversa",
    "   (não só um `git diff` rodado, mas efetivamente exibido)?",
    "2) npm run dup e npm run dead já rodaram isolados para este código?",
    "3) /ponytail-review (há diff) ou /ponytail-audit (sem diff) + /ponytail-debt",
    "   já rodaram para esta feature?",
    "4) Se algum arquivo NOVO foi criado: /graphify query já rodou antes dele?",
    "5) Se isto fecha uma feature grande: a reauditoria código-vs-doc (manual",
    "   §8.4) já foi feita?",
    "Se sim a tudo, prossiga com o commit. Se não, pare agora — não commite",
    "primeiro e explique depois.",
  ].join("\n");

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: reason,
    },
  }));
});
'
