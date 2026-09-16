import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/auth', () => ({
  obterSessaoAtual: vi.fn(),
  escutarSessao: vi.fn(),
}))

import * as servico from '@/services/auth'
import { useSessao } from '@/hooks/useSessao'
import { SessaoProvider } from './SessaoProvider'

function Sonda() {
  const { usuario, carregando } = useSessao()
  if (carregando) return <span>carregando</span>
  return <span>{usuario ? `logado:${usuario.email}` : 'deslogado'}</span>
}

describe('SessaoProvider / useSessao', () => {
  beforeEach(() => vi.resetAllMocks())

  it('comeca carregando ate a sessao inicial resolver', async () => {
    let resolver!: (v: { id: string; email: string | null } | null) => void
    vi.mocked(servico.obterSessaoAtual).mockReturnValue(
      new Promise((r) => {
        resolver = r
      }),
    )
    vi.mocked(servico.escutarSessao).mockReturnValue(() => {})

    render(
      <SessaoProvider>
        <Sonda />
      </SessaoProvider>,
    )
    expect(screen.getByText('carregando')).toBeInTheDocument()

    resolver(null)
    await waitFor(() => expect(screen.getByText('deslogado')).toBeInTheDocument())
  })

  it('expoe o usuario quando ha sessao', async () => {
    vi.mocked(servico.obterSessaoAtual).mockResolvedValue({ id: '1', email: 'a@x.com' })
    vi.mocked(servico.escutarSessao).mockReturnValue(() => {})

    render(
      <SessaoProvider>
        <Sonda />
      </SessaoProvider>,
    )
    await waitFor(() => expect(screen.getByText('logado:a@x.com')).toBeInTheDocument())
  })

  it('reage a mudanca de sessao emitida pelo listener (ex.: logout em outra aba)', async () => {
    vi.mocked(servico.obterSessaoAtual).mockResolvedValue({ id: '1', email: 'a@x.com' })
    let emitir!: (u: { id: string; email: string | null } | null) => void
    vi.mocked(servico.escutarSessao).mockImplementation((cb) => {
      emitir = cb
      return () => {}
    })

    render(
      <SessaoProvider>
        <Sonda />
      </SessaoProvider>,
    )
    await waitFor(() => expect(screen.getByText('logado:a@x.com')).toBeInTheDocument())

    emitir(null)
    await waitFor(() => expect(screen.getByText('deslogado')).toBeInTheDocument())
  })

  it('cancela a inscricao ao desmontar', async () => {
    const cancelar = vi.fn()
    vi.mocked(servico.obterSessaoAtual).mockResolvedValue(null)
    vi.mocked(servico.escutarSessao).mockReturnValue(cancelar)

    const { unmount } = render(
      <SessaoProvider>
        <Sonda />
      </SessaoProvider>,
    )
    await waitFor(() => expect(screen.getByText('deslogado')).toBeInTheDocument())

    unmount()
    expect(cancelar).toHaveBeenCalled()
  })

  it('useSessao fora do provider lança erro claro — falha cedo em vez de undefined silencioso', () => {
    const SemProvider = () => {
      useSessao()
      return null
    }
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<SemProvider />)).toThrow('useSessao precisa estar dentro de <SessaoProvider>')
  })
})
