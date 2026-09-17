import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { BoardShell } from './BoardShell'

describe('BoardShell', () => {
  it('mostra os ícones da barra superior desabilitados, cada um com aria-label explicando o motivo', () => {
    render(
      <MemoryRouter>
        <BoardShell titulo="Tabela Principal">conteudo</BoardShell>
      </MemoryRouter>,
    )

    for (const nome of [
      'Favoritar — em breve',
      'Buscar neste quadro — em breve',
      'Filtrar — em breve',
      'Convidar integrantes — em breve',
      'Novo item — em breve',
    ]) {
      expect(screen.getByRole('button', { name: nome })).toBeDisabled()
    }
  })

  it('não tem mais botão "Sair" — migrou pra Sidebar (Task 5)', () => {
    render(
      <MemoryRouter>
        <BoardShell titulo="Tabela Principal">conteudo</BoardShell>
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
  })
})
