import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarFavoritos: vi.fn(),
  favoritar: vi.fn(),
  desfavoritar: vi.fn(),
  buscarBoards: vi.fn(),
  buscarWorkspaceAtual: vi.fn(),
  criarBoard: vi.fn(),
  renomearBoard: vi.fn(),
  removerBoard: vi.fn(),
}))

import * as servico from '@/services/boards'
import PaineisPage from './PaineisPage'

const BOARDS = [
  { id: 'b1', name: 'Sprint Alpha', created_at: '2026-09-01T10:00:00Z' },
  { id: 'b2', name: 'Roadmap', created_at: '2026-09-10T10:00:00Z' },
]

function renderizar() {
  const { wrapper: QueryWrapper } = criarWrapper()
  return render(
    <QueryWrapper>
      <MemoryRouter>
        <PaineisPage />
      </MemoryRouter>
    </QueryWrapper>,
  )
}

describe('PaineisPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(servico.buscarFavoritos).mockResolvedValue([])
    vi.mocked(servico.buscarWorkspaceAtual).mockResolvedValue({ id: 'w1', name: 'Meu Workspace' })
  })

  it('carregando', () => {
    vi.mocked(servico.buscarBoards).mockImplementation(() => new Promise(() => {}))
    renderizar()
    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
  })

  it('erro', async () => {
    vi.mocked(servico.buscarBoards).mockRejectedValue(new Error('Sem conexão.'))
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão.')
  })

  it('vazio oferece criar o primeiro painel', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue([])
    renderizar()
    expect(await screen.findByText('Nenhum painel ainda')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar painel' })).toBeInTheDocument()
  })

  it('lista um link por board', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    renderizar()
    expect(await screen.findByRole('link', { name: /Sprint Alpha/ })).toHaveAttribute('href', '/boards/b1')
    expect(screen.getByRole('link', { name: /Roadmap/ })).toHaveAttribute('href', '/boards/b2')
  })

  it('"Novo Painel" abre o formulário de criação', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    const user = userEvent.setup()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Novo Painel' }))
    expect(await screen.findByRole('dialog', { name: 'Novo painel' })).toBeInTheDocument()
  })

  it('"Renomear" no card abre o formulário com o nome do board', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    const user = userEvent.setup()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Ações de Roadmap' }))
    await user.click(screen.getByRole('menuitem', { name: 'Renomear' }))

    await screen.findByRole('dialog', { name: 'Renomear painel' })
    expect(screen.getByLabelText('Nome do painel')).toHaveValue('Roadmap')
  })

  it('"Excluir" no card abre a confirmação daquele board', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    const user = userEvent.setup()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Ações de Roadmap' }))
    await user.click(screen.getByRole('menuitem', { name: 'Excluir' }))

    await screen.findByRole('dialog', { name: 'Excluir painel' })
    expect(screen.getByLabelText('Digite "Roadmap" para confirmar')).toBeInTheDocument()
  })

  it('variante favoritos: título próprio e só os boards favoritados', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    vi.mocked(servico.buscarFavoritos).mockResolvedValue(['b2'])
    const { wrapper: QueryWrapper } = criarWrapper()
    render(
      <QueryWrapper>
        <MemoryRouter>
          <PaineisPage filtro="favoritos" />
        </MemoryRouter>
      </QueryWrapper>,
    )

    expect(screen.getByRole('heading', { name: 'Favoritos' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Roadmap/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Sprint Alpha/ })).not.toBeInTheDocument()
  })

  it('variante favoritos sem nenhum favorito: estado vazio próprio, com link pra Meus Painéis', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    vi.mocked(servico.buscarFavoritos).mockResolvedValue([])
    const { wrapper: QueryWrapper } = criarWrapper()
    render(
      <QueryWrapper>
        <MemoryRouter>
          <PaineisPage filtro="favoritos" />
        </MemoryRouter>
      </QueryWrapper>,
    )

    expect(await screen.findByText('Nenhum favorito ainda')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver Meus Painéis' })).toHaveAttribute('href', '/paineis')
  })
})
