/**
 * Função `notificar` (Supabase Edge Function, Deno) — envia o push de uma atividade nova.
 *
 * Disparo: Database Webhook em INSERT de `activities` (0004) → POST aqui, com o header
 * `x-webhook-secret`. Configuração passo a passo: docs/notificacoes-push.md.
 *
 * ZONA VERMELHA (autorização + validação de entrada no servidor): escrito pelo agente,
 * revisado e publicado por humano.
 *
 * Usa a SERVICE ROLE — existe só aqui, no servidor, injetada pelo Supabase. Nunca no app.
 */
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { timingSafeEqual } from 'jsr:@std/crypto@1/timing-safe-equal'
import { deveNotificar, montarNotificacao, type Atividade } from './mensagem.ts'

const ambiente = (nome: string): string => {
  const valor = Deno.env.get(nome)
  if (!valor) throw new Error(`Segredo ${nome} não configurado`)
  return valor
}

webpush.setVapidDetails(ambiente('VAPID_SUBJECT'), ambiente('VAPID_PUBLIC_KEY'), ambiente('VAPID_PRIVATE_KEY'))
const banco = createClient(ambiente('SUPABASE_URL'), ambiente('SUPABASE_SERVICE_ROLE_KEY'))
const SEGREDO = new TextEncoder().encode(ambiente('WEBHOOK_SECRET'))
const TIPOS = new Set(['task_created', 'status_changed', 'comment_added'])

/** Comparação em tempo constante: `===` vazaria, pelo tempo de resposta, quantos caracteres batem. */
function segredoConfere(recebido: string | null): boolean {
  if (!recebido) return false
  const bytes = new TextEncoder().encode(recebido)
  return bytes.length === SEGREDO.length && timingSafeEqual(bytes, SEGREDO)
}

/** Só aceita o formato exato do webhook de INSERT em activities. Qualquer outra coisa é 400. */
function lerAtividade(corpo: unknown): Atividade | null {
  if (typeof corpo !== 'object' || corpo === null) return null
  const { type, table, record } = corpo as { type?: unknown; table?: unknown; record?: Record<string, unknown> }
  if (type !== 'INSERT' || table !== 'activities' || typeof record !== 'object' || record === null) return null
  if (typeof record.board_id !== 'string' || typeof record.task_title !== 'string') return null
  if (typeof record.kind !== 'string' || !TIPOS.has(record.kind)) return null
  return record as unknown as Atividade
}

const resposta = (status: number, corpo?: unknown) =>
  new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return resposta(405)
  if (!segredoConfere(req.headers.get('x-webhook-secret'))) return resposta(401)

  let atividade: Atividade | null
  try {
    atividade = lerAtividade(await req.json())
  } catch {
    atividade = null
  }
  if (!atividade) return resposta(400, { erro: 'payload inválido' })
  if (!atividade.task_id) return resposta(204) // tarefa já apagada: não há responsável

  const { data: tarefa, error: erroTarefa } = await banco
    .from('tasks')
    .select('assignee_id')
    .eq('id', atividade.task_id)
    .maybeSingle()
  if (erroTarefa) return resposta(500, { erro: 'falha ao ler a tarefa' })

  const responsavel = (tarefa?.assignee_id as string | null | undefined) ?? null
  if (!deveNotificar(responsavel, atividade.actor_id)) return resposta(204)

  const [{ data: ator }, { data: inscricoes, error: erroInscricoes }] = await Promise.all([
    atividade.actor_id
      ? banco.from('profiles').select('full_name').eq('id', atividade.actor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    banco.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', responsavel),
  ])
  if (erroInscricoes) return resposta(500, { erro: 'falha ao ler as inscrições' })

  const mensagem = JSON.stringify(montarNotificacao(atividade, (ator?.full_name as string | undefined) ?? null))

  let enviadas = 0
  await Promise.all(
    (inscricoes ?? []).map(async (i) => {
      try {
        await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, mensagem, {
          TTL: 60 * 60, // aparelho desligado: entrega em até 1h, depois descarta
        })
        enviadas++
      } catch (e) {
        // 404/410: o aparelho desinscreveu ou a inscrição venceu — limpa para não tentar de novo.
        const codigo = (e as { statusCode?: number }).statusCode
        if (codigo === 404 || codigo === 410) await banco.from('push_subscriptions').delete().eq('id', i.id)
      }
    }),
  )

  return resposta(200, { enviadas })
})
