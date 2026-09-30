import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SessaoContext, type SessaoContextValor } from '@/hooks/sessaoContext'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/usuarios', () => ({
  listarUsuarios: vi.fn(),
  criarUsuario: vi.fn(),
  atualizarUsuario: vi.fn(),
  excluirUsuario: vi.fn(),
}))

import * as servico from '@/services/usuarios'
import UsuariosPage from './UsuariosPage'

const MASTER: SessaoContextValor = { usuario: { id: 'u1', email: 'flashpino@hotmail.com', master: true }, carregando: false }
const COMUM: SessaoContextValor = { usuario: { id: 'u2', email: 'beto@x.dev' }, carregando: false }

const CONTAS = [
  { id: 'u1', email: 'flashpino@hotmail.com', nome: 'Anderson', criadoEm: '2026-09-01T10:00:00Z', ultimoAcesso: '2026-09-30T09:00:00Z', master: true },
  { id: 'u2', email: 'beto@x.dev', nome: 'Beto Souza', criadoEm: '2026-09-10T10:00:00Z', ultimoAcesso: null, master: false },
]

function renderizar(sessao: SessaoContextValor = MASTER) {
  const { wrapper: QueryWrapper } = criarWrapper()
  render(
    <SessaoContext.Provider value={sessao}>
      <QueryWrapper>
        <MemoryRouter>
          <UsuariosPage />
        </MemoryRouter>
      </QueryWrapper>
    </SessaoContext.Provider>,
  )
}

const linha = (email: string) => screen.getByText(email).closest('li') as HTMLElement

describe('UsuariosPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(servico.listarUsuarios).mockResolvedValue(CONTAS)
  })

  it('quem não é master não vê contas nem chega a pedir a lista ao servidor', () => {
    renderizar(COMUM)
    expect(screen.getByText('Só o administrador pode gerenciar usuários.')).toBeInTheDocument()
    expect(servico.listarUsuarios).not.toHaveBeenCalled()
  })

  it('o master vê todas as contas, com nome, e-mail e a marca de administrador', async () => {
    renderizar()
    expect(await screen.findByText('beto@x.dev')).toBeInTheDocument()
    expect(within(linha('flashpino@hotmail.com')).getByText('Master')).toBeInTheDocument()
    expect(within(linha('beto@x.dev')).getByText('Beto Souza')).toBeInTheDocument()
  })

  it('cadastrar: nome, e-mail e senha provisória', async () => {
    vi.mocked(servico.criarUsuario).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Novo usuário' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Novo usuário' })
    await user.type(within(dialogo).getByLabelText('Nome'), 'Carla Dias')
    await user.type(within(dialogo).getByLabelText('E-mail'), 'carla@x.dev')
    await user.type(within(dialogo).getByLabelText('Senha provisória'), 'provisoria1')
    await user.click(within(dialogo).getByRole('button', { name: 'Cadastrar' }))

    await vi.waitFor(() =>
      expect(servico.criarUsuario).toHaveBeenCalledWith({ nome: 'Carla Dias', email: 'carla@x.dev', senha: 'provisoria1' }),
    )
  })

  it('editar: vem preenchido; senha em branco não é enviada (não troca)', async () => {
    vi.mocked(servico.atualizarUsuario).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderizar()

    await user.click(within(await vi.waitFor(() => linha('beto@x.dev'))).getByRole('button', { name: 'Editar Beto Souza' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Editar usuário' })
    const nome = within(dialogo).getByLabelText('Nome')
    expect(nome).toHaveValue('Beto Souza')
    expect(within(dialogo).getByLabelText('E-mail')).toHaveValue('beto@x.dev')
    await user.clear(nome)
    await user.type(nome, 'Roberto Souza')
    await user.click(within(dialogo).getByRole('button', { name: 'Salvar' }))

    await vi.waitFor(() =>
      expect(servico.atualizarUsuario).toHaveBeenCalledWith({ id: 'u2', nome: 'Roberto Souza', email: 'beto@x.dev' }),
    )
  })

  it('excluir: explica o que se perde e só libera depois de digitar o e-mail da conta', async () => {
    vi.mocked(servico.excluirUsuario).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderizar()

    await user.click(within(await vi.waitFor(() => linha('beto@x.dev'))).getByRole('button', { name: 'Excluir Beto Souza' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Excluir usuário' })
    expect(within(dialogo).getByText(/comentários/)).toBeInTheDocument()
    const botao = within(dialogo).getByRole('button', { name: 'Excluir conta' })
    expect(botao).toBeDisabled()

    await user.type(within(dialogo).getByLabelText('Digite "beto@x.dev" para confirmar'), 'beto@x.dev')
    await user.click(botao)

    await vi.waitFor(() => expect(servico.excluirUsuario).toHaveBeenCalledWith('u2', 'beto@x.dev'))
  })

  it('o master não tem botão de excluir a própria conta', async () => {
    renderizar()
    await screen.findByText('beto@x.dev')
    expect(within(linha('flashpino@hotmail.com')).queryByRole('button', { name: /^Excluir/ })).not.toBeInTheDocument()
  })

  it('erro do servidor aparece como alerta', async () => {
    vi.mocked(servico.listarUsuarios).mockRejectedValue(new Error('Só o administrador pode fazer isso.'))
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Só o administrador pode fazer isso.')
  })
})
