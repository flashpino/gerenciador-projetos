import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { SessaoContext } from '@/hooks/sessaoContext'
import type { GroupComTarefas, Profile, TaskComDetalhe } from '@/types/domain'
import { criarWrapper } from '@/test/query'
import { criarTarefaFixture as tarefa } from '@/test/fixtures'

/**
 * Fase 7 do manual (§9.1) — automação de acessibilidade além do lint.
 * `eslint-plugin-jsx-a11y` não está no stack (o projeto usa oxlint, que traz
 * suas próprias regras jsx-a11y embutidas — `npm run lint`); isto cobre o que
 * o lint estático não alcança: contraste computado, ARIA inválido em tempo de
 * render, papel/nome acessível do DOM realmente montado.
 *
 * Uma tela por rota do MVP (specs.md §2), cada uma com dado real (não vazio) —
 * o estado vazio já tem cobertura própria em cada *Page.test.tsx.
 *
 * Mocka só a camada de serviço (nunca os hooks): os hooks reais rodam por
 * cima do mock, então o teste exercita o mesmo caminho de estado que a app
 * real usa, igual ao padrão de DashboardPage.test.tsx.
 */

vi.mock('@/services/boards', () => ({
  buscarAtividades: vi.fn(),
  buscarFavoritos: vi.fn(),
  buscarBoard: vi.fn(),
  buscarBoards: vi.fn(),
  buscarWorkspaceAtual: vi.fn(),
  buscarGruposComTarefas: vi.fn(),
  buscarMembros: vi.fn(),
  buscarTarefaDetalhe: vi.fn(),
  atualizarTarefa: vi.fn(),
  criarTarefa: vi.fn(),
  atualizarSubtarefa: vi.fn(),
  criarSubtarefa: vi.fn(),
  removerSubtarefa: vi.fn(),
  criarComentario: vi.fn(),
  criarBoard: vi.fn(),
  adicionarMembro: vi.fn(),
  removerMembro: vi.fn(),
  atualizarNomePerfil: vi.fn(),
}))
vi.mock('@/services/auth', () => ({
  sair: vi.fn(),
  entrar: vi.fn(),
  cadastrar: vi.fn(),
}))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [true, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}))

import * as servico from '@/services/boards'
import BoardPage from '@/pages/BoardPage'
import DashboardPage from '@/pages/DashboardPage'
import GanttPage from '@/pages/GanttPage'
import KanbanPage from '@/pages/KanbanPage'
import AjudaPage from '@/pages/AjudaPage'
import ConfiguracoesPage from '@/pages/ConfiguracoesPage'
import LoginPage from '@/pages/LoginPage'
import PaineisPage from '@/pages/PaineisPage'
import AtividadesPage from '@/pages/AtividadesPage'
import ModelosPage from '@/pages/ModelosPage'
import { AvisoPWA } from '@/components/features/AvisoPWA'
import { FiltroTarefasModal } from '@/components/features/FiltroTarefasModal'
import { FILTRO_VAZIO } from '@/lib/filtro'
import { IntegrantesModal } from '@/components/features/IntegrantesModal'
import { TaskModal } from '@/components/features/TaskModal'

// Objetos hoisted: JSX `value={{...}}` inline reconstrói a cada render e o
// lint (jsx-no-constructed-context-values) reprova, mesmo em teste.
const SESSAO_DESLOGADA = { usuario: null, carregando: false }
const SESSAO_LOGADA = { usuario: { id: 'u1', email: 'a@x.com' }, carregando: false }

const MEMBROS: Profile[] = [
  { id: 'u1', full_name: 'Ana Lima', avatar_url: null },
  { id: 'u2', full_name: 'Beto Souza', avatar_url: null },
]

