# Ledger de dívida ponytail

Gerado por `/ponytail-debt`. Cada linha é um comentário `ponytail:` no código —
um corte deliberado, não esquecido. Atualize este arquivo sempre que rodar o
comando de novo (mesmo protocolo do `docs/progresso.md`: se divergir do
código, o código venceu).

| Arquivo:linha | O que foi simplificado | Teto | Trigger de revisão |
|---|---|---|---|
| `src/components/features/BoardShell.tsx:33` | Botão "Sair" chama `sair()` do serviço direto no `onClick`, sem passar por um hook de mutação (`useMutation`) como o resto das escritas do app | Ação global de sessão, não leitura/escrita de dado em cache — `SessaoProvider`/`RotaProtegida` já reagem ao `SIGNED_OUT` e redirecionam sozinhos | **Nenhum nomeado no comentário original.** Revisitar se: (a) `sair()` precisar de estado de loading/erro visível na UI, ou (b) uma segunda ação global (ex.: trocar de workspace) aparecer chamando serviço direto do mesmo jeito — aí vira padrão a formalizar, não exceção |

**1 marcador, 1 sem trigger nomeado** (corrigido acima na coluna "Trigger de revisão" — o original só explicava o porquê, não o gatilho).
