import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn(), auth: { getSession: vi.fn() } },
}))

import { supabase } from '@/lib/supabase'
import {
  adicionarMembro,
  atualizarGrupo,
  atualizarNomePerfil,
  buscarBoard,
  buscarMembros,
  buscarWorkspaceAtual,
  buscarWorkspaces,
  criarBoard,
  criarGrupo,
  criarWorkspace,
  excluirWorkspace,
  removerGrupo,
  renomearWorkspace,
} from './boards'

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

describe('workspaces', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null } as never)
  })

  const LISTA = [
    { id: 'w-convite', name: 'Do Pino', owner_id: 'u-pino' },
    { id: 'w-meu', name: 'Meu Workspace', owner_id: 'u1' },
    { id: 'w-clientes', name: 'Clientes', owner_id: 'u1' },
  ]
  const listaNoBanco = () => {
    const order = vi.fn().mockResolvedValue({ data: LISTA, error: null })
    vi.mocked(supabase.from).mockReturnValue({ select: () => ({ order }) } as never)
  }

  it('buscarWorkspaces lista os de que a pessoa é membro (o RLS filtra), com o dono', async () => {
    listaNoBanco()
    await expect(buscarWorkspaces()).resolves.toEqual(LISTA)
    expect(supabase.from).toHaveBeenCalledWith('workspaces')
  })

  it('buscarWorkspaceAtual: sem escolha guardada, o próprio (não o de quem convidou)', async () => {
    listaNoBanco()
    await expect(buscarWorkspaceAtual()).resolves.toEqual({ id: 'w-meu', name: 'Meu Workspace', owner_id: 'u1' })
  })

  it('buscarWorkspaceAtual: respeita o último escolhido', async () => {
    listaNoBanco()
    localStorage.setItem('workspaceAtualId', 'w-clientes')
    await expect(buscarWorkspaceAtual()).resolves.toMatchObject({ id: 'w-clientes' })
  })

  it('criarWorkspace grava o workspace SEM pedir a linha de volta e põe o dono como membro', async () => {
    // Sem ser membro ainda, o RLS de select esconderia a linha: por isso o id nasce no app.
    const inserirWs = vi.fn().mockResolvedValue({ error: null })
    const inserirMembro = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockImplementation(((t: string) =>
      t === 'workspaces' ? { insert: inserirWs } : { insert: inserirMembro }) as never)

    const ws = await criarWorkspace('  Clientes  ')

    expect(ws).toMatchObject({ name: 'Clientes', owner_id: 'u1' })
    expect(inserirWs).toHaveBeenCalledWith({ id: ws.id, name: 'Clientes', owner_id: 'u1' })
    expect(inserirMembro).toHaveBeenCalledWith({ workspace_id: ws.id, user_id: 'u1' })
  })

  it('criarWorkspace: se entrar como membro falha, apaga o workspace recém-criado (não fica órfão)', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockImplementation(((t: string) =>
      t === 'workspaces'
        ? { insert: vi.fn().mockResolvedValue({ error: null }), delete: () => ({ eq }) }
        : { insert: vi.fn().mockResolvedValue({ error: { code: '42501', message: 'rls' } }) }) as never)

    await expect(criarWorkspace('Clientes')).rejects.toThrow()
    expect(eq).toHaveBeenCalledWith('id', expect.any(String))
  })

  it('renomearWorkspace e excluirWorkspace agem só naquele id (o RLS limita ao dono)', async () => {
    const eqUpdate = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq: eqUpdate }))
    const eqDelete = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({ update, delete: () => ({ eq: eqDelete }) } as never)

    await renomearWorkspace('w-clientes', ' Clientes 2026 ')
    await excluirWorkspace('w-clientes')

    expect(update).toHaveBeenCalledWith({ name: 'Clientes 2026' })
    expect(eqUpdate).toHaveBeenCalledWith('id', 'w-clientes')
    expect(eqDelete).toHaveBeenCalledWith('id', 'w-clientes')
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

describe('criarGrupo', () => {
  beforeEach(() => vi.resetAllMocks())

  it('insere no board com nome, cor e a position vinda de quem chama, e devolve o grupo', async () => {
    const grupo = { id: 'g2', board_id: 'b1', name: 'Fase 2', color: 'grape', position: 3 }
    const single = vi.fn().mockResolvedValue({ data: grupo, error: null })
    const insert = vi.fn(() => ({ select: () => ({ single }) }))
    vi.mocked(supabase.from).mockReturnValue({ insert } as never)

    await expect(criarGrupo('b1', { name: 'Fase 2', color: 'grape' }, 3)).resolves.toEqual(grupo)

    expect(supabase.from).toHaveBeenCalledWith('groups')
    expect(insert).toHaveBeenCalledWith({ board_id: 'b1', name: 'Fase 2', color: 'grape', position: 3 })
  })

  it('traduz o erro do banco (nome fora de 1–120) em vez de vazar o cru', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { code: '23514', message: 'check violation' } })
    vi.mocked(supabase.from).mockReturnValue({ insert: () => ({ select: () => ({ single }) }) } as never)

    await expect(criarGrupo('b1', { name: '', color: 'azure' }, 0)).rejects.toThrow('Os dados informados não são válidos')
  })
})

describe('atualizarGrupo', () => {
  beforeEach(() => vi.resetAllMocks())

  it('atualiza só nome e cor do grupo pedido', async () => {
    const grupo = { id: 'g1', board_id: 'b1', name: 'Backlog', color: 'mint', position: 0 }
    const single = vi.fn().mockResolvedValue({ data: grupo, error: null })
    const eq = vi.fn(() => ({ select: () => ({ single }) }))
    const update = vi.fn(() => ({ eq }))
    vi.mocked(supabase.from).mockReturnValue({ update } as never)

    await expect(atualizarGrupo('g1', { name: 'Backlog', color: 'mint' })).resolves.toEqual(grupo)

    expect(supabase.from).toHaveBeenCalledWith('groups')
    expect(update).toHaveBeenCalledWith({ name: 'Backlog', color: 'mint' })
    expect(eq).toHaveBeenCalledWith('id', 'g1')
  })
})

describe('removerGrupo', () => {
  beforeEach(() => vi.resetAllMocks())

  it('apaga só o grupo pedido', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const remover = vi.fn(() => ({ eq }))
    vi.mocked(supabase.from).mockReturnValue({ delete: remover } as never)

    await removerGrupo('g1')

    expect(supabase.from).toHaveBeenCalledWith('groups')
    expect(eq).toHaveBeenCalledWith('id', 'g1')
  })

  it('propaga o erro traduzido quando o banco recusa', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      delete: () => ({ eq: vi.fn().mockResolvedValue({ error: { code: '42501', message: 'rls' } }) }),
    } as never)

    await expect(removerGrupo('g1')).rejects.toThrow('Você não tem permissão para isso.')
  })
})
