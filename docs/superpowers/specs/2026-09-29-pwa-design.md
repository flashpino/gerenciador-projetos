# PWA — instalar, atualizar, splash

**Data:** 2026-09-29 · **Status:** design aprovado em conversa
**Origem:** `docs/specs.md` §5 "PWA" (instalável, ícones 192/512 + maskable, atualização
avisada, sem offline). `vite-plugin-pwa` instalado desde a Fase 0 e nunca usado
(`docs/DEPS-PENDENTES.md`).

## Escopo

- App **instalável**: manifest válido, ícones 192/512 + maskable, service worker.
- **Aviso de nova versão** no rodapé; só recarrega quando a pessoa clica.
- **Botão Instalar** no mesmo aviso, onde o navegador oferece (`beforeinstallprompt`).
- **Splash** do Android a partir do manifest.

**Fora de escopo:**
- Push — vira o sub-projeto seguinte, com spec própria; ele reabre `docs/specs.md:148`.
- Funcionamento offline (decisão do produto, `docs/specs.md:187`).
- Instruções de instalação no iPhone: o Safari não dispara `beforeinstallprompt` e
  não há como detectar a possibilidade de instalar.
- Imagens de abertura do iPhone (`apple-touch-startup-image`, uma por tamanho de tela).

**Sem migration, sem Zona Vermelha. Sem dependência nova.**

## Configuração — `vite.config.ts`

`VitePWA` com:

- `registerType: 'prompt'`: o service worker novo espera; quem aplica é o clique em
  "Recarregar".
- `manifest`: `name: "Gerenciador de Projetos"`, `short_name: "Projetos"`,
  `lang: "pt-BR"`, `display: "standalone"`, `start_url: "/"`,
  `theme_color: "#0073ea"` (`--color-primary`), `background_color: "#ffffff"`
  (`--color-surface`), ícones abaixo.
  O manifest não lê variável CSS, então os dois hex se repetem aqui **com comentário
  apontando para `src/styles/tokens.css`**. `check-arch` só varre `src/`, então isso
  não o reprova. É uma exceção registrada, não uma brecha.
- `workbox.globPatterns: ['**/*.{js,css,html,svg,png,woff2}']`: precache só dos
  arquivos do app. As chamadas ao Supabase (outra origem) não passam por cache de
  runtime, então nenhum dado vem velho do cache.
- `devOptions.enabled: false`: o SW só existe no build/preview.

`index.html` ganha `<meta name="theme-color">` e `<link rel="apple-touch-icon">`.

## Ícones — `scripts/gerar-icones.py`

Script único e versionado. Usa o Pillow do Python da máquina (não entra no
`package.json`). Desenha fundo `#0073ea` e 3 colunas brancas de kanban de alturas
decrescentes, e escreve em `public/`:

| Arquivo | Tamanho | Uso |
|---|---|---|
| `pwa-192.png` | 192 | manifest, `purpose: any` |
| `pwa-512.png` | 512 | manifest, `purpose: any` + splash Android |
| `pwa-maskable-512.png` | 512 | manifest, `purpose: maskable`. Glifo dentro do círculo de 80% (zona segura) |
| `apple-touch-icon.png` | 180 | iOS |
| `favicon.svg` | vetor | substitui o raio padrão do template Vite |

## Aviso — `src/components/features/AvisoPWA.tsx`

Componente de feature (não primitivo, conforme `docs/components.md:80`), montado **uma
vez** na raiz do app, fora das rotas. Mostra no máximo um aviso por vez:

| Prioridade | Quando | Texto | Botões |
|---|---|---|---|
| 1 | `needRefresh` do `useRegisterSW` | "Nova versão disponível" | **Depois** (esconde nesta aba) · **Recarregar** (`updateServiceWorker(true)`) |
| 2 | `useInstalarApp().podeInstalar` | "Instalar o app no seu dispositivo" | **Agora não** (lembra no navegador) · **Instalar** (janela nativa) |

Visual: barra fixa no rodapé (`fixed inset-x-0 bottom-0`) com margem de 16px no
mobile, `role="status"`, dois `<Button size="sm">` com alvo de 44px. Só tokens.

`useRegisterSW` vem de `virtual:pwa-register/react` (do próprio plugin).

## Hook — `src/hooks/useInstalarApp.ts`

```ts
function useInstalarApp(): { podeInstalar: boolean; instalar: () => Promise<void>; dispensar: () => void }
```

- Escuta `beforeinstallprompt`, chama `preventDefault()` e guarda o evento.
- `podeInstalar` = há evento guardado, **e** o app não está em
  `matchMedia('(display-mode: standalone)')`, **e** não há marca de dispensa no
  `localStorage` (chave `pwa-instalar-dispensado`).
- `instalar()` chama `evento.prompt()`, espera `userChoice` e descarta o evento,
  aceito ou recusado, porque o navegador não deixa reusar.
- `dispensar()` grava a marca e esconde o aviso.
- Escuta `appinstalled` e descarta o evento.
- Todo acesso ao `localStorage` fica em try/catch: se o storage falhar, o aviso só
  volta na próxima visita, e nada quebra.

## Testes

- `useInstalarApp.test.ts` (`renderHook`): sem evento → `false`; evento disparado →
  `true`; `instalar()` chama `prompt()` e volta a `false`; `dispensar()` grava a marca;
  com a marca pré-gravada → `false`; em `standalone` → `false`; `appinstalled` → `false`.
- `AvisoPWA.test.tsx` (hook do plugin mockado com `vi.mock`): nada pendente → nada
  renderiza; `needRefresh` → aviso com "Recarregar", que chama
  `updateServiceWorker(true)`; "Depois" esconde; instalar disponível → "Instalar"
  chama `instalar`, "Agora não" chama `dispensar`; os dois ao mesmo tempo → aparece o
  de atualizar.
- `a11y.test.tsx`: `AvisoPWA` nos dois estados.
- Manual: `npm run build && npm run preview`, Chrome DevTools → Application →
  Manifest sem erro e com o ícone maskable correto; instalar pelo aviso; publicar um
  build novo e ver o aviso de versão.

## Limpeza e docs

- `knip.json`: tirar `vite-plugin-pwa` de `ignoreDependencies` (e o bloco, se esvaziar).
- `docs/DEPS-PENDENTES.md`: apagar. `vite-plugin-pwa` era a última linha pendente.
- `docs/components.md`: linha `Toast` → `AvisoPWA` na Tabela 2, com a justificativa.
- `docs/progresso.md`: seção do PWA; tirar "PWA instalado, ainda não usado".
