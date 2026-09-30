import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useInstalarApp } from './useInstalarApp'

// jsdom não implementa matchMedia; o hook usa para saber se já roda instalado.
function modoStandalone(ativo: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: ativo && q === '(display-mode: standalone)' }))
}

function dispararEvento() {
  const prompt = vi.fn().mockResolvedValue(undefined)
  const evento = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  })
  act(() => {
    window.dispatchEvent(evento)
  })
  return { evento, prompt }
}

describe('useInstalarApp', () => {
  beforeEach(() => {
    localStorage.clear()
    modoStandalone(false)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sem evento do navegador, não oferece instalar', () => {
    const { result } = renderHook(() => useInstalarApp())
    expect(result.current.podeInstalar).toBe(false)
  })

  it('com o evento, oferece instalar e segura o mini-infobar', () => {
    const { result } = renderHook(() => useInstalarApp())
    const { evento } = dispararEvento()
    expect(result.current.podeInstalar).toBe(true)
    expect(evento.defaultPrevented).toBe(true)
  })

  it('instalar() abre a janela nativa e descarta o evento', async () => {
    const { result } = renderHook(() => useInstalarApp())
    const { prompt } = dispararEvento()
    await act(() => result.current.instalar())
    expect(prompt).toHaveBeenCalledOnce()
    expect(result.current.podeInstalar).toBe(false)
  })

  it('dispensar() grava a marca e esconde', () => {
    const { result } = renderHook(() => useInstalarApp())
    dispararEvento()
    act(() => result.current.dispensar())
    expect(result.current.podeInstalar).toBe(false)
    expect(localStorage.getItem('pwa-instalar-dispensado')).not.toBeNull()
  })

  it('com a marca já gravada, não oferece', () => {
    localStorage.setItem('pwa-instalar-dispensado', '1')
    const { result } = renderHook(() => useInstalarApp())
    dispararEvento()
    expect(result.current.podeInstalar).toBe(false)
  })

  it('já instalado (standalone), não oferece', () => {
    modoStandalone(true)
    const { result } = renderHook(() => useInstalarApp())
    dispararEvento()
    expect(result.current.podeInstalar).toBe(false)
  })

  it('appinstalled descarta o evento', () => {
    const { result } = renderHook(() => useInstalarApp())
    dispararEvento()
    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(result.current.podeInstalar).toBe(false)
  })

  it('storage bloqueado não quebra: oferece e dispensa na sessão', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    const { result } = renderHook(() => useInstalarApp())
    dispararEvento()
    expect(result.current.podeInstalar).toBe(true)
    act(() => result.current.dispensar())
    expect(result.current.podeInstalar).toBe(false)
  })
})
