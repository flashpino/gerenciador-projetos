import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SessaoContext } from '@/hooks/sessaoContext'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarWorkspaces: vi.fn(),
  buscarWorkspaceAtual: vi.fn(),
  criarWorkspace: vi.fn(),
  renomearWorkspace: vi.fn(),
  excluirWorkspace: vi.fn(),
  buscarMembros: vi.fn().mockResolvedValue([]),
}))

import * as servico from '@/services/boards'
import WorkspacesPage from './WorkspacesPage'

const SESSAO = { usuario: { id: 'u1', email: 'pino@x.dev' }, carregando: false }
const LISTA = [
  { id: 'w1', name: 'Meu Workspace', owner_id: 'u1' },
  { id: 'w2', name: 'Clientes', owner_id: 'u1' },
  { id: 'w3', name: 'Do Beto', owner_id: 'u9' },
]

function renderizar() {
  const { wrapper: QueryWrapper } = criarWrapper()
  render(
    <SessaoContext.Provider value={SESSAO}>
      <QueryWrapper>
        <MemoryRouter initialEntries={['/workspaces']}>
          <Routes>
            <Route path="/workspaces" element={<WorkspacesPage />} />
            <Route path="/paineis" element={<p>meus painéis</p>} />
          </Routes>
        </MemoryRouter>
      </QueryWrapper>
    </SessaoContext.Provider>,
  )
}

const linha = async (nome: string) => (await screen.findByText(nome)).closest('li') as HTMLElement

describe('WorkspacesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(servico.buscarWorkspaces).mockResolvedValue(LISTA)
    vi.mocked(servico.buscarWorkspaceAtual).mockResolvedValue(LISTA[0]!)
  })

  it('lista os workspaces e diz de quais a pessoa é dona ou convidada', async () => {
    renderizar()
    expect(within(await linha('Clientes')).getByText('Seu')).toBeInTheDocument()
    expect(within(await linha('Do Beto')).getByText('Convidado')).toBeInTheDocument()
  })

  it('só o dono vê Renomear e Excluir', async () => {
    renderizar()
    expect(within(await linha('Clientes')).getByRole('button', { name: 'Excluir Clientes' })).toBeInTheDocument()
    const convidado = await linha('Do Beto')
    expect(within(convidado).queryByRole('button', { name: /^Renomear/ })).not.toBeInTheDocument()
    expect(within(convidado).queryByRole('button', { name: /^Excluir/ })).not.toBeInTheDocument()
  })

  it('Abrir torna o workspace o atual e leva aos painéis dele', async () => {
    const user = userEvent.setup()
    renderizar()
    await user.click(within(await linha('Clientes')).getByRole('button', { name: 'Abrir Clientes' }))
    expect(localStorage.getItem('workspaceAtualId')).toBe('w2')
    expect(await screen.findByText('meus painéis')).toBeInTheDocument()
  })

  it('excluir confirma digitando o nome e avisa que apaga os painéis', async () => {
    vi.mocked(servico.excluirWorkspace).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderizar()

    await user.click(within(await linha('Clientes')).getByRole('button', { name: 'Excluir Clientes' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Excluir workspace' })
    expect(within(dialogo).getByText(/painéis/)).toBeInTheDocument()
    const botao = within(dialogo).getByRole('button', { name: 'Excluir workspace' })
    expect(botao).toBeDisabled()
    await user.type(within(dialogo).getByLabelText('Digite "Clientes" para confirmar'), 'Clientes')
    await user.click(botao)

    await vi.waitFor(() => expect(servico.excluirWorkspace).toHaveBeenCalledWith('w2'))
  })

  it('não dá para excluir o único workspace (sem nenhum, não há onde criar painel)', async () => {
    vi.mocked(servico.buscarWorkspaces).mockResolvedValue([LISTA[0]!])
    renderizar()
    expect(within(await linha('Meu Workspace')).queryByRole('button', { name: /^Excluir/ })).not.toBeInTheDocument()
  })

  it('Novo workspace abre o formulário', async () => {
    vi.mocked(servico.criarWorkspace).mockResolvedValue({ id: 'w9', name: 'Agência', owner_id: 'u1' })
    const user = userEvent.setup()
    renderizar()
    await user.click(await screen.findByRole('button', { name: 'Novo workspace' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Novo workspace' })
    await user.type(within(dialogo).getByLabelText('Nome do workspace'), 'Agência')
    await user.click(within(dialogo).getByRole('button', { name: 'Criar workspace' }))
    await vi.waitFor(() => expect(servico.criarWorkspace).toHaveBeenCalledWith('Agência'))
  })
})
