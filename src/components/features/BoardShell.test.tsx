import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/services/auth', () => ({ sair: vi.fn() }))

import * as servico from '@/services/auth'
import { BoardShell } from './BoardShell'

describe('BoardShell', () => {
  it('o botão "Sair" chama o serviço de logout (F0 — sem isso não existe logout na UI)', async () => {
    vi.mocked(servico.sair).mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <BoardShell titulo="Tabela Principal">conteudo</BoardShell>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Sair' }))
    expect(servico.sair).toHaveBeenCalled()
  })
})
