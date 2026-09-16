import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PriorityCell, StatusCell } from './EnumCell'

describe('StatusCell', () => {
  it('mostra o status em TEXTO, nao so por cor (WCAG 1.4.1)', () => {
    render(<StatusCell valor="working" nomeTarefa="Refatorar" aoMudar={() => {}} />)
    expect(screen.getByRole('button', { name: /em andamento/i })).toBeVisible()
  })

  it('abre o menu e chama aoMudar com o status escolhido (criterio F1.2)', async () => {
    const user = userEvent.setup()
    const aoMudar = vi.fn()
    render(<StatusCell valor="working" nomeTarefa="Refatorar" aoMudar={aoMudar} />)

    await user.click(screen.getByRole('button', { name: /status de refatorar/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Pronto' }))

    expect(aoMudar).toHaveBeenCalledWith('done')
  })

  it('e operavel SO por teclado — seta abre, setas navegam, Enter escolhe', async () => {
    const user = userEvent.setup()
    const aoMudar = vi.fn()
    render(<StatusCell valor="not_started" nomeTarefa="Refatorar" aoMudar={aoMudar} />)

    await user.tab()
    await user.keyboard('{ArrowDown}')          // abre, foca o selecionado (not_started, indice 0)
    await user.keyboard('{ArrowDown}{Enter}')   // desce para working e escolhe

    expect(aoMudar).toHaveBeenCalledWith('working')
  })

  it('Esc fecha o menu e devolve o foco ao gatilho', async () => {
    const user = userEvent.setup()
    render(<StatusCell valor="working" nomeTarefa="Refatorar" aoMudar={() => {}} />)

    const gatilho = screen.getByRole('button', { name: /status de refatorar/i })
    await user.click(gatilho)
    expect(screen.getByRole('menu')).toBeVisible()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(gatilho).toHaveFocus()
  })
})

describe('PriorityCell — mesmo componente, outro enum', () => {
  it('mostra a prioridade em texto e permite trocar', async () => {
    const user = userEvent.setup()
    const aoMudar = vi.fn()
    render(<PriorityCell valor="medium" nomeTarefa="Refatorar" aoMudar={aoMudar} />)

    expect(screen.getByRole('button', { name: /média/i })).toBeVisible()
    await user.click(screen.getByRole('button', { name: /prioridade de refatorar/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Crítica' }))

    expect(aoMudar).toHaveBeenCalledWith('critical')
  })
})
