import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useInstalarApp } from './useInstalarApp'

const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36'
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0 Safari/537.36'

/** jsdom não tem matchMedia nem muda o userAgent: o dispositivo é montado à mão. */
function dispositivo({ ua = UA_ANDROID, toque = true, standalone = false } = {}) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: (q === '(pointer: coarse)' && toque) || (q === '(display-mode: standalone)' && standalone),
  }))
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua)
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

describe('useInstalarApp — o aviso de instalar é para o CELULAR', () => {
  beforeEach(() => {
    localStorage.clear()
    dispositivo()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('computador: não oferece, mesmo com o evento do navegador', () => {
    dispositivo({ ua: UA_PC, toque: false })
    const { result } = renderHook(() => useInstalarApp())
    dispararEvento()
    expect(result.current.modo).toBe('nenhum')
  })

  it('iPhone (o Safari não tem o evento): instruções do Compartilhar', () => {
    dispositivo({ ua: UA_IPHONE })
    const { result } = renderHook(() => useInstalarApp())
    expect(result.current.modo).toBe('ios')
  })

  it('Android sem o evento: instrução pelo menu do navegador', () => {
    const { result } = renderHook(() => useInstalarApp())
    expect(result.current.modo).toBe('manual')
  })

  it('Android com o evento: botão de instalar, e segura o mini-infobar', () => {
    const { result } = renderHook(() => useInstalarApp())
    const { evento } = dispararEvento()
    expect(result.current.modo).toBe('botao')
    expect(evento.defaultPrevented).toBe(true)
  })

  it('instalar() abre a janela nativa e descarta o evento', async () => {
    const { result } = renderHook(() => useInstalarApp())
    const { prompt } = dispararEvento()
    await act(() => result.current.instalar())
    expect(prompt).toHaveBeenCalledOnce()
    expect(result.current.modo).not.toBe('botao')
  })

  it('dispensar() grava a marca e esconde', () => {
    const { result } = renderHook(() => useInstalarApp())
    dispararEvento()
    act(() => result.current.dispensar())
    expect(result.current.modo).toBe('nenhum')
    expect(localStorage.getItem('pwa-instalar-dispensado')).not.toBeNull()
  })

  it('com a marca já gravada, não oferece', () => {
    localStorage.setItem('pwa-instalar-dispensado', '1')
    const { result } = renderHook(() => useInstalarApp())
    dispararEvento()
    expect(result.current.modo).toBe('nenhum')
  })

  it('já instalado (standalone), não oferece', () => {
    dispositivo({ standalone: true })
    const { result } = renderHook(() => useInstalarApp())
    dispararEvento()
    expect(result.current.modo).toBe('nenhum')
  })

  it('appinstalled: some de vez (não volta como instrução manual)', () => {
    const { result } = renderHook(() => useInstalarApp())
    dispararEvento()
    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(result.current.modo).toBe('nenhum')
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
    expect(result.current.modo).toBe('botao')
    act(() => result.current.dispensar())
    expect(result.current.modo).toBe('nenhum')
  })
})
