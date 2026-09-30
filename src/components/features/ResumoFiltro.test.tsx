import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResumoFiltro } from './ResumoFiltro'

describe('ResumoFiltro', () => {
  it('diz quantas tarefas aparecem de quantas existem', () => {
    render(<ResumoFiltro visiveis={3} total={8} aoLimpar={() => {}} />)
    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 3 de 8 tarefas')
  })

  it('singular quando o total é uma só', () => {
    render(<ResumoFiltro visiveis={1} total={1} aoLimpar={() => {}} />)
    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 1 de 1 tarefa')
    expect(screen.getByRole('status')).not.toHaveTextContent('tarefas')
  })

  it('o botão limpa a busca e os filtros', async () => {
    const aoLimpar = vi.fn()
    render(<ResumoFiltro visiveis={3} total={8} aoLimpar={aoLimpar} />)
    await userEvent.click(screen.getByRole('button', { name: 'Limpar busca e filtros' }))
    expect(aoLimpar).toHaveBeenCalledOnce()
  })
})
