import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { useAgrupamento } from './useAgrupamento'

function montar(url: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  )
  return renderHook(() => ({ ...useAgrupamento(), local: useLocation() }), { wrapper })
}

describe('useAgrupamento', () => {
  it('sem parâmetro, agrupa por grupo (o padrão da tabela)', () => {
    expect(montar('/b').result.current.agrupamento).toBe('grupo')
  })

  it('lê ?agrupar=status da URL', () => {
    expect(montar('/b?agrupar=status').result.current.agrupamento).toBe('status')
  })

  it('valor inválido (URL editada à mão) cai em grupo', () => {
    expect(montar('/b?agrupar=prioridade').result.current.agrupamento).toBe('grupo')
  })

  it('definir "status" escreve na URL e preserva busca, filtros e o resto', () => {
    const { result } = montar('/b?q=api&status=working&aba=2')
    act(() => result.current.definir('status'))
    expect(result.current.agrupamento).toBe('status')
    expect(result.current.local.search).toContain('agrupar=status')
    expect(result.current.local.search).toContain('q=api')
    expect(result.current.local.search).toContain('status=working')
    expect(result.current.local.search).toContain('aba=2')
  })

  it('voltar para "grupo" remove o parâmetro: a URL padrão fica limpa', () => {
    const { result } = montar('/b?agrupar=status&q=api')
    act(() => result.current.definir('grupo'))
    expect(result.current.agrupamento).toBe('grupo')
    expect(result.current.local.search).toBe('?q=api')
  })
})
