import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '@/lib/supabase'
import { criarBoard } from './boards'

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
