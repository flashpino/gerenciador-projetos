import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MetricTile } from './MetricTile'

describe('MetricTile', () => {
  it('mostra titulo e valor', () => {
    render(<MetricTile titulo="Taxa de Conclusão" valor="78.4%" />)
    expect(screen.getByText('Taxa de Conclusão')).toBeInTheDocument()
    expect(screen.getByText('78.4%')).toBeInTheDocument()
  })

  it('mostra selo de atencao quando atencao=true', () => {
    render(<MetricTile titulo="Tarefas Atrasadas" valor="3" atencao />)
    expect(screen.getByText('Atenção')).toBeInTheDocument()
  })

  it('nao mostra selo de atencao por padrao', () => {
    render(<MetricTile titulo="Taxa de Conclusão" valor="78.4%" />)
    expect(screen.queryByText('Atenção')).not.toBeInTheDocument()
  })

  it('mostra barra de progresso quando a prop progresso e passada', () => {
    render(<MetricTile titulo="Taxa de Conclusão" valor="78.4%" progresso={78.4} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '78.4')
  })
})
