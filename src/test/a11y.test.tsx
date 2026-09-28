import { render } from '@testing-library/react'
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
}))
vi.mock('@/services/auth', () => ({
  sair: vi.fn(),
  entrar: vi.fn(),
  cadastrar: vi.fn(),
}))

import * as servico from '@/services/boards'
import BoardPage from '@/pages/BoardPage'
import DashboardPage from '@/pages/DashboardPage'
import GanttPage from '@/pages/GanttPage'
import KanbanPage from '@/pages/KanbanPage'
import LoginPage from '@/pages/LoginPage'
import PaineisPage from '@/pages/PaineisPage'
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
    vi.mocked(servico.buscarBoard).mockResolvedValue({ id: 'b1', name: 'Sprint Alpha Q3' })
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
  // em 27s neste ambiente.
  it('GanttPage (F3) não tem violação WCAG', async () => {
    const { container, findByText } = renderComProviders(<GanttPage />)
    await findByText('Config inicial')
    expect(await axe(container)).toHaveNoViolations()
  }, 45_000)

  it('DashboardPage (F4) não tem violação WCAG', async () => {
    const { container, findByText } = renderComProviders(<DashboardPage />)
    await findByText('Distribuição por Status')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('PaineisPage (Meus Painéis) não tem violação WCAG', async () => {
    vi.mocked(servico.buscarBoards).mockResolvedValue([
      { id: 'b1', name: 'Sprint Alpha Q3', created_at: '2026-09-01T10:00:00Z' },
      { id: 'b2', name: 'Roadmap', created_at: '2026-09-10T10:00:00Z' },
    ])
    vi.mocked(servico.buscarWorkspaceAtual).mockResolvedValue({ id: 'w1', name: 'Meu Workspace' })
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
})
