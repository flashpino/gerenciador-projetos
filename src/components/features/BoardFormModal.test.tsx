import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarWorkspaceAtual: vi.fn(),
  criarBoard: vi.fn(),
  renomearBoard: vi.fn(),
}))

import * as servico from '@/services/boards'
import { BoardFormModal } from './BoardFormModal'

function renderizar(board: { id: string; name: string } | null, aoFechar = vi.fn()) {
  const { wrapper: QueryWrapper } = criarWrapper()
  render(
    <QueryWrapper>
      <MemoryRouter initialEntries={['/paineis']}>
        <Routes>
          <Route path="/paineis" element={<BoardFormModal aberto aoFechar={aoFechar} board={board} />} />
          <Route path="/boards/:boardId" element={<p>board aberto</p>} />
        </Routes>
      </MemoryRouter>
    </QueryWrapper>,
  )
  return aoFechar
}

// O botão "Criar painel" nasce desabilitado até o workspace carregar.
async function botaoCriarHabilitado() {
  const botao = await screen.findByRole('button', { name: 'Criar painel' })
  await vi.waitFor(() => expect(botao).toBeEnabled())
  return botao
}

describe('BoardFormModal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(servico.buscarWorkspaceAtual).mockResolvedValue({ id: 'w1', name: 'Meu Workspace' })
  })

  it('cria o board no workspace atual e abre o board novo', async () => {
    vi.mocked(servico.criarBoard).mockResolvedValue({ id: 'b9', name: 'Roadmap Q4', created_at: '' })
    const user = userEvent.setup()
    renderizar(null)

    await screen.findByRole('dialog', { name: 'Novo painel' })
    await user.type(screen.getByLabelText('Nome do painel'), 'Roadmap Q4')
    await user.click(await botaoCriarHabilitado())

    expect(servico.criarBoard).toHaveBeenCalledWith('w1', 'Roadmap Q4')
    expect(await screen.findByText('board aberto')).toBeInTheDocument()
  })

  it('nome vazio (só espaços) bloqueia e explica, sem chamar o serviço', async () => {
    const user = userEvent.setup()
    renderizar(null)

    await screen.findByRole('dialog', { name: 'Novo painel' })
    await user.type(screen.getByLabelText('Nome do painel'), '   ')
    await user.click(await botaoCriarHabilitado())

    expect(await screen.findByRole('alert')).toHaveTextContent('O nome não pode ficar vazio.')
    expect(servico.criarBoard).not.toHaveBeenCalled()
  })

  it('renomear vem com o nome atual preenchido e salva o novo', async () => {
    vi.mocked(servico.renomearBoard).mockResolvedValue({ id: 'b1', name: 'Sprint Beta', created_at: '' })
    const user = userEvent.setup()
    const aoFechar = renderizar({ id: 'b1', name: 'Sprint Alpha' })

    await screen.findByRole('dialog', { name: 'Renomear painel' })
    const campo = screen.getByLabelText('Nome do painel')
    expect(campo).toHaveValue('Sprint Alpha')

    await user.clear(campo)
    await user.type(campo, 'Sprint Beta')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(servico.renomearBoard).toHaveBeenCalledWith('b1', 'Sprint Beta')
    await vi.waitFor(() => expect(aoFechar).toHaveBeenCalled())
  })

  it('erro do servidor aparece no formulário, sem fechar', async () => {
    vi.mocked(servico.criarBoard).mockRejectedValue(new Error('Não foi possível salvar.'))
    const user = userEvent.setup()
    const aoFechar = renderizar(null)

    await screen.findByRole('dialog', { name: 'Novo painel' })
    await user.type(screen.getByLabelText('Nome do painel'), 'Roadmap')
    await user.click(await botaoCriarHabilitado())

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar.')
    expect(aoFechar).not.toHaveBeenCalled()
  })
})
