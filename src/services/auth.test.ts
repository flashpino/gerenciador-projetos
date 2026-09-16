import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}))

import { supabase } from '@/lib/supabase'
import { cadastrar, entrar, escutarSessao, obterSessaoAtual, sair } from './auth'

describe('entrar', () => {
  beforeEach(() => vi.resetAllMocks())

  it('credenciais válidas resolve sem lançar', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as never)

    await expect(entrar('a@x.com', 'senha123')).resolves.toBeUndefined()
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@x.com',
      password: 'senha123',
    })
  })

  it('credenciais inválidas lança mensagem genérica, não a mensagem crua do Supabase (F0.2)', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', status: 400, name: 'AuthApiError' },
    } as never)

    const erro = await entrar('a@x.com', 'errada').catch((e: Error) => e)
    expect(erro).toMatchObject({ message: 'E-mail ou senha inválidos.' })
  })

  it('a mensagem é idêntica para e-mail inexistente e para senha errada — nenhuma enumeração', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', status: 400 },
    } as never)
    const erroEmailInexistente = (await entrar('inexistente@x.com', 'qualquer').catch((e: Error) => e)) as Error

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', status: 400 },
    } as never)
    const erroSenhaErrada = (await entrar('existente@x.com', 'errada').catch((e: Error) => e)) as Error

    expect(erroEmailInexistente.message).toBe(erroSenhaErrada.message)
  })

  it('erro sem mensagem reconhecida vira mensagem de fallback', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'timeout', status: 0 },
    } as never)

    const erro = await entrar('a@x.com', 'senha123').catch((e: Error) => e)
    expect(erro).toMatchObject({ message: 'Não foi possível completar a operação. Tente de novo.' })
  })
})

describe('cadastrar', () => {
  beforeEach(() => vi.resetAllMocks())

  it('envia full_name em options.data — handle_new_user depende desse campo', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as never)

    await cadastrar('a@x.com', 'senha123', 'Ana')

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'a@x.com',
      password: 'senha123',
      options: { data: { full_name: 'Ana' } },
    })
  })

  it('e-mail já cadastrado vira mensagem de domínio', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered', status: 422 },
    } as never)

    const erro = await cadastrar('a@x.com', 'senha123', 'Ana').catch((e: Error) => e)
    expect(erro).toMatchObject({ message: 'Este e-mail já está cadastrado.' })
  })

  it('senha curta vira mensagem de domínio', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Password should be at least 6 characters', status: 422 },
    } as never)

    const erro = await cadastrar('a@x.com', '123', 'Ana').catch((e: Error) => e)
    expect(erro).toMatchObject({ message: 'A senha precisa ter pelo menos 6 caracteres.' })
  })
})

describe('sair', () => {
  it('chama signOut', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as never)
    await sair()
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })
})

describe('obterSessaoAtual', () => {
  beforeEach(() => vi.resetAllMocks())

  it('sem sessao devolve null', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never)
    await expect(obterSessaoAtual()).resolves.toBeNull()
  })

  it('com sessao devolve o formato Usuario — nunca o User cru do Supabase', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'a@x.com', aud: 'authenticated' } } },
    } as never)
    await expect(obterSessaoAtual()).resolves.toEqual({ id: 'u1', email: 'a@x.com' })
  })
})

describe('escutarSessao', () => {
  beforeEach(() => vi.resetAllMocks())

  it('repassa o usuario traduzido e devolve a funcao de cancelamento', () => {
    const unsubscribe = vi.fn()
    let emitir!: (evento: string, sessao: { user: { id: string; email: string } } | null) => void
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
      emitir = cb as never
      return { data: { subscription: { unsubscribe } } } as never
    })

    const callback = vi.fn()
    const cancelar = escutarSessao(callback)

    emitir('SIGNED_IN', { user: { id: 'u1', email: 'a@x.com' } })
    expect(callback).toHaveBeenCalledWith({ id: 'u1', email: 'a@x.com' })

    emitir('SIGNED_OUT', null)
    expect(callback).toHaveBeenCalledWith(null)

    cancelar()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
