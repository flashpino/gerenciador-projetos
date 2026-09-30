import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { removerInscricaoPush, salvarInscricaoPush } from '@/services/push'

export type EstadoPush = 'carregando' | 'sem-suporte' | 'nao-configurado' | 'negado' | 'inativo' | 'ativo'

const CHAVE = ['push'] as const

/** No iPhone o PushManager só existe com o app instalado na tela inicial (iOS 16.4+). */
const suportaPush = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

const chavePublica = (): string => import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

/** Chave VAPID em base64url → bytes, o formato que `pushManager.subscribe` pede. */
function paraBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(base64url.length / 4) * 4, '=')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

async function lerEstado(): Promise<Exclude<EstadoPush, 'carregando'>> {
  if (!suportaPush()) return 'sem-suporte'
  if (!chavePublica()) return 'nao-configurado'
  if (Notification.permission === 'denied') return 'negado'
  const registro = await navigator.serviceWorker.ready
  return (await registro.pushManager.getSubscription()) ? 'ativo' : 'inativo'
}

/**
 * Notificações push NESTE dispositivo. O estado vem do navegador (permissão + inscrição), não do banco:
 * cada aparelho se inscreve separado. `ativar`/`desativar` nunca rejeitam — o erro fica em `erro`.
 */
export function useNotificacoesPush() {
  const qc = useQueryClient()
  const estado = useQuery({ queryKey: CHAVE, queryFn: lerEstado })

  const ativar = useMutation({
    mutationFn: async () => {
      const permissao = await Notification.requestPermission()
      if (permissao !== 'granted') {
        // Recusou: o navegador não pergunta de novo; só as configurações do site desfazem isso.
        if (permissao === 'denied') qc.setQueryData(CHAVE, 'negado')
        return
      }
      const registro = await navigator.serviceWorker.ready
      const inscricao = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: paraBytes(chavePublica()),
      })
      await salvarInscricaoPush(inscricao.toJSON())
      qc.setQueryData(CHAVE, 'ativo')
    },
  })

  const desativar = useMutation({
    mutationFn: async () => {
      const registro = await navigator.serviceWorker.ready
      const inscricao = await registro.pushManager.getSubscription()
      if (inscricao) {
        // Servidor primeiro: se falhar, o aparelho continua inscrito e o estado não mente.
        await removerInscricaoPush(inscricao.endpoint)
        await inscricao.unsubscribe()
      }
      qc.setQueryData(CHAVE, 'inativo')
    },
  })

  return {
    estado: (estado.data ?? 'carregando') as EstadoPush,
    ativar: () => ativar.mutateAsync().catch(() => undefined),
    desativar: () => desativar.mutateAsync().catch(() => undefined),
    processando: ativar.isPending || desativar.isPending,
    erro: ativar.error ?? desativar.error,
  }
}
