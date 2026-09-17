import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import type { AxeResults } from 'axe-core'
import { afterEach, expect } from 'vitest'

afterEach(cleanup)

/**
 * vitest-axe@0.1.0 tem DOIS bugs de empacotamento confirmados lendo
 * node_modules/vitest-axe/:
 *   1. `extend-expect.js` é um arquivo vazio — não registra o matcher.
 *   2. `matchers.d.ts` é `export type * from "./dist/matchers"` — marca a
 *      função real de dist/matchers.js como type-only, então QUALQUER
 *      import estático (nomeado ou de namespace) do valor falha sob
 *      verbatimModuleSyntax (TS1362/TS2339), mesmo o runtime funcionando.
 *
 * `import()` dinâmico + cast contorna a declaração quebrada sem tocar
 * node_modules. O tipo de uso (`expect(...).toHaveNoViolations()`) vem de
 * src/test/vitest-axe.d.ts, escrito a mão pelo mesmo motivo.
 */
const { toHaveNoViolations } = (await import('vitest-axe/matchers')) as unknown as {
  toHaveNoViolations: (results: AxeResults) => { message(): string; pass: boolean }
}
expect.extend({ toHaveNoViolations })

/**
 * jsdom nao implementa HTMLDialogElement.showModal()/close() (issue aberta
 * ha anos: jsdom/jsdom#3294). Sem isto, `<Modal>` (que usa <dialog> nativo,
 * docs/components.md #9) derruba todo teste que o renderiza com "showModal
 * is not a function". O polyfill so cobre o que o componente precisa:
 * refletir o atributo `open` e disparar o evento `close`. Comportamento de
 * teclado do navegador (Esc fechando o <dialog>) e nativo, nao e codigo
 * nosso — verificado manualmente, nao aqui (mesma decisao do manual para
 * service worker em jsdom).
 */
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}
