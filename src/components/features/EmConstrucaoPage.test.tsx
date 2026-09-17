import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmConstrucaoPage } from './EmConstrucaoPage'

describe('EmConstrucaoPage', () => {
  it('mostra o título e a descrição recebidos por prop', () => {
    render(<EmConstrucaoPage titulo="Meus Painéis" descricao="Chega no próximo sub-projeto." />)

    expect(screen.getByText('Meus Painéis')).toBeInTheDocument()
    expect(screen.getByText('Chega no próximo sub-projeto.')).toBeInTheDocument()
  })
})
