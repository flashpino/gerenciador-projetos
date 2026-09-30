import { configure, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessaoContext } from '@/hooks/sessaoContext'
import { criarTarefaFixture as tarefa } from '@/test/fixtures'
import { criarWrapper } from '@/test/query'
import type { GroupComTarefas } from '@/types/domain'

/**
 * Integração da busca e dos filtros (docs/superpowers/specs/2026-09-30-busca-filtros-design.md):
 * BoardShell REAL + página REAL, só o serviço mockado. Prova o que a pessoa vê, não a função.
 */
vi.mock('@/services/boards', () => ({
  buscarBoard: vi.fn(),
  buscarFavoritos: vi.fn(),
  buscarMembros: vi.fn(),
  buscarGruposComTarefas: vi.fn(),
  buscarTarefaDetalhe: vi.fn(),
  atualizarTarefa: vi.fn(),
  criarTarefa: vi.fn(),
}))

import * as servico from '@/services/boards'
import BoardPage from './BoardPage'
import GanttPage from './GanttPage'
import KanbanPage from './KanbanPage'

// Integração pesada (BoardShell + página reais + digitação). Com a suíte inteira rodando em paralelo e com
// cobertura a máquina fica carregada, e os 5 s padrão do teste e o 1 s do findBy estouravam sem que a lógica
// estivesse errada. Orçamento de tempo só para este arquivo; nenhuma asserção foi tocada.
vi.setConfig({ testTimeout: 20_000 })
beforeAll(() => configure({ asyncUtilTimeout: 4000 }))

const SESSAO = { usuario: { id: 'u1', email: 'ana@x.com' }, carregando: false }

const grupo = (id: string, name: string, tasks: ReturnType<typeof tarefa>[]) =>
  ({ id, board_id: 'b1', name, color: 'azure', position: 0, tasks }) as GroupComTarefas

const GRUPOS = [
  grupo('g1', 'Em desenvolvimento', [
    tarefa({ id: 'a', title: 'Login social', status: 'working', priority: 'high', assignee_id: 'u1' }),
    tarefa({ id: 'b', title: 'Deploy do beta', status: 'done', priority: 'medium', assignee_id: 'u2' }),
  ]),
  grupo('g2', 'Backlog', [tarefa({ id: 'c', title: 'Documentar API', status: 'not_started', priority: 'low', assignee_id: null })]),
  grupo('g3', 'Ideias', []),
]

function renderizar(Pagina: () => React.JSX.Element, rota = '/boards/b1') {
  const { wrapper: QueryWrapper } = criarWrapper()
  return render(
    <SessaoContext.Provider value={SESSAO}>
      <QueryWrapper>
        <MemoryRouter initialEntries={[rota]}>
          <Routes>
            <Route path="/boards/:boardId/*" element={<Pagina />} />
            <Route path="/paineis" element={<p>painéis</p>} />
          </Routes>
        </MemoryRouter>
      </QueryWrapper>
    </SessaoContext.Provider>,
  )
}

/** A tabela e a lista de cartões (celular) coexistem no DOM sem CSS: conta as ocorrências. */
const aparece = (titulo: string) => screen.queryAllByRole('button', { name: titulo }).length > 0
const grupoAparece = (nome: string) => screen.queryByRole('heading', { level: 2, name: nome }) !== null

/**
 * Só digita. A busca vai para a URL depois de uma pausa (debounce, em tempo real): quem chama espera pelo
 * RESULTADO com `esperar`, nunca por um sleep fixo (frágil sob carga).
 */
const buscar = (texto: string) => userEvent.type(screen.getByRole('searchbox', { name: 'Buscar neste quadro' }), texto)

/** Espera uma condição, com folga para a máquina carregada. */
const esperar = (condicao: () => void) => vi.waitFor(condicao, { timeout: 4000 })

