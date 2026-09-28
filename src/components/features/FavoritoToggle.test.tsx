import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarFavoritos: vi.fn(),
  favoritar: vi.fn(),
  desfavoritar: vi.fn(),
}))

import * as servico from '@/services/boards'
import { FavoritoToggle } from './FavoritoToggle'

function renderizar() {
  const { wrapper: QueryWrapper } = criarWrapper()
  render(
    <QueryWrapper>
      <FavoritoToggle boardId="b1" nome="Sprint Alpha" />
    </QueryWrapper>,
  )
}

async function botaoPronto() {
  const botao = await screen.findByRole('button', { name: 'Favoritar Sprint Alpha' })
  await vi.waitFor(() => expect(botao).toBeEnabled())
  return botao
}

describe('FavoritoToggle', () => {
  beforeEach(() => vi.resetAllMocks())

  it('fora dos favoritos: aria-pressed=false; clique favorita', async () => {
    // 1ª leitura: vazio. Depois do clique o refetch já devolve com o b1.
    vi.mocked(servico.buscarFavoritos).mockResolvedValueOnce([]).mockResolvedValue(['b1'])
    vi.mocked(servico.favoritar).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderizar()

    const botao = await botaoPronto()
    expect(botao).toHaveAttribute('aria-pressed', 'false')

    await user.click(botao)

    expect(botao).toHaveAttribute('aria-pressed', 'true')
    expect(servico.favoritar).toHaveBeenCalledWith('b1')
  })

  it('já favoritado: aria-pressed=true; clique desfavorita', async () => {
    vi.mocked(servico.buscarFavoritos).mockResolvedValueOnce(['b1']).mockResolvedValue([])
    vi.mocked(servico.desfavoritar).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderizar()

    const botao = await botaoPronto()
    await vi.waitFor(() => expect(botao).toHaveAttribute('aria-pressed', 'true'))

    await user.click(botao)

    expect(botao).toHaveAttribute('aria-pressed', 'false')
    expect(servico.desfavoritar).toHaveBeenCalledWith('b1')
  })

  it('servidor recusa: a estrela volta e o erro é anunciado', async () => {
    vi.mocked(servico.buscarFavoritos).mockResolvedValue([])
    vi.mocked(servico.favoritar).mockRejectedValue(new Error('500'))
    const user = userEvent.setup()
    renderizar()

    await user.click(await botaoPronto())

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível atualizar o favorito de Sprint Alpha.')
    expect(screen.getByRole('button', { name: 'Favoritar Sprint Alpha' })).toHaveAttribute('aria-pressed', 'false')
  })
})
