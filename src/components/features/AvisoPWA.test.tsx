import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const updateServiceWorker = vi.fn()
const instalar = vi.fn()
const dispensar = vi.fn()
let needRefresh = false
let podeInstalar = false

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [needRefresh, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker,
  }),
}))
vi.mock('@/hooks/useInstalarApp', () => ({
  useInstalarApp: () => ({ podeInstalar, instalar, dispensar }),
}))

import { AvisoPWA } from './AvisoPWA'

describe('AvisoPWA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    needRefresh = false
    podeInstalar = false
  })

  it('nada pendente, nada aparece', () => {
    const { container } = render(<AvisoPWA />)
    expect(container).toBeEmptyDOMElement()
  })

  it('versão nova: Recarregar aplica o service worker', async () => {
    needRefresh = true
    render(<AvisoPWA />)
    expect(screen.getByRole('status')).toHaveTextContent('Nova versão disponível')
    await userEvent.click(screen.getByRole('button', { name: 'Recarregar' }))
    expect(updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('versão nova: Depois esconde nesta aba', async () => {
    needRefresh = true
    render(<AvisoPWA />)
    await userEvent.click(screen.getByRole('button', { name: 'Depois' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(updateServiceWorker).not.toHaveBeenCalled()
  })

  it('instalação disponível: Instalar e Agora não', async () => {
    podeInstalar = true
    render(<AvisoPWA />)
    expect(screen.getByRole('status')).toHaveTextContent('Instalar o app no seu dispositivo')
    await userEvent.click(screen.getByRole('button', { name: 'Instalar' }))
    expect(instalar).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Agora não' }))
    expect(dispensar).toHaveBeenCalledOnce()
  })

  it('os dois ao mesmo tempo: aparece o de atualizar', () => {
    needRefresh = true
    podeInstalar = true
    render(<AvisoPWA />)
    expect(screen.getByRole('status')).toHaveTextContent('Nova versão disponível')
    expect(screen.queryByRole('button', { name: 'Instalar' })).not.toBeInTheDocument()
  })
})
