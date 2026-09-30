import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarBoard: vi.fn(),
  buscarFavoritos: vi.fn(),
  favoritar: vi.fn(),
  desfavoritar: vi.fn(),
  buscarMembros: vi.fn(),
}))

import * as servico from '@/services/boards'
import { BoardShell } from './BoardShell'

function renderizar(rota = '/boards/b1') {
  const { wrapper: QueryWrapper } = criarWrapper()
  return render(
    <QueryWrapper>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/boards/:boardId/*" element={<BoardShell titulo="Sprint Alpha">conteudo</BoardShell>} />
        </Routes>
      </MemoryRouter>
    </QueryWrapper>,
  )
}

describe('BoardShell', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
    vi.mocked(servico.buscarFavoritos).mockResolvedValue([])
    vi.mocked(servico.buscarMembros).mockResolvedValue([{ id: 'u1', full_name: 'Ana Lima', avatar_url: null }])
    vi.mocked(servico.buscarBoard).mockResolvedValue({ id: 'b1', name: 'Sprint Alpha', workspace_id: 'w1', owner_id: 'u1' })
  })

  it('abas apontam para as views DESTE board', () => {
    renderizar()
    expect(screen.getByRole('link', { name: 'Tabela Principal' })).toHaveAttribute('href', '/boards/b1')
    expect(screen.getByRole('link', { name: 'Kanban' })).toHaveAttribute('href', '/boards/b1/kanban')
    expect(screen.getByRole('link', { name: 'Gantt' })).toHaveAttribute('href', '/boards/b1/gantt')
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/boards/b1/dashboard')
  })

  it('marca a aba da view atual', () => {
    renderizar('/boards/b1/kanban')
    expect(screen.getByRole('link', { name: 'Kanban' })).toHaveAttribute('aria-current', 'page')
  })

  it('não cria um segundo landmark main — o do AppShell já envolve a rota', () => {
    renderizar()
    expect(screen.queryByRole('main')).not.toBeInTheDocument()
  })

  it('lembra o board visitado, pra raiz / voltar nele', () => {
    renderizar()
    expect(localStorage.getItem('ultimoBoardId')).toBe('b1')
  })

  it('estrela de favorito funcional, com o nome do board', async () => {
    renderizar()
    const estrela = await screen.findByRole('button', { name: 'Favoritar Sprint Alpha' })
    expect(estrela).toHaveAttribute('aria-pressed', 'false')
  })

  it('"Novo item" ainda não existe e segue desabilitado, com o motivo', () => {
    renderizar()
    expect(screen.getByRole('button', { name: 'Novo item — em breve' })).toBeDisabled()
  })

  describe('busca', () => {
    it('é um campo de busca com nome acessível, habilitado', () => {
      renderizar()
      expect(screen.getByRole('searchbox', { name: 'Buscar neste quadro' })).toBeEnabled()
    })

    it('começa com o texto que já está na URL', () => {
      renderizar('/boards/b1?q=login')
      expect(screen.getByRole('searchbox', { name: 'Buscar neste quadro' })).toHaveValue('login')
    })

    it('digitar vai para a URL e as abas levam a busca junto para a outra visão', async () => {
      renderizar()
      await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar neste quadro' }), 'api')
      expect(screen.getByRole('searchbox', { name: 'Buscar neste quadro' })).toHaveValue('api')
      expect(screen.getByRole('link', { name: 'Kanban' })).toHaveAttribute('href', '/boards/b1/kanban?q=api')
      expect(screen.getByRole('link', { name: 'Tabela Principal' })).toHaveAttribute('href', '/boards/b1?q=api')
    })
  })

  describe('filtros', () => {
    it('o botão diz quantos filtros estão ativos, no nome acessível', () => {
      renderizar('/boards/b1?status=working,review&prio=high')
      expect(screen.getByRole('button', { name: 'Filtrar, 2 filtros ativos' })).toBeInTheDocument()
    })

    it('singular com um filtro; sem filtro, só "Filtrar"', () => {
      const { unmount } = renderizar('/boards/b1?atrasadas=1')
      expect(screen.getByRole('button', { name: 'Filtrar, 1 filtro ativo' })).toBeInTheDocument()
      unmount()
      renderizar()
      expect(screen.getByRole('button', { name: 'Filtrar' })).toBeInTheDocument()
    })

    it('abre o modal e marcar um status muda a URL (e portanto as abas)', async () => {
      renderizar()
      await userEvent.click(screen.getByRole('button', { name: 'Filtrar' }))
      const modal = await screen.findByRole('dialog', { name: 'Filtrar tarefas' })
      await userEvent.click(within(modal).getByRole('checkbox', { name: 'Travado' }))
      expect(screen.getByRole('link', { name: 'Gantt', hidden: true })).toHaveAttribute('href', '/boards/b1/gantt?status=stuck')
    })
  })

  it('no Dashboard não há busca nem filtro: as métricas são do board inteiro', () => {
    renderizar('/boards/b1/dashboard')
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Filtrar/ })).not.toBeInTheDocument()
  })

  it('"Convidar integrantes" habilita quando o board carrega', async () => {
    renderizar()
    const botao = await screen.findByRole('button', { name: 'Convidar integrantes' })
    await vi.waitFor(() => expect(botao).toBeEnabled())
  })
})
