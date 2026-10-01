import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  buscarWorkspaceAtual: vi.fn(),
  criarBoard: vi.fn(),
}))

import * as servico from '@/services/boards'
import { MODELOS } from '@/lib/modelos'
import ModelosPage from './ModelosPage'

function renderizar() {
  const { wrapper: QueryWrapper } = criarWrapper()
  render(
    <QueryWrapper>
      <MemoryRouter initialEntries={['/modelos']}>
        <Routes>
          <Route path="/modelos" element={<ModelosPage />} />
          <Route path="/boards/:boardId" element={<p>board aberto</p>} />
        </Routes>
      </MemoryRouter>
    </QueryWrapper>,
  )
}

// Os botões nascem desabilitados até o workspace carregar.
async function botaoHabilitado(nomeModelo: string) {
  const botao = screen.getByRole('button', { name: `Usar modelo ${nomeModelo}` })
  await vi.waitFor(() => expect(botao).toBeEnabled())
  return botao
}

describe('ModelosPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(servico.buscarWorkspaceAtual).mockResolvedValue({ id: 'w1', name: 'Meu Workspace', owner_id: 'u1' })
  })

  it('lista os modelos com seus grupos', () => {
    renderizar()
    expect(screen.getByRole('heading', { level: 1, name: 'Modelos' })).toBeInTheDocument()
    for (const modelo of MODELOS) {
      expect(screen.getByRole('heading', { level: 2, name: modelo.nome })).toBeInTheDocument()
    }
    const grupos = screen.getByRole('list', { name: 'Grupos de Sprint de software' })
    expect(grupos).toHaveTextContent('Backlog')
    expect(grupos).toHaveTextContent('Concluído')
  })

  it('"Usar modelo" cria o board com nome e grupos do modelo e abre o board', async () => {
    vi.mocked(servico.criarBoard).mockResolvedValue({ id: 'b9', name: 'Sprint de software', created_at: '', workspace_id: 'w1' })
    const user = userEvent.setup()
    renderizar()

    await user.click(await botaoHabilitado('Sprint de software'))

    expect(servico.criarBoard).toHaveBeenCalledWith('w1', 'Sprint de software', MODELOS[0].grupos)
    expect(await screen.findByText('board aberto')).toBeInTheDocument()
  })

  it('enquanto cria, todos os botões ficam desabilitados (sem board duplicado)', async () => {
    vi.mocked(servico.criarBoard).mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderizar()

    await user.click(await botaoHabilitado('Onboarding'))

    expect(await screen.findByRole('button', { name: 'Criando… Onboarding' })).toBeDisabled()
    for (const botao of screen.getAllByRole('button')) expect(botao).toBeDisabled()
  })

  it('erro ao criar aparece em alerta e a pessoa fica na página', async () => {
    vi.mocked(servico.criarBoard).mockRejectedValue(new Error('Não foi possível salvar.'))
    const user = userEvent.setup()
    renderizar()

    await user.click(await botaoHabilitado('Onboarding'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar.')
    expect(screen.getByRole('heading', { level: 1, name: 'Modelos' })).toBeInTheDocument()
  })
})
