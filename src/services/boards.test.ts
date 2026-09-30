import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn(), auth: { getSession: vi.fn() } },
}))

import { supabase } from '@/lib/supabase'
import { adicionarMembro, atualizarNomePerfil, buscarBoard, buscarMembros, buscarWorkspaceAtual, criarBoard } from './boards'

// boards: insert().select().single() → board criado; groups: insert() → o que o teste inspeciona.
function mockSupabase() {
  const inserirGrupos = vi.fn().mockResolvedValue({ error: null })
  const single = vi.fn().mockResolvedValue({ data: { id: 'b1', name: 'Sprint', created_at: '' }, error: null })
  vi.mocked(supabase.from).mockImplementation(((tabela: string) =>
    tabela === 'boards' ? { insert: () => ({ select: () => ({ single }) }) } : { insert: inserirGrupos }) as never)
  return inserirGrupos
}

describe('criarBoard', () => {
  beforeEach(() => vi.resetAllMocks())

  it('sem grupos, cria o grupo padrão "A fazer"', async () => {
    const inserirGrupos = mockSupabase()
    await criarBoard('w1', 'Sprint')
    expect(inserirGrupos).toHaveBeenCalledWith([{ board_id: 'b1', name: 'A fazer', color: 'azure', position: 0 }])
  })

  it('com grupos, insere todos num lote só, na ordem, com position pelo índice', async () => {
    const inserirGrupos = mockSupabase()
    const board = await criarBoard('w1', 'Sprint', [
      { name: 'Backlog', color: 'azure' },
      { name: 'Concluído', color: 'mint' },
    ])
    expect(board.id).toBe('b1')
    expect(inserirGrupos).toHaveBeenCalledTimes(1)
    expect(inserirGrupos).toHaveBeenCalledWith([
      { board_id: 'b1', name: 'Backlog', color: 'azure', position: 0 },
      { board_id: 'b1', name: 'Concluído', color: 'mint', position: 1 },
    ])
  })
})

describe('buscarWorkspaceAtual', () => {
  beforeEach(() => vi.resetAllMocks())

  it('pega o workspace do qual a pessoa é dona, não o primeiro visível', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null } as never)
    const eq = vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'w1', name: 'Meu Workspace' }, error: null }) }))
    vi.mocked(supabase.from).mockReturnValue({ select: () => ({ eq }) } as never)

    await expect(buscarWorkspaceAtual()).resolves.toEqual({ id: 'w1', name: 'Meu Workspace' })
    expect(supabase.from).toHaveBeenCalledWith('workspaces')
    expect(eq).toHaveBeenCalledWith('owner_id', 'u1')
  })
})

describe('buscarMembros', () => {
  beforeEach(() => vi.resetAllMocks())

  it('lista só os membros do workspace pedido, em ordem de nome', async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [
        { perfil: { id: 'u2', full_name: 'Beto Souza', avatar_url: null } },
        { perfil: { id: 'u1', full_name: 'Ana Lima', avatar_url: null } },
      ],
      error: null,
    })
    vi.mocked(supabase.from).mockReturnValue({ select: () => ({ eq }) } as never)

    const membros = await buscarMembros('w1')

    expect(supabase.from).toHaveBeenCalledWith('workspace_members')
    expect(eq).toHaveBeenCalledWith('workspace_id', 'w1')
    expect(membros.map((m) => m.full_name)).toEqual(['Ana Lima', 'Beto Souza'])
  })
})

describe('adicionarMembro', () => {
  beforeEach(() => vi.resetAllMocks())

  it('chama a RPC com o workspace e o e-mail', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never)
    await adicionarMembro('w1', 'b@x.com')
    expect(supabase.rpc).toHaveBeenCalledWith('adicionar_membro', { p_ws: 'w1', p_email: 'b@x.com' })
  })

  it('e-mail sem conta (P0002) vira mensagem de domínio, não a do banco', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: 'P0002', message: 'nenhuma conta com esse e-mail' },
    } as never)
    await expect(adicionarMembro('w1', 'z@x.com')).rejects.toThrow('Nenhuma conta com esse e-mail.')
  })

  it('quem não é dono (42501) recebe a mensagem de permissão', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'so o dono do workspace adiciona integrantes' },
    } as never)
    await expect(adicionarMembro('w1', 'b@x.com')).rejects.toThrow('Você não tem permissão para isso.')
  })
})

describe('buscarBoard', () => {
  beforeEach(() => vi.resetAllMocks())

  // owner_id decide quem vê os controles de dono no IntegrantesModal: um alias
  // errado no embed daria undefined e desligaria o convite em silêncio.
  it('achata o dono do workspace (embed) em owner_id', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'b1', name: 'Sprint', workspace_id: 'w1', workspace: { owner_id: 'u1' } },
      error: null,
    })
    vi.mocked(supabase.from).mockReturnValue({ select: () => ({ eq: () => ({ single }) }) } as never)

    await expect(buscarBoard('b1')).resolves.toEqual({ id: 'b1', name: 'Sprint', workspace_id: 'w1', owner_id: 'u1' })
  })
})

describe('atualizarNomePerfil', () => {
  beforeEach(() => vi.resetAllMocks())

  it('atualiza só o full_name do perfil da pessoa e devolve o perfil', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'u1', full_name: 'Ana Souza', avatar_url: null }, error: null })
    const eq = vi.fn(() => ({ select: () => ({ single }) }))
    const update = vi.fn(() => ({ eq }))
    vi.mocked(supabase.from).mockReturnValue({ update } as never)

    const perfil = await atualizarNomePerfil('u1', 'Ana Souza')

    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(update).toHaveBeenCalledWith({ full_name: 'Ana Souza' })
    expect(eq).toHaveBeenCalledWith('id', 'u1')
    expect(perfil).toEqual({ id: 'u1', full_name: 'Ana Souza', avatar_url: null })
  })

  it('traduz o erro do banco (constraint do nome) em vez de vazar o cru', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { code: '23514', message: 'check violation' } })
    vi.mocked(supabase.from).mockReturnValue({ update: () => ({ eq: () => ({ select: () => ({ single }) }) }) } as never)

    await expect(atualizarNomePerfil('u1', '')).rejects.toThrow('Os dados informados não são válidos')
  })
})
