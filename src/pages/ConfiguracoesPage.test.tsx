import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SessaoContext } from '@/hooks/sessaoContext'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarWorkspaceAtual: vi.fn(),
  buscarMembros: vi.fn(),
  atualizarNomePerfil: vi.fn(),
}))

import * as servico from '@/services/boards'
import ConfiguracoesPage from './ConfiguracoesPage'

const SESSAO = { usuario: { id: 'u1', email: 'ana@x.com' }, carregando: false }

function renderizar() {
  const { wrapper: QueryWrapper } = criarWrapper()
  render(
    <SessaoContext.Provider value={SESSAO}>
      <QueryWrapper>
        <MemoryRouter>
          <ConfiguracoesPage />
        </MemoryRouter>
      </QueryWrapper>
    </SessaoContext.Provider>,
  )
}

describe('ConfiguracoesPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(servico.buscarWorkspaceAtual).mockResolvedValue({ id: 'w1', name: 'Meu Workspace' })
    vi.mocked(servico.buscarMembros).mockResolvedValue([
      { id: 'u1', full_name: 'Ana Lima', avatar_url: null },
      { id: 'u2', full_name: 'Beto Souza', avatar_url: null },
    ])
  })

  it('mostra o nome atual da pessoa (não o de outro membro) e o e-mail só de leitura', async () => {
    renderizar()
    expect(await screen.findByLabelText('Nome de exibição')).toHaveValue('Ana Lima')
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@x.com')
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('readonly')
  })

  it('nome vazio não vai ao servidor e explica o problema', async () => {
    const user = userEvent.setup()
    renderizar()
    await user.clear(await screen.findByLabelText('Nome de exibição'))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('O nome não pode ficar vazio.')).toBeInTheDocument()
    expect(servico.atualizarNomePerfil).not.toHaveBeenCalled()
  })

  it('salva o nome sem espaços nas pontas e confirma', async () => {
    vi.mocked(servico.atualizarNomePerfil).mockResolvedValue({ id: 'u1', full_name: 'Ana Souza', avatar_url: null })
    const user = userEvent.setup()
    renderizar()
    const campo = await screen.findByLabelText('Nome de exibição')
    await user.clear(campo)
    await user.type(campo, '  Ana Souza  ')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Nome atualizado.')
    expect(servico.atualizarNomePerfil).toHaveBeenCalledWith('u1', 'Ana Souza')
  })

  it('mostra o erro do servidor', async () => {
    vi.mocked(servico.atualizarNomePerfil).mockRejectedValue(new Error('Você não tem permissão para isso.'))
    const user = userEvent.setup()
    renderizar()
    await screen.findByLabelText('Nome de exibição')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Você não tem permissão para isso.')
  })

  it('editar de novo apaga a confirmação anterior', async () => {
    vi.mocked(servico.atualizarNomePerfil).mockResolvedValue({ id: 'u1', full_name: 'Ana Lima', avatar_url: null })
    const user = userEvent.setup()
    renderizar()
    await screen.findByLabelText('Nome de exibição')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    await screen.findByText('Nome atualizado.')

    await user.type(screen.getByLabelText('Nome de exibição'), 'x')
    expect(screen.queryByText('Nome atualizado.')).not.toBeInTheDocument()
  })

  it('erro ao carregar o perfil vira estado de erro com nova tentativa', async () => {
    vi.mocked(servico.buscarMembros).mockRejectedValue(new Error('Falhou'))
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Falhou')
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('erro ao achar o workspace não deixa a tela carregando para sempre', async () => {
    vi.mocked(servico.buscarWorkspaceAtual).mockRejectedValue(new Error('Sem workspace'))
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem workspace')
  })
})