describe('busca e filtros nas visões do board', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(servico.buscarBoard).mockResolvedValue({ id: 'b1', name: 'Sprint', workspace_id: 'w1', owner_id: 'u1' })
    vi.mocked(servico.buscarFavoritos).mockResolvedValue([])
    vi.mocked(servico.buscarMembros).mockResolvedValue([
      { id: 'u1', full_name: 'Ana Lima', avatar_url: null },
      { id: 'u2', full_name: 'Beto Souza', avatar_url: null },
    ])
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue(GRUPOS)
  })

  describe('Tabela', () => {
    it('sem filtro mostra tudo, inclusive o grupo vazio (é onde se cria tarefa) e não mostra o resumo', async () => {
      renderizar(BoardPage)
      await screen.findByRole('heading', { level: 2, name: 'Em desenvolvimento' })
      expect(aparece('Login social') && aparece('Deploy do beta') && aparece('Documentar API')).toBe(true)
      expect(grupoAparece('Ideias')).toBe(true)
      expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument()
    })

    it('digitar na busca deixa só o que casa e some com os grupos sem resultado', async () => {
      renderizar(BoardPage)
      await screen.findByRole('heading', { level: 2, name: 'Em desenvolvimento' })
      await buscar('deploy')

      await esperar(() => expect(aparece('Login social')).toBe(false))
      expect(aparece('Deploy do beta')).toBe(true)
      expect(aparece('Documentar API')).toBe(false)
      expect(grupoAparece('Backlog')).toBe(false)
      expect(grupoAparece('Ideias')).toBe(false)
      expect(screen.getByRole('status')).toHaveTextContent('Mostrando 1 de 3 tarefas')
    })

    it('a busca ignora acento e maiúscula', async () => {
      vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue([
        grupo('g1', 'G', [tarefa({ id: 'x', title: 'Configuração inicial' })]),
      ])
      renderizar(BoardPage)
      await screen.findByRole('heading', { level: 2, name: 'G' })
      await buscar('CONFIGURACAO')
      // O resumo só aparece depois que o filtro foi aplicado: prova que a busca casou sem acento.
      await esperar(() => expect(screen.getByRole('status')).toHaveTextContent('Mostrando 1 de 1 tarefa'))
      expect(aparece('Configuração inicial')).toBe(true)
    })

    it('filtro por status vindo da URL', async () => {
      renderizar(BoardPage, '/boards/b1?status=done')
      await screen.findByRole('heading', { level: 2, name: 'Em desenvolvimento' })
      expect(aparece('Deploy do beta')).toBe(true)
      expect(aparece('Login social')).toBe(false)
      expect(screen.getByRole('status')).toHaveTextContent('Mostrando 1 de 3 tarefas')
    })

    it('filtro "sem responsável"', async () => {
      renderizar(BoardPage, '/boards/b1?resp=sem')
      await screen.findByRole('heading', { level: 2, name: 'Backlog' })
      expect(aparece('Documentar API')).toBe(true)
      expect(aparece('Login social')).toBe(false)
    })

    it('busca e filtro se combinam (E)', async () => {
      renderizar(BoardPage, '/boards/b1?prio=high,medium')
      await screen.findByRole('heading', { level: 2, name: 'Em desenvolvimento' })
      expect(aparece('Login social') && aparece('Deploy do beta')).toBe(true)
      await buscar('login')
      await esperar(() => expect(aparece('Deploy do beta')).toBe(false))
      expect(aparece('Login social')).toBe(true)
    })

    it('nada encontrado: estado vazio próprio (não "Nenhuma tarefa ainda") e o botão traz tudo de volta', async () => {
      renderizar(BoardPage)
      await screen.findByRole('heading', { level: 2, name: 'Em desenvolvimento' })
      await buscar('zzzz')

      expect(await screen.findByText('Nenhuma tarefa encontrada', {}, { timeout: 4000 })).toBeInTheDocument()
      expect(screen.queryByText('Nenhuma tarefa ainda')).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Limpar busca e filtros' }))
      expect(await screen.findByRole('heading', { level: 2, name: 'Em desenvolvimento' })).toBeInTheDocument()
      expect(screen.getByRole('searchbox', { name: 'Buscar neste quadro' })).toHaveValue('')
    })

    it('board realmente vazio continua dizendo "Nenhuma tarefa ainda"', async () => {
      vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue([])
      renderizar(BoardPage)
      expect(await screen.findByText('Nenhuma tarefa ainda')).toBeInTheDocument()
    })

    it('o modal de nova tarefa enxerga TODOS os grupos, inclusive os que o filtro escondeu', async () => {
      renderizar(BoardPage, '/boards/b1?status=done')
      await screen.findByRole('heading', { level: 2, name: 'Em desenvolvimento' })
      expect(grupoAparece('Backlog')).toBe(false)

      await userEvent.click(screen.getAllByRole('button', { name: 'Adicionar item' })[0]!)
      const destino = await screen.findByRole('combobox', { name: 'Grupo de destino' })
      const nomes = [...destino.querySelectorAll('option')].map((o) => o.textContent)
      expect(nomes).toEqual(expect.arrayContaining(['Em desenvolvimento', 'Backlog', 'Ideias']))
    })
  })

  describe('Kanban', () => {
    it('só os cartões que casam; as colunas continuam todas lá', async () => {
      renderizar(KanbanPage, '/boards/b1/kanban?q=login')
      expect(await screen.findByText('Login social')).toBeInTheDocument()
      expect(screen.queryByText('Deploy do beta')).not.toBeInTheDocument()
      expect(screen.queryByText('Documentar API')).not.toBeInTheDocument()
      for (const coluna of ['Não iniciado', 'Em andamento', 'Em revisão', 'Pronto', 'Travado']) {
        expect(screen.getAllByRole('heading', { level: 2, name: coluna }).length).toBeGreaterThan(0)
      }
      expect(screen.getByText('Mostrando 1 de 3 tarefas')).toBeInTheDocument()
    })

    it('nada encontrado mostra o estado vazio do filtro', async () => {
      renderizar(KanbanPage, '/boards/b1/kanban?q=zzzz')
      expect(await screen.findByText('Nenhuma tarefa encontrada')).toBeInTheDocument()
    })
  })

  describe('Gantt', () => {
    it('o cronograma mostra só as tarefas que casam', async () => {
      vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue([
        grupo('g1', 'Fase 1', [
          tarefa({ id: 'a', title: 'Login social', start_date: '2026-09-20', due_date: '2026-09-25' }),
          tarefa({ id: 'b', title: 'Deploy do beta', start_date: '2026-09-22', due_date: '2026-09-30' }),
        ]),
      ])
      renderizar(GanttPage, '/boards/b1/gantt?q=deploy')
      await screen.findByRole('heading', { level: 2, name: 'Fase 1' })
      expect(screen.getAllByText('Deploy do beta').length).toBeGreaterThan(0)
      expect(screen.queryByText('Login social')).not.toBeInTheDocument()
    })
  })
})
