import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, Outlet } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Troca de página: a rota lazy nunca termina de carregar (import pendente). O que a pessoa vê nesse meio-tempo
 * é o que importa — a página antiga congelada parece travamento; o skeleton diz "está indo".
 * Só o miolo é real (App + roteador + AppShell); sessão, sidebar e as páginas são falsas.
 */
vi.mock('@/components/SessaoProvider', () => ({ SessaoProvider: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('@/components/RotaProtegida', () => ({ RotaProtegida: () => <Outlet /> }))
vi.mock('@/components/features/Sidebar', () => ({ Sidebar: () => null }))
vi.mock('@/components/features/AvisoPWA', () => ({ AvisoPWA: () => null }))
vi.mock('@/pages/AberturaPage', () => ({
  default: () => (
    <>
      <p>página antiga</p>
      <Link to="/atividades">ir para atividades</Link>
    </>
  ),
}))
vi.mock('@/pages/BoardPage', () => ({ default: () => null }))
vi.mock('@/pages/LoginPage', () => ({ default: () => null }))
vi.mock('@/pages/NaoEncontrada', () => ({ default: () => null }))
// Import que nunca resolve = chunk lazy ainda a caminho.
vi.mock('@/pages/AtividadesPage', () => new Promise(() => {}))

import App from './App'

describe('troca de página', () => {
  beforeEach(() => window.history.pushState({}, '', '/'))

  it('mostra o skeleton na hora, com a página antiga escondida, enquanto a próxima carrega', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('link', { name: 'ir para atividades' }))

    expect(await screen.findByRole('status')).toHaveAttribute('aria-busy', 'true')
    // O React esconde (display:none) em vez de desmontar o que estava na tela quando o Suspense suspende de novo.
    expect(screen.getByText('página antiga')).not.toBeVisible()
  })
})
