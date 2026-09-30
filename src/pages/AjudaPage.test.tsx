import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PERGUNTAS } from '@/lib/ajuda'
import AjudaPage from './AjudaPage'

describe('AjudaPage', () => {
  it('tem o título e uma entrada por pergunta do catálogo', () => {
    render(<AjudaPage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Ajuda' })).toBeInTheDocument()
    for (const p of PERGUNTAS) {
      expect(screen.getByText(p.pergunta)).toBeInTheDocument()
    }
  })

  it('cada resposta fica dentro do seu <details>, fechada até abrir', () => {
    const { container } = render(<AjudaPage />)
    const detalhes = container.querySelectorAll('details')
    expect(detalhes).toHaveLength(PERGUNTAS.length)
    for (const d of detalhes) expect(d).not.toHaveAttribute('open')
    const primeira = within(detalhes[0]!)
    expect(primeira.getByText(PERGUNTAS[0]!.pergunta)).toBeInTheDocument()
    expect(primeira.getByText(PERGUNTAS[0]!.resposta)).toBeInTheDocument()
  })

  it('não promete o que o produto não faz: convite não manda e-mail', () => {
    render(<AjudaPage />)
    const convite = PERGUNTAS.find((p) => /convid/i.test(p.pergunta))
    expect(convite?.resposta).toMatch(/nenhum e-mail/i)
  })
})
