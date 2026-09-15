import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renderiza o titulo como heading acessivel', () => {
    render(<App />)
    // consulta por role, nunca por classe CSS (regra do CLAUDE.md)
    expect(screen.getByRole('heading', { name: /gerenciador de projetos/i })).toBeVisible()
  })
})
