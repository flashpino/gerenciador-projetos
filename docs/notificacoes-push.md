# Notificações push — como ligar

O código está pronto, mas as notificações só funcionam depois de **5 passos seus**. A migration, a
função e o webhook ficam na **Zona Vermelha** (`CLAUDE.md`): o agente escreveu, você revisa e aplica.

## Como funciona

```
alguém muda status / comenta / cria tarefa
        │  (gatilho 0004 já existente)
        ▼
  activities  ── INSERT ──►  gatilho 0008 (pg_net)  ──►  função `notificar`
                                                    │ confere x-webhook-secret
                                                    │ valida o payload
                                                    │ acha o responsável da tarefa
                                                    │ (não avisa a própria ação)
                                                    ▼
                                         push_subscriptions do responsável
                                                    │ web-push (VAPID)
                                                    ▼
                                  celular / navegador → public/push-sw.js mostra
```

- **Quem recebe:** o responsável da tarefa, quando **outra** pessoa age. Sem responsável, ninguém.
- **Cada aparelho se inscreve separado**, em Configurações → "Ativar notificações".
- **iPhone:** só com o app **instalado na tela de início** (iOS 16.4+). No Safari comum não há Push API.

## Passo a passo

1. **Revisar e aplicar a migration** `supabase/migrations/0007_push_subscriptions.up.sql`
   (tabela + RLS: cada pessoa só vê e mexe nas próprias inscrições). Reverter: `.down.sql`.

2. **Gerar as chaves VAPID** (no seu terminal; não cole a privada em lugar nenhum além do passo 3):
   ```
   node scripts/gerar-vapid.mjs
   ```

3. **Segredos da função** (Supabase CLI, logado no projeto):
   ```
   supabase secrets set VAPID_PUBLIC_KEY=<pública> VAPID_PRIVATE_KEY=<privada>      VAPID_SUBJECT=mailto:<seu-email> WEBHOOK_SECRET=<uma senha longa aleatória>
   ```
   `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` o Supabase já injeta na função.

4. **Publicar a função** (revise `supabase/functions/notificar/index.ts` antes):
   ```
   supabase functions deploy notificar --no-verify-jwt
   ```
   `--no-verify-jwt` porque quem chama é o webhook, autenticado pelo `x-webhook-secret`
   (comparado em tempo constante), não por um usuário logado.

5. **Webhook em SQL** (migration `0008_webhook_notificar`, no lugar do webhook do painel — o recurso de
   webhooks do painel nunca foi ligado neste projeto). Gatilho em `activities` chama a função via `pg_net`.
   O segredo e a URL ficam no **Vault**, não no arquivo:
   ```sql
   select vault.create_secret('<WEBHOOK_SECRET>', 'notificar_webhook_secret');
   select vault.create_secret('https://<ref>.supabase.co/functions/v1/notificar', 'notificar_url');
   ```
   **Não crie também o webhook no painel**: cada atividade dispararia dois pushes.

6. **No app:** `VITE_VAPID_PUBLIC_KEY=<pública>` no `.env.local` e nas variáveis do deploy
   (Vite resolve em build: mudou, rebuilda). Sem ela, Configurações diz "ainda não configuradas".

## Como testar

Duas contas no mesmo workspace. A conta A ativa as notificações e é responsável por uma tarefa. A conta B
muda o status dessa tarefa → o aviso chega para A (mesmo com o app fechado, no celular com o app instalado).

## Limites conhecidos

- **Atribuir uma tarefa existente a alguém não notifica:** atribuição não gera linha em `activities`.
  Resolver exige um novo tipo de atividade (migration).
- **Aparelho compartilhado:** o `endpoint` é único por navegador. Se outra conta ativar no mesmo navegador,
  a gravação é recusada pelo RLS (a inscrição é da primeira conta) — ela precisa desativar antes.
- **Sem preferências por tipo de evento** e sem e-mail (fora de escopo em `docs/specs.md`).

## Estado no projeto `xgipcdxxvgzmbfycyzer` (2026-09-30)

Feito pelo agente a pedido explícito do usuário: segredos da função (`VAPID_*`, `WEBHOOK_SECRET` —
trocado, pois estava igual à chave pública), deploy da `notificar`, migration 0008 aplicada e Vault
preenchido. Testado: função recusa sem segredo (401) e payload inválido (400); banco → função pelo
`pg_net` com o segredo do Vault responde 204. Falta só o teste com duas contas num aparelho real.
