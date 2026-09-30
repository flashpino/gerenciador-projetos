import { configure, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessaoContext } from '@/hooks/sessaoContext'
import { criarTarefaFixture as tarefa } from '@/test/fixtures'
import { criarWrapper } from '@/test/query'
import type { GroupComTarefas } from '@/types/domain'

/**
 * Criar, renomear e excluir grupo na tabela (mockup "+ Adicionar Novo Grupo").
 * BoardShell e BoardPage REAIS, só o serviço mockado: prova o que a pessoa vê.
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
  grupo('g1', 'Em desenvolvimento', 0, [tarefa({ id: 'a', title: 'Login social', status: 'working' })]),
  grupo('g2', 'Backlog', 1, []),
  grupo('g3', 'Ideias', 4, []),
]

function renderizar() {
  const { wrapper: QueryWrapper } = criarWrapper()
  return render(
    <SessaoContext.Provider value={SESSAO}>
      <QueryWrapper>
        <MemoryRouter initialEntries={['/boards/b1']}>
          <Routes>
            <Route path="/boards/:boardId/*" element={<BoardPage />} />
            <Route path="/paineis" element={<p>painéis</p>} />
          </Routes>
        </MemoryRouter>
      </QueryWrapper>
    </SessaoContext.Provider>,
  )
}

async function abrirMenuDoGrupo(nome: string) {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: `Ações do grupo ${nome}` }))
  return user
}

describe('grupos na tabela principal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(servico.buscarBoard).mockResolvedValue({ id: 'b1', name: 'Sprint', workspace_id: 'w1', owner_id: 'u1' })
    vi.mocked(servico.buscarFavoritos).mockResolvedValue([])
    vi.mocked(servico.buscarMembros).mockResolvedValue([])
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue(GRUPOS)
  })

  it('"Novo grupo" cria no fim da tabela: position = maior atual + 1', async () => {
    vi.mocked(servico.criarGrupo).mockResolvedValue({ id: 'g9' } as never)
    const user = userEvent.setup()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Novo grupo' }))
    await screen.findByRole('dialog', { name: 'Novo grupo' })
    await user.type(screen.getByLabelText('Nome do grupo'), 'Fase 2')
    await user.click(screen.getByRole('button', { name: 'Criar grupo' }))

    expect(servico.criarGrupo).toHaveBeenCalledWith('b1', { name: 'Fase 2', color: 'azure' }, 5)
  })

  it('renomear pelo menu do cabeçalho abre o modal com o nome atual e salva', async () => {
    vi.mocked(servico.atualizarGrupo).mockResolvedValue({ id: 'g2' } as never)
    renderizar()

    const user = await abrirMenuDoGrupo('Backlog')
    await user.click(screen.getByRole('menuitem', { name: 'Renomear' }))

    await screen.findByRole('dialog', { name: 'Renomear grupo' })
    const campo = screen.getByLabelText('Nome do grupo')
    expect(campo).toHaveValue('Backlog')
    await user.clear(campo)
    await user.type(campo, 'Próximos passos')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(servico.atualizarGrupo).toHaveBeenCalledWith('g2', { name: 'Próximos passos', color: 'azure' })
  })

  it('excluir grupo VAZIO apaga direto, sem diálogo de confirmação', async () => {
    vi.mocked(servico.removerGrupo).mockResolvedValue(undefined)
    renderizar()

    const user = await abrirMenuDoGrupo('Ideias')
    await user.click(screen.getByRole('menuitem', { name: 'Excluir' }))

    expect(servico.removerGrupo).toHaveBeenCalledWith('g3')
  })

  it('grupo COM tarefas: "Excluir" fica desabilitado e explica o motivo — o cascade apagaria as tarefas', async () => {
    renderizar()

    const user = await abrirMenuDoGrupo('Em desenvolvimento')
    const item = screen.getByRole('menuitem', { name: /^Excluir/ })
    expect(item).toHaveAttribute('aria-disabled', 'true')
    expect(item).toHaveTextContent('mova ou exclua as tarefas antes')

    await user.click(item)
    expect(servico.removerGrupo).not.toHaveBeenCalled()
  })

  it('o ÚLTIMO grupo não pode ser excluído, mesmo vazio — sem grupo não há onde criar tarefa', async () => {
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue([grupo('g1', 'A fazer', 0, [])])
    renderizar()

    const user = await abrirMenuDoGrupo('A fazer')
    const item = screen.getByRole('menuitem', { name: /^Excluir/ })
    expect(item).toHaveAttribute('aria-disabled', 'true')
    expect(item).toHaveTextContent('último grupo')

    await user.click(item)
    expect(servico.removerGrupo).not.toHaveBeenCalled()
  })

  it('falha ao excluir aparece como alerta, não em silêncio', async () => {
    vi.mocked(servico.removerGrupo).mockRejectedValue(new Error('Você não tem permissão para isso.'))
    renderizar()

    const user = await abrirMenuDoGrupo('Ideias')
    await user.click(screen.getByRole('menuitem', { name: 'Excluir' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Você não tem permissão para isso.')
  })

  it('board sem nenhum grupo: "Criar primeiro grupo" abre o modal (antes era um botão morto)', async () => {
    vi.mocked(servico.buscarGruposComTarefas).mockResolvedValue([])
    const user = userEvent.setup()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Criar primeiro grupo' }))

    expect(await screen.findByRole('dialog', { name: 'Novo grupo' })).toBeInTheDocument()
  })
})