// Um board com 2 grupos e tarefas cobrindo status/prioridade/atraso/marco —
// o mesmo dado alimenta tabela, kanban e gantt, então os três veem o caso real.
function grupos(): GroupComTarefas[] {
  return [
    {
      id: 'g1', board_id: 'b1', name: 'Em Execução', color: 'azure', position: 0,
      tasks: [
        tarefa({ id: 't1', title: 'Refatorar arquitetura', status: 'working', priority: 'high', assignee_id: 'u1', progress: 65, start_date: '2026-09-10', due_date: '2026-09-20' }),
        tarefa({ id: 't2', title: 'Corrigir contraste do badge', status: 'stuck', priority: 'critical', assignee_id: 'u2', progress: 30, due_date: '2020-01-01' }),
        tarefa({ id: 't3', title: 'Release beta', status: 'review', priority: 'medium', is_milestone: true, due_date: '2026-09-24' }),
      ],
    },
    {
      id: 'g2', board_id: 'b1', name: 'Backlog', color: 'grape', position: 1,
      tasks: [tarefa({ id: 't4', title: 'Config inicial', status: 'not_started', priority: 'low' })],
    },
  ]
}

function renderComProviders(ui: React.ReactElement) {
  const { wrapper: QueryWrapper } = criarWrapper()
  return render(
    <MemoryRouter initialEntries={['/boards/b1']}>
      <QueryWrapper>
        <Routes>
          <Route path="/boards/:boardId" element={ui} />
        </Routes>
      </QueryWrapper>
    </MemoryRouter>,
  )
}

