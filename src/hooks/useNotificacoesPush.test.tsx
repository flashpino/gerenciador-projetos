import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/push', () => ({ salvarInscricaoPush: vi.fn(), removerInscricaoPush: vi.fn() }))

import * as servico from '@/services/push'
import { useNotificacoesPush } from './useNotificacoesPush'

/** Navegador falso: Notification + service worker + PushManager. */
function montarNavegador({ permissao = 'default', concede = 'granted', inscrito = false } = {}) {
  const inscricao = {
    endpoint: 'https://push/x',
    unsubscribe: vi.fn().mockResolvedValue(true),
    toJSON: () => ({ endpoint: 'https://push/x', keys: { p256dh: 'P', auth: 'A' } }),
  }
  const pushManager = {
    getSubscription: vi.fn().mockResolvedValue(inscrito ? inscricao : null),
    subscribe: vi.fn().mockResolvedValue(inscricao),
  }
  vi.stubGlobal('Notification', { permission: permissao, requestPermission: vi.fn().mockResolvedValue(concede) })
  vi.stubGlobal('PushManager', function PushManager() {})
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve({ pushManager }) } })
  return { pushManager, inscricao }
}

function montar() {
  const { wrapper } = criarWrapper()
  return renderHook(() => useNotificacoesPush(), { wrapper })
}

describe('useNotificacoesPush', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BAAA')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    Reflect.deleteProperty(navigator, 'serviceWorker')
  })

  it('sem inscrição: estado "inativo"', async () => {
    montarNavegador()
    const { result } = montar()
    await waitFor(() => expect(result.current.estado).toBe('inativo'))
  })

  it('já inscrito neste dispositivo: estado "ativo"', async () => {
    montarNavegador({ permissao: 'granted', inscrito: true })
    const { result } = montar()
    await waitFor(() => expect(result.current.estado).toBe('ativo'))
  })

  it('ativar pede permissão, inscreve com a chave pública e salva no servidor', async () => {
    vi.mocked(servico.salvarInscricaoPush).mockResolvedValue(undefined)
    const { pushManager } = montarNavegador()
    const { result } = montar()
    await waitFor(() => expect(result.current.estado).toBe('inativo'))

    await act(() => result.current.ativar())

    expect(Notification.requestPermission).toHaveBeenCalled()
    expect(pushManager.subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }))
    expect(servico.salvarInscricaoPush).toHaveBeenCalledWith({ endpoint: 'https://push/x', keys: { p256dh: 'P', auth: 'A' } })
  })

  it('permissão recusada: não inscreve e fica "negado"', async () => {
    const { pushManager } = montarNavegador({ concede: 'denied' })
    const { result } = montar()
    await waitFor(() => expect(result.current.estado).toBe('inativo'))

    await act(() => result.current.ativar())

    expect(pushManager.subscribe).not.toHaveBeenCalled()
    await waitFor(() => expect(result.current.estado).toBe('negado'))
  })

  it('desativar remove do servidor e cancela no navegador', async () => {
    vi.mocked(servico.removerInscricaoPush).mockResolvedValue(undefined)
    const { inscricao } = montarNavegador({ permissao: 'granted', inscrito: true })
    const { result } = montar()
    await waitFor(() => expect(result.current.estado).toBe('ativo'))

    await act(() => result.current.desativar())

    expect(servico.removerInscricaoPush).toHaveBeenCalledWith('https://push/x')
    expect(inscricao.unsubscribe).toHaveBeenCalled()
  })

  it('navegador sem Push (ex.: iPhone sem o app instalado): "sem-suporte"', async () => {
    const { result } = montar()
    await waitFor(() => expect(result.current.estado).toBe('sem-suporte'))
  })

  it('sem a chave pública configurada: "nao-configurado"', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '')
    montarNavegador()
    const { result } = montar()
    await waitFor(() => expect(result.current.estado).toBe('nao-configurado'))
  })
})
