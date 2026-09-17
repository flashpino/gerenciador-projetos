import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)

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
