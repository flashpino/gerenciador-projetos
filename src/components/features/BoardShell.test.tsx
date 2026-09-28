import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { BoardShell } from './BoardShell'

function renderizar(rota = '/boards/b1') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/boards/:boardId/*" element={<BoardShell titulo="Sprint Alpha">conteudo</BoardShell>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BoardShell', () => {
  beforeEach(() => localStorage.clear())

  it('abas apontam para as views DESTE board', () => {
    renderizar()
    expect(screen.getByRole('link', { name: 'Tabela Principal' })).toHaveAttribute('href', '/boards/b1')
    expect(screen.getByRole('link', { name: 'Kanban' })).toHaveAttribute('href', '/boards/b1/kanban')
    expect(screen.getByRole('link', { name: 'Gantt' })).toHaveAttribute('href', '/boards/b1/gantt')
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/boards/b1/dashboard')
  })

  it('marca a aba da view atual', () => {
    renderizar('/boards/b1/kanban')
    expect(screen.getByRole('link', { name: 'Kanban' })).toHaveAttribute('aria-current', 'page')
  })

  it('lembra o board visitado, pra raiz / voltar nele', () => {
    renderizar()
    expect(localStorage.getItem('ultimoBoardId')).toBe('b1')
  })

  it('mostra os ícones da barra superior desabilitados, cada um com aria-label explicando o motivo', () => {
    renderizar()
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
})
