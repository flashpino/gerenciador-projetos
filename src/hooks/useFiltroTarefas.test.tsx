import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { useFiltroTarefas } from './useFiltroTarefas'

function montar(url: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  )
  return renderHook(() => ({ ...useFiltroTarefas(), local: useLocation() }), { wrapper })
}

describe('useFiltroTarefas', () => {
  it('lê o filtro da URL', () => {
    const { result } = montar('/b?q=login&status=working,review&atrasadas=1')
    expect(result.current.filtro).toMatchObject({ q: 'login', status: ['working', 'review'], atrasadas: true })
  })

  it('URL sem filtro dá o filtro vazio', () => {
    const { result } = montar('/b')
    expect(result.current.filtro.q).toBe('')
    expect(result.current.filtro.status).toEqual([])
  })

  it('definir muda só o que foi pedido e preserva o resto do filtro e da URL', () => {
    const { result } = montar('/b?status=working&aba=2')
    act(() => result.current.definir({ q: 'api' }))
    expect(result.current.filtro).toMatchObject({ q: 'api', status: ['working'] })
    expect(result.current.local.search).toContain('aba=2')
    expect(result.current.local.pathname).toBe('/b')
  })

  it('definir com lista vazia remove aquela categoria', () => {
    const { result } = montar('/b?status=working&prio=high')
    act(() => result.current.definir({ status: [] }))
    expect(result.current.filtro.status).toEqual([])
    expect(result.current.filtro.prioridade).toEqual(['high'])
    expect(result.current.local.search).not.toContain('status')
  })

  it('limpar zera o filtro mas não apaga parâmetros que não são do filtro', () => {
    const { result } = montar('/b?q=x&status=done&aba=2')
    act(() => result.current.limpar())
    expect(result.current.filtro.q).toBe('')
    expect(result.current.filtro.status).toEqual([])
    expect(result.current.local.search).toBe('?aba=2')
  })
})
