import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Tabs } from './Tabs'

const COLUNAS = [
  { id: 'not_started', rotulo: 'Não iniciado', contagem: 2 },
  { id: 'working', rotulo: 'Em andamento', contagem: 1 },
  { id: 'done', rotulo: 'Pronto', contagem: 0 },
]

describe('Tabs — abas reais (sem href)', () => {
  it('marca só a aba ativa com aria-selected', () => {
    render(<Tabs rotulo="Colunas" items={COLUNAS} value="working" onChange={() => {}} />)

    expect(screen.getByRole('tab', { name: /em andamento/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /não iniciado/i })).toHaveAttribute('aria-selected', 'false')
  })

  it('mostra a contagem em texto junto do rótulo', () => {
    render(<Tabs rotulo="Colunas" items={COLUNAS} value="working" onChange={() => {}} />)

    expect(screen.getByRole('tab', { name: 'Não iniciado, 2 tarefas' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Pronto, 0 tarefas' })).toBeVisible()
  })

  // WAI-ARIA: numa tablist só a aba ativa entra na ordem de Tab; as setas movem
  // entre elas. Sem isso, navegar 5 colunas custa 5 Tabs e o usuário de teclado
  // atravessa o board inteiro para chegar no conteúdo.
  it('navega entre abas por seta e move a seleção', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Tabs rotulo="Colunas" items={COLUNAS} value="not_started" onChange={onChange} />)

    await user.tab()
    expect(screen.getByRole('tab', { name: /não iniciado/i })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('working')
  })

  it('a seta circula do último para o primeiro', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Tabs rotulo="Colunas" items={COLUNAS} value="done" onChange={onChange} />)

    await user.tab()
    await user.keyboard('{ArrowRight}')

    expect(onChange).toHaveBeenCalledWith('not_started')
  })

  it('clicar numa aba chama onChange com o id dela', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Tabs rotulo="Colunas" items={COLUNAS} value="not_started" onChange={onChange} />)

    await user.click(screen.getByRole('tab', { name: /pronto/i }))

    expect(onChange).toHaveBeenCalledWith('done')
  })
})

describe('Tabs — navegação (com href)', () => {
  const VIEWS = [
    { id: '/', rotulo: 'Tabela Principal', href: '/' },
    { id: '/kanban', rotulo: 'Kanban', href: '/kanban' },
  ]

  it('vira navegação de verdade, não tablist — trocar de view é mudar de rota', () => {
    render(
      <MemoryRouter initialEntries={['/kanban']}>
        <Tabs rotulo="Visões do quadro" items={VIEWS} value="/kanban" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('navigation', { name: 'Visões do quadro' })).toBeVisible()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kanban' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Tabela Principal' })).not.toHaveAttribute('aria-current')
  })
})
