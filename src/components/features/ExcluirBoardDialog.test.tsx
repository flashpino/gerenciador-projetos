import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({ removerBoard: vi.fn() }))

import * as servico from '@/services/boards'
import { ExcluirBoardDialog } from './ExcluirBoardDialog'

const BOARD = { id: 'b1', name: 'Sprint Alpha' }
const ROTULO = 'Digite "Sprint Alpha" para confirmar'

function renderizar(board: typeof BOARD | null, ehOUltimo = false) {
  const aoFechar = vi.fn()
  const { wrapper: QueryWrapper } = criarWrapper()
  render(
    <QueryWrapper>
      <ExcluirBoardDialog board={board} aoFechar={aoFechar} ehOUltimo={ehOUltimo} />
    </QueryWrapper>,
  )
  return aoFechar
}

describe('ExcluirBoardDialog', () => {
  beforeEach(() => vi.resetAllMocks())

  it('"Excluir painel" fica desabilitado até digitar o nome exato do board', async () => {
    const user = userEvent.setup()
    renderizar(BOARD)

    const botao = screen.getByRole('button', { name: 'Excluir painel' })
    expect(botao).toBeDisabled()

    await user.type(screen.getByLabelText(ROTULO), 'Sprint Alph')
    expect(botao).toBeDisabled()

    await user.type(screen.getByLabelText(ROTULO), 'a')
    expect(botao).toBeEnabled()
  })

  it('confirmar exclui e fecha', async () => {
    vi.mocked(servico.removerBoard).mockResolvedValue(undefined)
    const user = userEvent.setup()
    const aoFechar = renderizar(BOARD)

    await user.type(screen.getByLabelText(ROTULO), 'Sprint Alpha')
    await user.click(screen.getByRole('button', { name: 'Excluir painel' }))

    expect(servico.removerBoard).toHaveBeenCalledWith('b1')
    await vi.waitFor(() => expect(aoFechar).toHaveBeenCalled())
  })

  it('último board do workspace: não oferece excluir e explica por quê', () => {
    renderizar(BOARD, true)

    expect(screen.queryByRole('button', { name: 'Excluir painel' })).not.toBeInTheDocument()
    expect(screen.getByText(/único painel do workspace/)).toBeInTheDocument()
  })

  it('sem board selecionado, o diálogo fica fechado', () => {
    renderizar(null)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
