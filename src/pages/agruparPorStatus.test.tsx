import { configure, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessaoContext } from '@/hooks/sessaoContext'
import { criarTarefaFixture as tarefa } from '@/test/fixtures'
import { criarWrapper } from '@/test/query'
import type { GroupComTarefas } from '@/types/domain'

/**
 * Tabela agrupada por status (alternador "Agrupar por: Grupo | Status"): a mesma tarefa que o kanban
 * põe em "Em andamento" deixa de aparecer sob o grupo "A fazer". BoardPage REAL, só o serviço mockado.
 */
vi.mock('@/services/boards', () => ({
  buscarBoard: vi.fn(),
  buscarFavoritos: vi.fn(),
  buscarMembros: vi.fn(),
  buscarGruposComTarefas: vi.fn(),
  buscarTarefaDetalhe: vi.fn(),
  atualizarTarefa: vi.fn(),
  criarTarefa: vi.fn(),
  criarGrupo: vi.fn(),
  atualizarGrupo: vi.fn(),
  removerGrupo: vi.fn(),
}))

import * as servico from '@/services/boards'
import BoardPage from './BoardPage'

vi.setConfig({ testTimeout: 20_000 })
beforeAll(() => configure({ asyncUtilTimeout: 4000 }))

const SESSAO = { usuario: { id: 'u1', email: 'ana@x.com' }, carregando: false }

const grupo = (id: string, name: string, position: number, tasks: ReturnType<typeof tarefa>[]) =>
  ({ id, board_id: 'b1', name, color: 'azure', position, tasks }) as GroupComTarefas

const GRUPOS = [
  grupo('g1', 'A fazer', 0, [
    tarefa({ id: 'a', title: 'Login social', status: 'working' }),
    tarefa({ id: 'b', title: 'Deploy do beta', status: 'done' }),
  ]),
  grupo('g2', 'Backlog', 1, [tarefa({ id: 'c', title: 'Documentar API', status: 'not_started' })]),
  grupo('g3', 'Ideias', 2, []),
]

function renderizar(rota = '/boards/b1') {
  const { wrapper: QueryWrapper } = criarWrapper()
  return render(
    <SessaoContext.Provider value={SESSAO}>
      <QueryWrapper>
        <MemoryRouter initialEntries={[rota]}>
          <Routes>
            <Route path="/boards/:boardId/*" element={<BoardPage />} />
            <Route path="/paineis" element={<p>painéis</p>} />
          </Routes>
        </MemoryRouter>
      </QueryWrapper>
    </SessaoContext.Provider>,
  )
}

const bloco = (nome: string) => screen.getByRole('heading', { level: 2, name: nome }).closest('section') as HTMLElement
const temBloco = (nome: string) => screen.queryByRole('heading', { level: 2, name: nome }) !== null
/** Tabela e lista de cartões coexistem no DOM sem CSS: basta uma ocorrência. */
const temTarefaEm = (nome: string, titulo: string) => within(bloco(nome)).queryAllByRole('button', { name: titulo }).length > 0

describe('tabela: agrupar por grupo ou por status', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(servico.buscarBoard).mockResolvedValue({ id: 'b1', name: 'Sprint', workspace_id: 'w1', owner_id: 'u1' })
    vi.mocked(servico.buscarFavoritos).mockResolvedValue([])
    vi.mocked(servico.buscarMembros).mockResolvedValue([])
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue(GRUPOS)
  })

  it('por padrão agrupa pelos grupos do board', async () => {
    renderizar()

    await screen.findByRole('heading', { level: 2, name: 'A fazer' })
    expect(screen.getByLabelText('Agrupar por')).toHaveValue('grupo')
    expect(temBloco('Backlog')).toBe(true)
    expect(temBloco('Em andamento')).toBe(false)
  })

  it('escolher "Status" troca os blocos: a tarefa em andamento sai de "A fazer" e vai para "Em andamento"', async () => {
    const user = userEvent.setup()
    renderizar()

    await user.selectOptions(await screen.findByLabelText('Agrupar por'), 'Status')

    expect(temBloco('A fazer')).toBe(false)
    expect(temTarefaEm('Em andamento', 'Login social')).toBe(true)
    expect(temTarefaEm('Pronto', 'Deploy do beta')).toBe(true)
    expect(temTarefaEm('Não iniciado', 'Documentar API')).toBe(true)
  })

  it('só aparecem os status que têm tarefa, na ordem do kanban', async () => {
    renderizar('/boards/b1?agrupar=status')

    await screen.findByRole('heading', { level: 2, name: 'Em andamento' })
    expect(temBloco('Em revisão')).toBe(false)
    expect(temBloco('Travado')).toBe(false)
    const ordem = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(ordem).toEqual(['Não iniciado', 'Em andamento', 'Pronto'])
  })

  it('a escolha vem da URL: abrir com ?agrupar=status já mostra o select em "Status"', async () => {
    renderizar('/boards/b1?agrupar=status')

    expect(await screen.findByLabelText('Agrupar por')).toHaveValue('status')
  })

  it('no modo Status não há como criar/renomear/excluir grupo nem adicionar item: o bloco é uma visão', async () => {
    renderizar('/boards/b1?agrupar=status')

    await screen.findByRole('heading', { level: 2, name: 'Em andamento' })
    expect(screen.queryByRole('button', { name: 'Novo grupo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Ações do grupo/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Adicionar item' })).not.toBeInTheDocument()
  })

  it('mudar o status de uma tarefa a move de bloco na hora', async () => {
    // Nunca resolve: prova que a tela não esperou o servidor (mesmo padrão do update otimista).
    vi.mocked(servico.atualizarTarefa).mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    renderizar('/boards/b1?agrupar=status')

    await screen.findByRole('heading', { level: 2, name: 'Em andamento' })
    await user.click(screen.getAllByRole('checkbox', { name: 'Concluir Login social' })[0] as HTMLElement)

    await vi.waitFor(() => expect(temBloco('Em andamento')).toBe(false))
    expect(temTarefaEm('Pronto', 'Login social')).toBe(true)
  })

  it('a busca e os filtros continuam valendo no modo Status', async () => {
    renderizar('/boards/b1?agrupar=status&status=done')

    await screen.findByRole('heading', { level: 2, name: 'Pronto' })
    expect(temBloco('Em andamento')).toBe(false)
    expect(temBloco('Não iniciado')).toBe(false)
  })

  it('voltar para "Grupo" restaura os grupos e o botão "Novo grupo"', async () => {
    const user = userEvent.setup()
    renderizar('/boards/b1?agrupar=status')

    await user.selectOptions(await screen.findByLabelText('Agrupar por'), 'Grupo')

    expect(await screen.findByRole('heading', { level: 2, name: 'A fazer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Novo grupo' })).toBeInTheDocument()
  })
})
