import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBuscaDoBoard } from './useBuscaDoBoard'
import { useFiltroTarefas } from './useFiltroTarefas'

function montar(url = '/b') {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  )
  return renderHook(() => ({ busca: useBuscaDoBoard(), filtro: useFiltroTarefas(), local: useLocation() }), { wrapper })
}

describe('useBuscaDoBoard', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('começa com o que já está na URL', () => {
    const { result } = montar('/b?q=login')
    expect(result.current.busca.texto).toBe('login')
  })

  it('o campo mostra o que foi digitado na hora; a URL só é escrita depois da pausa', () => {
    const { result } = montar()
    act(() => result.current.busca.setTexto('api'))
    expect(result.current.busca.texto).toBe('api')
    expect(result.current.local.search).toBe('')
    act(() => void vi.advanceTimersByTime(300))
    expect(result.current.local.search).toBe('?q=api')
    expect(result.current.filtro.filtro.q).toBe('api')
  })

  it('digitação rápida escreve UMA vez, com o texto final, e nunca devolve o campo para um valor antigo', () => {
    const { result } = montar()
    act(() => result.current.busca.setTexto('t'))
    act(() => void vi.advanceTimersByTime(100))
    act(() => result.current.busca.setTexto('ta'))
    act(() => void vi.advanceTimersByTime(100))
    act(() => result.current.busca.setTexto('tar'))
    expect(result.current.busca.texto).toBe('tar')
    act(() => void vi.advanceTimersByTime(300))
    expect(result.current.busca.texto).toBe('tar')
    expect(result.current.filtro.filtro.q).toBe('tar')
  })

  it('a URL mudando por fora (limpar filtros, botão voltar) reflete no campo', () => {
    const { result } = montar('/b?q=login')
    act(() => result.current.filtro.limpar())
    expect(result.current.busca.texto).toBe('')
  })

  it('apagar o texto tira o parâmetro da URL', () => {
    const { result } = montar('/b?q=login&aba=2')
    act(() => result.current.busca.setTexto(''))
    act(() => void vi.advanceTimersByTime(300))
    expect(result.current.local.search).toBe('?aba=2')
  })
})
