import { render, screen, waitFor } from '@testing-library/react'
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
  buscarWorkspaces: vi.fn(),
  moverBoard: vi.fn(),
}))

import * as servico from '@/services/boards'
import PaineisPage from './PaineisPage'

const BOARDS = [
  { id: 'b1', name: 'Sprint Alpha', created_at: '2026-09-01T10:00:00Z', workspace_id: 'w1' },
  { id: 'b2', name: 'Roadmap', created_at: '2026-09-10T10:00:00Z', workspace_id: 'w1' },
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
    vi.mocked(servico.buscarWorkspaceAtual).mockResolvedValue({ id: 'w1', name: 'Meu Workspace', owner_id: 'u1', souDono: true })
    vi.mocked(servico.buscarWorkspaces).mockResolvedValue([
      { id: 'w1', name: 'Meu Workspace', owner_id: 'u1' },
      { id: 'w2', name: 'Marketing', owner_id: 'u1' },
    ])
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

  it('mostra só os painéis do workspace aberto e diz qual é', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue([
      ...BOARDS,
      { id: 'b9', name: 'De outro workspace', created_at: '', workspace_id: 'w2' },
    ])
    renderizar()
    expect(await screen.findByRole('link', { name: /Sprint Alpha/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /De outro workspace/ })).not.toBeInTheDocument()
    expect(screen.getByText('Meu Workspace')).toBeInTheDocument()
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

  it('convidado (não é dono do workspace) não vê "Excluir" — só o dono exclui painéis', async () => {
    vi.mocked(servico.buscarWorkspaceAtual).mockResolvedValue({ id: 'w1', name: 'Do Pino', owner_id: 'u9', souDono: false })
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    const user = userEvent.setup()
    renderizar()
    await user.click(await screen.findByRole('button', { name: 'Ações de Sprint Alpha' }))
    expect(screen.getByRole('menuitem', { name: 'Renomear' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Excluir' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Mover para outro workspace' })).not.toBeInTheDocument()
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

  it('"Mover para outro workspace" no card abre o diálogo com os outros workspaces e move', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    vi.mocked(servico.moverBoard).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Ações de Roadmap' }))
    await user.click(screen.getByRole('menuitem', { name: 'Mover para outro workspace' }))

    await screen.findByRole('dialog', { name: 'Mover painel' })
    // O workspace de onde o painel sai não é destino.
    const destino = await screen.findByRole('combobox', { name: 'Workspace de destino' })
    await waitFor(() => expect(screen.getByRole('option', { name: 'Marketing' })).toBeInTheDocument())
    expect(screen.queryByRole('option', { name: 'Meu Workspace' })).not.toBeInTheDocument()

    await user.selectOptions(destino, 'Marketing')
    await user.click(screen.getByRole('button', { name: 'Mover painel' }))
    expect(servico.moverBoard).toHaveBeenCalledWith('b2', 'w2')
  })

  it('depois de excluir, o foco vai pro título da página — o botão de origem sumiu com o card', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValueOnce(BOARDS).mockResolvedValue([BOARDS[0]])
    vi.mocked(servico.removerBoard).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Ações de Roadmap' }))
    await user.click(screen.getByRole('menuitem', { name: 'Excluir' }))
    await user.type(await screen.findByLabelText('Digite "Roadmap" para confirmar'), 'Roadmap')
    await user.click(screen.getByRole('button', { name: 'Excluir painel' }))

    await waitFor(() => expect(screen.queryByRole('link', { name: /Roadmap/ })).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Meus Painéis' })).toHaveFocus())
  })

  it('cancelar a exclusão devolve o foco ao "⋮" de origem, não ao título', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue(BOARDS)
    const user = userEvent.setup()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Ações de Roadmap' }))
    await user.click(screen.getByRole('menuitem', { name: 'Excluir' }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Ações de Roadmap' })).toHaveFocus())
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
