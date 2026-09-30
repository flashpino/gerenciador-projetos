import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '@/lib/supabase'
import { removerInscricaoPush, salvarInscricaoPush } from './push'

describe('inscrição de push', () => {
  beforeEach(() => vi.resetAllMocks())

  it('salvar grava endpoint e chaves; mesmo endpoint de novo atualiza, não duplica', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({ upsert } as never)

    await salvarInscricaoPush({ endpoint: 'https://push/x', keys: { p256dh: 'P', auth: 'A' } })

    expect(supabase.from).toHaveBeenCalledWith('push_subscriptions')
    expect(upsert).toHaveBeenCalledWith({ endpoint: 'https://push/x', p256dh: 'P', auth: 'A' }, { onConflict: 'endpoint' })
  })

  it('inscrição sem chaves é recusada antes de ir ao banco', async () => {
    await expect(salvarInscricaoPush({ endpoint: 'https://push/x' })).rejects.toThrow('inscrição incompleta')
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('remover apaga pelo endpoint (o RLS limita às da própria pessoa)', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({ delete: () => ({ eq }) } as never)

    await removerInscricaoPush('https://push/x')

    expect(eq).toHaveBeenCalledWith('endpoint', 'https://push/x')
  })
})
