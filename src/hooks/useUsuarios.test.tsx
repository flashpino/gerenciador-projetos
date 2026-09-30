import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarWrapper } from '@/test/query'

vi.mock('@/services/usuarios', () => ({
  listarUsuarios: vi.fn(),
  criarUsuario: vi.fn(),
  atualizarUsuario: vi.fn(),
  excluirUsuario: vi.fn(),
}))

import * as servico from '@/services/usuarios'
import { useAtualizarUsuario, useCriarUsuario, useExcluirUsuario, useUsuarios } from './useUsuarios'

describe('useUsuarios', () => {
  beforeEach(() => vi.resetAllMocks())

  it('carrega a lista de contas', async () => {
    vi.mocked(servico.listarUsuarios).mockResolvedValue([
      { id: 'u1', email: 'a@x.dev', nome: 'Ana', criadoEm: '', ultimoAcesso: null, master: true },
    ])
    const { wrapper } = criarWrapper()
    const { result } = renderHook(() => useUsuarios(), { wrapper })
    await waitFor(() => expect(result.current.data?.[0]?.email).toBe('a@x.dev'))
  })

  it.each([
    ['criar', () => useCriarUsuario(), { email: 'b@x.dev', nome: 'Beto', senha: 'provisoria1' }, () => servico.criarUsuario],
    ['editar', () => useAtualizarUsuario(), { id: 'u2', nome: 'Beto Souza' }, () => servico.atualizarUsuario],
  ] as const)('%s chama o serviço e recarrega a lista', async (_nome, hook, vars, fn) => {
    vi.mocked(fn()).mockResolvedValue(undefined)
    const { wrapper, client } = criarWrapper()
    const espiao = vi.spyOn(client, 'invalidateQueries')
    // Os dois hooks têm variáveis de tipos diferentes: o it.each só precisa de mutate/isSuccess.
    const { result } = renderHook(() => hook() as unknown as { mutate: (v: unknown) => void; isSuccess: boolean }, {
      wrapper,
    })

    result.current.mutate(vars)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fn()).toHaveBeenCalledWith(vars)
    expect(espiao).toHaveBeenCalledWith({ queryKey: ['usuarios'] })
  })

  it('excluir manda id e confirmação e recarrega a lista', async () => {
    vi.mocked(servico.excluirUsuario).mockResolvedValue(undefined)
    const { wrapper, client } = criarWrapper()
    const espiao = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useExcluirUsuario(), { wrapper })

    result.current.mutate({ id: 'u2', confirmacao: 'b@x.dev' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(servico.excluirUsuario).toHaveBeenCalledWith('u2', 'b@x.dev')
    expect(espiao).toHaveBeenCalledWith({ queryKey: ['usuarios'] })
  })
})
