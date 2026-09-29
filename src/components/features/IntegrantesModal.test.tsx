import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessaoContext } from '@/hooks/sessaoContext'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarMembros: vi.fn(),
  adicionarMembro: vi.fn(),
  removerMembro: vi.fn(),
}))

import * as servico from '@/services/boards'
import { IntegrantesModal } from './IntegrantesModal'

const DONA = { usuario: { id: 'u1', email: 'ana@x.com' }, carregando: false }
const CONVIDADO = { usuario: { id: 'u2', email: 'beto@x.com' }, carregando: false }
const MEMBROS = [
  { id: 'u1', full_name: 'Ana Lima', avatar_url: null },
  { id: 'u2', full_name: 'Beto Souza', avatar_url: null },
]

function renderizar(sessao: typeof DONA) {
  const { wrapper: QueryWrapper } = criarWrapper()
  render(
    <SessaoContext.Provider value={sessao}>
      <QueryWrapper>
        <MemoryRouter initialEntries={['/boards/b1']}>
          <Routes>
            <Route
              path="/boards/:boardId"
              element={<IntegrantesModal aberto aoFechar={vi.fn()} workspaceId="w1" donoId="u1" />}
            />
            <Route path="/paineis" element={<p>meus painéis</p>} />
          </Routes>
        </MemoryRouter>
      </QueryWrapper>
    </SessaoContext.Provider>,
  )
}

describe('IntegrantesModal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(servico.buscarMembros).mockResolvedValue(MEMBROS)
  })

  afterEach(() => vi.restoreAllMocks())

  it('lista os membros do workspace e marca a dona', async () => {
    renderizar(DONA)
    const lista = await screen.findByRole('list', { name: 'Integrantes do workspace' })
    expect(within(lista).getByText('Ana Lima')).toBeInTheDocument()
    expect(within(lista).getByText('Beto Souza')).toBeInTheDocument()
    expect(within(lista).getByText('Dono')).toBeInTheDocument()
    expect(servico.buscarMembros).toHaveBeenCalledWith('w1')
  })

  it('dona adiciona por e-mail e o campo limpa', async () => {
    vi.mocked(servico.adicionarMembro).mockResolvedValue()
    const user = userEvent.setup()
    renderizar(DONA)

    const campo = await screen.findByLabelText('E-mail de quem já tem conta')
    await user.type(campo, 'carla@x.com')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    expect(servico.adicionarMembro).toHaveBeenCalledWith('w1', 'carla@x.com')
    await vi.waitFor(() => expect(campo).toHaveValue(''))
  })

  it('e-mail sem conta mostra o erro em alerta', async () => {
    vi.mocked(servico.adicionarMembro).mockRejectedValue(new Error('Nenhuma conta com esse e-mail.'))
    const user = userEvent.setup()
    renderizar(DONA)

    await user.type(await screen.findByLabelText('E-mail de quem já tem conta'), 'z@x.com')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Nenhuma conta com esse e-mail.')
  })

  it('dona remove outro membro depois de confirmar, e não tem botão para remover a si mesma', async () => {
    vi.mocked(servico.removerMembro).mockResolvedValue()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderizar(DONA)

    await user.click(await screen.findByRole('button', { name: 'Remover Beto Souza' }))

    expect(window.confirm).toHaveBeenCalled()
    expect(servico.removerMembro).toHaveBeenCalledWith('w1', 'u2')
    expect(screen.queryByRole('button', { name: 'Remover Ana Lima' })).not.toBeInTheDocument()
  })

  it('cancelar a confirmação não remove ninguém', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    renderizar(DONA)

    await user.click(await screen.findByRole('button', { name: 'Remover Beto Souza' }))

    expect(servico.removerMembro).not.toHaveBeenCalled()
  })

  it('quem não é dono sai do workspace depois de confirmar e volta para Meus Painéis', async () => {
    vi.mocked(servico.removerMembro).mockResolvedValue()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderizar(CONVIDADO)

    await user.click(await screen.findByRole('button', { name: 'Sair do workspace' }))

    expect(servico.removerMembro).toHaveBeenCalledWith('w1', 'u2')
    expect(await screen.findByText('meus painéis')).toBeInTheDocument()
  })

  it('a dona não tem "Sair do workspace" (o banco também recusaria)', async () => {
    renderizar(DONA)
    await screen.findByRole('list', { name: 'Integrantes do workspace' })
    expect(screen.queryByRole('button', { name: 'Sair do workspace' })).not.toBeInTheDocument()
  })

  it('quem não é dono só vê a lista e o motivo', async () => {
    renderizar(CONVIDADO)
    await screen.findByRole('list', { name: 'Integrantes do workspace' })
    expect(screen.getByText('Só o dono do workspace pode convidar.')).toBeInTheDocument()
    expect(screen.queryByLabelText('E-mail de quem já tem conta')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Remover/ })).not.toBeInTheDocument()
  })

  it('erro de uma ação some quando a outra começa', async () => {
    vi.mocked(servico.adicionarMembro).mockRejectedValue(new Error('Nenhuma conta com esse e-mail.'))
    vi.mocked(servico.removerMembro).mockResolvedValue()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderizar(DONA)

    await user.type(await screen.findByLabelText('E-mail de quem já tem conta'), 'z@x.com')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remover Beto Souza' }))
    await vi.waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('erro ao carregar os membros aparece no StateView', async () => {
    vi.mocked(servico.buscarMembros).mockRejectedValue(new Error('Não foi possível completar a operação. Tente de novo.'))
    renderizar(DONA)
    expect(await screen.findByText('Não foi possível completar a operação. Tente de novo.')).toBeInTheDocument()
  })
})
