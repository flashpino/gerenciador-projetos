import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/useSessao', () => ({ useSessao: vi.fn() }))

import { useSessao } from '@/hooks/useSessao'
import { RotaProtegida } from './RotaProtegida'

function renderComRota(inicial: string) {
  return render(
    <MemoryRouter initialEntries={[inicial]}>
      <Routes>
        <Route element={<RotaProtegida />}>
          <Route path="/" element={<span>conteudo protegido</span>} />
        </Route>
        <Route path="/login" element={<span>tela de login</span>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RotaProtegida', () => {
  it('enquanto carrega, nao mostra o conteudo nem redireciona (F0.3 — nao pisca)', () => {
    vi.mocked(useSessao).mockReturnValue({ usuario: null, carregando: true })
    renderComRota('/')
    expect(screen.queryByText('conteudo protegido')).not.toBeInTheDocument()
    expect(screen.queryByText('tela de login')).not.toBeInTheDocument()
  })

  it('sem sessao, redireciona para /login', async () => {
    vi.mocked(useSessao).mockReturnValue({ usuario: null, carregando: false })
    renderComRota('/')
    expect(await screen.findByText('tela de login')).toBeInTheDocument()
  })

  it('com sessao, renderiza o conteudo protegido', () => {
    vi.mocked(useSessao).mockReturnValue({ usuario: { id: '1' } as never, carregando: false })
    renderComRota('/')
    expect(screen.getByText('conteudo protegido')).toBeInTheDocument()
  })
})
