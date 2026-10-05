import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErroDeDados } from '@/services/erros'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({ moverBoard: vi.fn() }))

import * as servico from '@/services/boards'
import { MoverBoardDialog } from './MoverBoardDialog'

const BOARD = { id: 'b1', name: 'Sprint Alpha' }
const DESTINOS = [
  { id: 'w2', name: 'Marketing' },
  { id: 'w3', name: 'Vendas' },
]

function renderizar(destinos = DESTINOS) {
  const aoFechar = vi.fn()
  const { wrapper: QueryWrapper } = criarWrapper()
  render(
    <QueryWrapper>
      <MoverBoardDialog board={BOARD} destinos={destinos} aoFechar={aoFechar} />
    </QueryWrapper>,
  )
  return aoFechar
}

describe('MoverBoardDialog', () => {
  beforeEach(() => vi.resetAllMocks())

  it('move para o workspace escolhido e fecha', async () => {
    vi.mocked(servico.moverBoard).mockResolvedValue(undefined)
    const user = userEvent.setup()
    const aoFechar = renderizar()

    await user.selectOptions(screen.getByLabelText('Workspace de destino'), 'Vendas')
    await user.click(screen.getByRole('button', { name: 'Mover painel' }))

    expect(servico.moverBoard).toHaveBeenCalledWith('b1', 'w3')
    await vi.waitFor(() => expect(aoFechar).toHaveBeenCalled())
  })

  it('erro do banco aparece no diálogo e ele não fecha', async () => {
    vi.mocked(servico.moverBoard).mockRejectedValue(new ErroDeDados('Você não tem permissão para isso.'))
    const user = userEvent.setup()
    const aoFechar = renderizar()

    await user.click(screen.getByRole('button', { name: 'Mover painel' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Você não tem permissão para isso.')
    expect(aoFechar).not.toHaveBeenCalled()
  })

  it('sem outro workspace, explica em vez de oferecer um destino vazio', () => {
    renderizar([])

    expect(screen.getByText(/crie outro workspace/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mover painel' })).not.toBeInTheDocument()
  })
})
