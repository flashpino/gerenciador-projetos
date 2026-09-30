import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }))

import { supabase } from '@/lib/supabase'
import { atualizarUsuario, criarUsuario, excluirUsuario, listarUsuarios } from './usuarios'

const invoke = () => vi.mocked(supabase.functions.invoke)

/** Erro HTTP da função: o supabase-js entrega a Response em `context`. */
const erroHttp = (status: number, corpo: unknown) =>
  ({ data: null, error: { name: 'FunctionsHttpError', context: new Response(JSON.stringify(corpo), { status }) } }) as never

describe('serviço de usuários (função `usuarios` no servidor)', () => {
  beforeEach(() => vi.resetAllMocks())

  it('listar chama a função com a ação e devolve as contas', async () => {
    const contas = [{ id: 'u1', email: 'a@x.dev', nome: 'Ana', criadoEm: '2026-09-01', ultimoAcesso: null, master: true }]
    invoke().mockResolvedValue({ data: { usuarios: contas }, error: null } as never)

    await expect(listarUsuarios()).resolves.toEqual(contas)
    expect(supabase.functions.invoke).toHaveBeenCalledWith('usuarios', { body: { acao: 'listar' } })
  })

  it('criar envia e-mail, nome e senha provisória', async () => {
    invoke().mockResolvedValue({ data: { ok: true }, error: null } as never)
    await criarUsuario({ email: 'b@x.dev', nome: 'Beto', senha: 'provisoria1' })
    expect(supabase.functions.invoke).toHaveBeenCalledWith('usuarios', {
      body: { acao: 'criar', email: 'b@x.dev', nome: 'Beto', senha: 'provisoria1' },
    })
  })

  it('editar e excluir mandam o id (e a confirmação digitada, no excluir)', async () => {
    invoke().mockResolvedValue({ data: { ok: true }, error: null } as never)
    await atualizarUsuario({ id: 'u2', nome: 'Beto Souza' })
    await excluirUsuario('u2', 'b@x.dev')
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(1, 'usuarios', { body: { acao: 'editar', id: 'u2', nome: 'Beto Souza' } })
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(2, 'usuarios', { body: { acao: 'excluir', id: 'u2', confirmacao: 'b@x.dev' } })
  })

  it('a mensagem de erro do servidor chega intacta à tela', async () => {
    invoke().mockResolvedValue(erroHttp(400, { erro: 'Você não pode excluir a própria conta.' }))
    await expect(excluirUsuario('u1', 'a@x.dev')).rejects.toThrow('Você não pode excluir a própria conta.')
  })

  it('sem mensagem do servidor (ex.: rede), cai numa mensagem genérica em português', async () => {
    invoke().mockResolvedValue({ data: null, error: { name: 'FunctionsFetchError', context: undefined } } as never)
    await expect(listarUsuarios()).rejects.toThrow('Não foi possível falar com o servidor.')
  })
})
