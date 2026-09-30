import { supabase } from '@/lib/supabase'
import { ErroDeDados, traduzirErro } from './erros'

/**
 * Inscrição de push deste dispositivo (tabela push_subscriptions, migration 0007).
 * `user_id` não vai: o `default auth.uid()` preenche e o RLS confere — ninguém inscreve outra pessoa.
 */
export async function salvarInscricaoPush(inscricao: PushSubscriptionJSON): Promise<void> {
  const { endpoint, keys } = inscricao
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new ErroDeDados('O navegador devolveu uma inscrição incompleta.')

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: 'endpoint' })
  if (error) throw traduzirErro(error)
}

export async function removerInscricaoPush(endpoint: string): Promise<void> {
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) throw traduzirErro(error)
}