describe('Acessibilidade automatizada (axe) — telas principais do MVP', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(servico.buscarFavoritos).mockResolvedValue([])
    vi.mocked(servico.buscarAtividades).mockResolvedValue([])
    vi.mocked(servico.buscarBoard).mockResolvedValue({ id: 'b1', name: 'Sprint Alpha Q3', workspace_id: 'w1', owner_id: 'u1' })
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue(grupos())
    vi.mocked(servico.buscarMembros).mockResolvedValue(MEMBROS)
  })

  it('LoginPage não tem violação WCAG', async () => {
    // LoginPage chama useSessao (redireciona quem já tem sessão) — precisa do
    // provider real, mesma necessidade do TaskModal mais abaixo.
    const { container } = render(
      <SessaoContext.Provider value={SESSAO_DESLOGADA}>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </SessaoContext.Provider>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('BoardPage (Tabela Principal, F1) não tem violação WCAG', async () => {
    // TaskGroup renderiza DUAS árvores (tabela >=768px, lista <768px,
    // docs/responsive.md) — jsdom não computa a media query que esconde uma
    // delas, então o mesmo título aparece 2x. findAllBy* é o correto aqui.
    const { container, findAllByText } = renderComProviders(<BoardPage />)
    await findAllByText('Refatorar arquitetura')
    expect(await axe(container)).toHaveNoViolations()
    // Mesmo motivo do Gantt abaixo: sob `test:cov` o scan das duas árvores
    // passa dos 5s padrão (medido 5.9s). Timeout, não asserção.
  }, 30_000)

  it('KanbanPage (F2) não tem violação WCAG', async () => {
    const { container, findByText } = renderComProviders(<KanbanPage />)
    await findByText('Refatorar arquitetura')
    expect(await axe(container)).toHaveNoViolations()
  })

  // Timeout maior: a grade do Gantt (ticks + linha "hoje" + sticky) é a árvore
  // DOM mais larga das 4 telas. O scan do axe nela passa dos 5s padrão do
  // vitest, e sob `test:cov` (instrumentação v8) passa até dos 15s — medido
  // em 27s neste ambiente. Em 2026-09-28: ~21s isolado, mas 47–55s na suíte
  // inteira (37 arquivos disputando CPU em paralelo) — daí 90s.
  it('GanttPage (F3) não tem violação WCAG', async () => {
    const { container, findByText } = renderComProviders(<GanttPage />)
    await findByText('Config inicial')
    expect(await axe(container)).toHaveNoViolations()
  }, 90_000)

  it('DashboardPage (F4) não tem violação WCAG', async () => {
    const { container, findByText } = renderComProviders(<DashboardPage />)
    await findByText('Distribuição por Status')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('PaineisPage (Meus Painéis) não tem violação WCAG', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue([
      { id: 'b1', name: 'Sprint Alpha Q3', created_at: '2026-09-01T10:00:00Z', workspace_id: 'w1' },
      { id: 'b2', name: 'Roadmap', created_at: '2026-09-10T10:00:00Z', workspace_id: 'w1' },
    ])
    vi.mocked(servico.buscarWorkspaceAtual).mockResolvedValue({ id: 'w1', name: 'Meu Workspace', owner_id: 'u1' })
    const { wrapper: QueryWrapper } = criarWrapper()
    const { container, findByText } = render(
      <MemoryRouter>
        <QueryWrapper>
          <PaineisPage />
        </QueryWrapper>
      </MemoryRouter>,
    )
    await findByText('Roadmap')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('PaineisPage variante Favoritos não tem violação WCAG', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue([
      { id: 'b1', name: 'Sprint Alpha Q3', created_at: '2026-09-01T10:00:00Z', workspace_id: 'w1' },
      { id: 'b2', name: 'Roadmap', created_at: '2026-09-10T10:00:00Z', workspace_id: 'w1' },
    ])
    vi.mocked(servico.buscarFavoritos).mockResolvedValue(['b2'])
    vi.mocked(servico.buscarWorkspaceAtual).mockResolvedValue({ id: 'w1', name: 'Meu Workspace', owner_id: 'u1' })
    const { wrapper: QueryWrapper } = criarWrapper()
    const { container, findByText } = render(
      <MemoryRouter>
        <QueryWrapper>
          <PaineisPage filtro="favoritos" />
        </QueryWrapper>
      </MemoryRouter>,
    )
    await findByText('Roadmap')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('AtividadesPage não tem violação WCAG', async () => {
    const agora = new Date().toISOString()
    vi.mocked(servico.buscarAtividades).mockResolvedValue([
      {
        id: 1, board_id: 'b1', task_id: 't1', kind: 'status_changed', task_title: 'Deploy',
        from_status: 'working', to_status: 'review', comment_excerpt: null, created_at: agora,
        ator: { full_name: 'Ana Lima', avatar_url: null }, board: { name: 'Sprint Alpha Q3' },
      },
      {
        id: 2, board_id: 'b1', task_id: 't1', kind: 'comment_added', task_title: 'Deploy',
        from_status: null, to_status: null, comment_excerpt: 'Pipeline verde', created_at: agora,
        ator: { full_name: 'Beto Souza', avatar_url: null }, board: { name: 'Sprint Alpha Q3' },
      },
    ])
    const { wrapper: QueryWrapper } = criarWrapper()
    const { container, findAllByText } = render(
      <MemoryRouter>
        <QueryWrapper>
          <AtividadesPage />
        </QueryWrapper>
      </MemoryRouter>,
    )
    await findAllByText(/Deploy/)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('ModelosPage não tem violação WCAG', async () => {
    vi.mocked(servico.buscarWorkspaceAtual).mockResolvedValue({ id: 'w1', name: 'Meu Workspace', owner_id: 'u1' })
    const { wrapper: QueryWrapper } = criarWrapper()
    const { container, findByRole } = render(
      <MemoryRouter>
        <QueryWrapper>
          <ModelosPage />
        </QueryWrapper>
      </MemoryRouter>,
    )
    await findByRole('heading', { level: 1, name: 'Modelos' })
    const botao = await findByRole('button', { name: 'Usar modelo Sprint de software' })
    await vi.waitFor(() => expect(botao).toBeEnabled())
    expect(await axe(container)).toHaveNoViolations()
  })

  it('TaskModal aberto em edição (F5) não tem violação WCAG', async () => {
    const detalhe: TaskComDetalhe = {
      ...tarefa({ id: 't1', title: 'Refatorar arquitetura', status: 'working', priority: 'high', progress: 65 }),
      subtasks: [{ id: 's1', task_id: 't1', title: 'Mapear módulos', done: false, position: 0 }],
      comments: [],
    }
    vi.mocked(servico.buscarTarefaDetalhe).mockResolvedValue(detalhe)
    const { wrapper: QueryWrapper } = criarWrapper()

    const { container, findByDisplayValue } = render(
      <SessaoContext.Provider value={SESSAO_LOGADA}>
        <QueryWrapper>
          <TaskModal
            aberto
            aoFechar={() => {}}
            boardId="b1"
            taskId="t1"
            grupos={[{ id: 'g1', name: 'Em Execução' }]}
            membros={MEMBROS}
          />
        </QueryWrapper>
      </SessaoContext.Provider>,
    )

    await findByDisplayValue('Refatorar arquitetura')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('IntegrantesModal aberto como dono não tem violação WCAG', async () => {
    const { wrapper: QueryWrapper } = criarWrapper()
    const { findByRole } = render(
      <SessaoContext.Provider value={SESSAO_LOGADA}>
        <QueryWrapper>
          <MemoryRouter>
            <IntegrantesModal aberto aoFechar={() => {}} workspaceId="w1" donoId="u1" />
          </MemoryRouter>
        </QueryWrapper>
      </SessaoContext.Provider>,
    )
    const dialogo = await findByRole('dialog', { name: 'Integrantes' })
    await findByRole('list', { name: 'Integrantes do workspace' })
    expect(await axe(dialogo)).toHaveNoViolations()
  })

  it('AvisoPWA (versão nova) não tem violação WCAG', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const { container, findByRole } = render(<AvisoPWA />)
    await findByRole('button', { name: 'Recarregar' })
    expect(await axe(container)).toHaveNoViolations()
    vi.unstubAllGlobals()
  })

  it('AvisoPWA (instalar) não tem violação WCAG', async () => {
    // Celular (toque como ponteiro principal): no computador o aviso de instalar não aparece mais.
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(pointer: coarse)' }))
    const { container, findByRole } = render(<AvisoPWA />)
    // O de atualizar tem prioridade; "Depois" libera o de instalar.
    await userEvent.click(await findByRole('button', { name: 'Depois' }))
    const evento = Object.assign(new Event('beforeinstallprompt'), {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    })
    act(() => {
      window.dispatchEvent(evento)
    })
    await findByRole('button', { name: 'Instalar' })
    expect(await axe(container)).toHaveNoViolations()
    vi.unstubAllGlobals()
  })

  it('ConfiguracoesPage não tem violação WCAG', async () => {
    vi.mocked(servico.buscarWorkspaceAtual).mockResolvedValue({ id: 'w1', name: 'Meu Workspace', owner_id: 'u1' })
    vi.mocked(servico.buscarMembros).mockResolvedValue(MEMBROS)
    const { wrapper: QueryWrapper } = criarWrapper()
    const { container, findByLabelText } = render(
      <SessaoContext.Provider value={SESSAO_LOGADA}>
        <QueryWrapper>
          <MemoryRouter>
            <ConfiguracoesPage />
          </MemoryRouter>
        </QueryWrapper>
      </SessaoContext.Provider>,
    )
    await findByLabelText('Nome de exibição')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('AjudaPage não tem violação WCAG', async () => {
    const { container } = render(<AjudaPage />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('FiltroTarefasModal aberto, com filtros marcados, não tem violação WCAG', async () => {
    render(
      <FiltroTarefasModal
        aberto
        aoFechar={() => {}}
        aoMudar={() => {}}
        membros={MEMBROS}
        filtro={{ ...FILTRO_VAZIO, status: ['working'], responsavel: 'u1', atrasadas: true }}
      />,
    )
    const dialogo = await screen.findByRole('dialog', { name: 'Filtrar tarefas' })
    expect(await axe(dialogo)).toHaveNoViolations()
  })
})
