import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GroupColor } from '@/types/domain'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/boards', () => ({
  criarGrupo: vi.fn(),
  atualizarGrupo: vi.fn(),
}))

import * as servico from '@/services/boards'
import { GrupoFormModal } from './GrupoFormModal'

function renderizar(grupo: { id: string; name: string; color: GroupColor } | null, aoFechar = vi.fn()) {
  const { wrapper: QueryWrapper } = criarWrapper()
  render(
    <QueryWrapper>
      <GrupoFormModal aberto aoFechar={aoFechar} boardId="b1" grupo={grupo} proximaPosicao={3} />
    </QueryWrapper>,
  )
  return aoFechar
}

describe('GrupoFormModal', () => {
  beforeEach(() => vi.resetAllMocks())

  it('cria o grupo no board, com a cor escolhida e a próxima posição', async () => {
    vi.mocked(servico.criarGrupo).mockResolvedValue({ id: 'g9' } as never)
    const user = userEvent.setup()
    const aoFechar = renderizar(null)

    await screen.findByRole('dialog', { name: 'Novo grupo' })
    await user.type(screen.getByLabelText('Nome do grupo'), 'Fase 2')
    await user.selectOptions(screen.getByLabelText('Cor'), 'Verde')
    await user.click(screen.getByRole('button', { name: 'Criar grupo' }))

    expect(servico.criarGrupo).toHaveBeenCalledWith('b1', { name: 'Fase 2', color: 'mint' }, 3)
    await vi.waitFor(() => expect(aoFechar).toHaveBeenCalled())
  })

  it('sem escolher cor, o grupo novo nasce azul', async () => {
    vi.mocked(servico.criarGrupo).mockResolvedValue({ id: 'g9' } as never)
    const user = userEvent.setup()
    renderizar(null)

    await screen.findByRole('dialog', { name: 'Novo grupo' })
    await user.type(screen.getByLabelText('Nome do grupo'), 'Backlog')
    await user.click(screen.getByRole('button', { name: 'Criar grupo' }))

    expect(servico.criarGrupo).toHaveBeenCalledWith('b1', { name: 'Backlog', color: 'azure' }, 3)
  })

  it('nome vazio (só espaços) bloqueia e explica, sem chamar o serviço', async () => {
    const user = userEvent.setup()
    renderizar(null)

    await screen.findByRole('dialog', { name: 'Novo grupo' })
    await user.type(screen.getByLabelText('Nome do grupo'), '   ')
    await user.click(screen.getByRole('button', { name: 'Criar grupo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('O nome não pode ficar vazio.')
    expect(servico.criarGrupo).not.toHaveBeenCalled()
  })

  it('renomear vem com nome e cor atuais preenchidos e salva as mudanças', async () => {
    vi.mocked(servico.atualizarGrupo).mockResolvedValue({ id: 'g1' } as never)
    const user = userEvent.setup()
    const aoFechar = renderizar({ id: 'g1', name: 'A fazer', color: 'grape' })

    await screen.findByRole('dialog', { name: 'Renomear grupo' })
    const campo = screen.getByLabelText('Nome do grupo')
    expect(campo).toHaveValue('A fazer')
    expect(screen.getByLabelText('Cor')).toHaveValue('grape')

    await user.clear(campo)
    await user.type(campo, 'Backlog')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(servico.atualizarGrupo).toHaveBeenCalledWith('g1', { name: 'Backlog', color: 'grape' })
    await vi.waitFor(() => expect(aoFechar).toHaveBeenCalled())
  })

  it('erro do servidor aparece no formulário, sem fechar', async () => {
    vi.mocked(servico.criarGrupo).mockRejectedValue(new Error('Não foi possível salvar.'))
    const user = userEvent.setup()
    const aoFechar = renderizar(null)

    await screen.findByRole('dialog', { name: 'Novo grupo' })
    await user.type(screen.getByLabelText('Nome do grupo'), 'Fase 2')
    await user.click(screen.getByRole('button', { name: 'Criar grupo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar.')
    expect(aoFechar).not.toHaveBeenCalled()
  })
})
