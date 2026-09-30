import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Profile } from '@/types/domain'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarWorkspaceAtual: vi.fn(),
  buscarMembros: vi.fn(),
  criarBoard: vi.fn(),
  renomearBoard: vi.fn(),
}))
vi.mock('@/services/auth', () => ({ sair: vi.fn() }))
vi.mock('@/hooks/useSessao', () => ({ useSessao: vi.fn() }))

import * as servicoAuth from '@/services/auth'
import * as servico from '@/services/boards'
import { useSessao } from '@/hooks/useSessao'
import { Sidebar } from './Sidebar'

const MEMBROS: Profile[] = [{ id: 'u1', full_name: 'Ana Lima', avatar_url: null }]

function renderizar(rota = '/') {
  const { wrapper: QueryWrapper } = criarWrapper()
  return render(
    <QueryWrapper>
      <MemoryRouter initialEntries={[rota]}>
        <Sidebar />
      </MemoryRouter>
    </QueryWrapper>,
  )
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(servico.buscarWorkspaceAtual).mockResolvedValue({ id: 'w1', name: 'Meu Workspace' })
    vi.mocked(servico.buscarMembros).mockResolvedValue(MEMBROS)
    vi.mocked(useSessao).mockReturnValue({ usuario: { id: 'u1', email: 'a@x.com' }, carregando: false })
  })

  it('marca o item de nav da rota atual com aria-current', async () => {
    renderizar('/favoritos')
    expect(await screen.findByRole('link', { name: 'Favoritos' })).toHaveAttribute('aria-current', 'page')
  })

  it('não marca os outros itens de nav', async () => {
    renderizar('/favoritos')
    await screen.findByRole('link', { name: 'Favoritos' })
    expect(screen.getByRole('link', { name: 'Meus Painéis' })).not.toHaveAttribute('aria-current')
  })

  it('mostra nome e avatar do próprio usuário no rodapé', async () => {
    renderizar()
    // aside (rail/completa) e drawer renderizam o mesmo rodapé em paralelo
    // (o drawer fechado continua montado — mesmo padrão de Modal.test.tsx),
    // e o fallback de iniciais do Avatar soma um <span> sr-only com o nome
    // por cima do rótulo visível — então "Ana Lima" aparece em mais de um
    // nó por design. findAllByText evita falso-negativo por ambiguidade.
    expect((await screen.findAllByText('Ana Lima')).length).toBeGreaterThan(0)
  })

  it('botão Sair chama o serviço de logout', async () => {
    vi.mocked(servicoAuth.sair).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Sair' }))
    expect(servicoAuth.sair).toHaveBeenCalled()
  })

  it('drawer fechado por padrão, abre no gatilho e fecha ao clicar fora', async () => {
    // Não testamos Esc aqui: src/test/setup.ts documenta que o polyfill de
    // <dialog> só reflete o atributo `open` e dispara `close` — fechar com
    // Esc é comportamento nativo do navegador, "verificado manualmente, não
    // aqui" (mesma decisão que Modal.test.tsx já segue, testando clique no
    // backdrop em vez de Esc).
    const user = userEvent.setup()
    renderizar()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }))
    const dialog = await screen.findByRole('dialog')

    fireEvent.click(dialog)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('"Novo Painel" abre o formulário de criação e cria no workspace atual', async () => {
    vi.mocked(servico.criarBoard).mockResolvedValue({ id: 'b9', name: 'Roadmap', created_at: '' })
    const user = userEvent.setup()
    renderizar()

    const botao = await screen.findByRole('button', { name: 'Novo Painel' })
    expect(botao).toBeEnabled()
    await user.click(botao)

    await screen.findByRole('dialog', { name: 'Novo painel' })
    await user.type(screen.getByLabelText('Nome do painel'), 'Roadmap')
    const criar = await screen.findByRole('button', { name: 'Criar painel' })
    await vi.waitFor(() => expect(criar).toBeEnabled())
    await user.click(criar)

    expect(servico.criarBoard).toHaveBeenCalledWith('w1', 'Roadmap')
  })

  it('o item "Usuários" só aparece para o master', async () => {
    renderizar()
    await screen.findByRole('link', { name: 'Favoritos' })
    expect(screen.queryByRole('link', { name: 'Usuários' })).not.toBeInTheDocument()
  })

  it('para o master, "Usuários" leva à administração de contas', async () => {
    vi.mocked(useSessao).mockReturnValue({ usuario: { id: 'u1', email: 'a@x.com', master: true }, carregando: false })
    renderizar()
    expect((await screen.findAllByRole('link', { name: 'Usuários' }))[0]).toHaveAttribute('href', '/usuarios')
  })
})
