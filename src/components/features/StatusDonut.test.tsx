import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FatiaStatus } from '@/lib/metrics'
import { StatusDonut } from './StatusDonut'

const fatias: FatiaStatus[] = [
  { status: 'done', quantidade: 2, percentual: 50 },
  { status: 'working', quantidade: 2, percentual: 50 },
]

describe('StatusDonut', () => {
  it('mostra os numeros reais em texto, nao so no grafico (criterio F4.2)', () => {
    render(<StatusDonut fatias={fatias} />)
    expect(screen.getByText('Pronto: 2 (50%)')).toBeInTheDocument()
    expect(screen.getByText('Em andamento: 2 (50%)')).toBeInTheDocument()
  })

  it('o total de tarefas tambem aparece em texto', () => {
    render(<StatusDonut fatias={fatias} />)
    expect(screen.getByText('4 tarefas no total')).toBeInTheDocument()
  })

  it('nao renderiza nada para lista vazia (o StateView do pai ja cobre o vazio)', () => {
    const { container } = render(<StatusDonut fatias={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
