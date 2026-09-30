import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/auth', () => ({
  entrar: vi.fn(),
  cadastrar: vi.fn(),
}))
vi.mock('@/hooks/useSessao', () => ({ useSessao: vi.fn() }))

import * as servico from '@/services/auth'
import { useSessao } from '@/hooks/useSessao'
import LoginPage from './LoginPage'

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<span>pagina inicial</span>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useSessao).mockReturnValue({ usuario: null, carregando: false })
  })

  it('o formulário fica dentro do landmark main (a rota /login está fora do AppShell)', () => {
    renderPagina()
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1, name: 'Entrar' }))
  })

  it('quem já tem sessão é redirecionado para / sem ver o formulário de novo', async () => {
    vi.mocked(useSessao).mockReturnValue({ usuario: { id: 'u1', email: 'a@x.com' }, carregando: false })
    renderPagina()

    await waitFor(() => expect(screen.getByText('pagina inicial')).toBeInTheDocument())
  })

  it('modo entrar: submete e-mail/senha e navega para / no sucesso', async () => {
    vi.mocked(servico.entrar).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderPagina()

    await user.type(screen.getByLabelText('E-mail'), 'a@x.com')
    await user.type(screen.getByLabelText('Senha'), 'senha123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(servico.entrar).toHaveBeenCalledWith('a@x.com', 'senha123')
    await waitFor(() => expect(screen.getByText('pagina inicial')).toBeInTheDocument())
  })

  it('erro de login aparece num alerta, sem navegar (F0.2 — mensagem genérica)', async () => {
    vi.mocked(servico.entrar).mockRejectedValue(new Error('E-mail ou senha inválidos.'))
    const user = userEvent.setup()
    renderPagina()

    await user.type(screen.getByLabelText('E-mail'), 'a@x.com')
    await user.type(screen.getByLabelText('Senha'), 'errada1')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.')
    expect(screen.queryByText('pagina inicial')).not.toBeInTheDocument()
  })

  it('botão desabilita durante o envio', async () => {
    let liberar!: () => void
    vi.mocked(servico.entrar).mockReturnValue(
      new Promise((r) => {
        liberar = () => r(undefined)
      }),
    )
    const user = userEvent.setup()
    renderPagina()

    await user.type(screen.getByLabelText('E-mail'), 'a@x.com')
    await user.type(screen.getByLabelText('Senha'), 'senha123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled()
    liberar()
    await waitFor(() => expect(screen.getByText('pagina inicial')).toBeInTheDocument())
  })

  it('alterna para o modo cadastrar, exige nome e chama o serviço certo', async () => {
    vi.mocked(servico.cadastrar).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderPagina()

    await user.click(screen.getByRole('button', { name: /cadastre-se/i }))
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Nome'), 'Ana')
    await user.type(screen.getByLabelText('E-mail'), 'a@x.com')
    await user.type(screen.getByLabelText('Senha'), 'senha123')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(servico.cadastrar).toHaveBeenCalledWith('a@x.com', 'senha123', 'Ana')
    await waitFor(() => expect(screen.getByText('pagina inicial')).toBeInTheDocument())
  })
})
