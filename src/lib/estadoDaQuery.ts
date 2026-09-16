import type { ReactNode } from 'react'
import type { Estado } from '@/components/ui/StateView'

/**
 * Traduz o resultado de uma query do TanStack Query nos quatro estados.
 * Centralizado aqui para que nenhuma tela reinvente a regra do "vazio".
 */
export function estadoDaQuery<T>(
  q: { isPending: boolean; isError: boolean; error: unknown; data: T[] | undefined },
  vazio: { titulo: string; descricao?: string; acao?: ReactNode },
  aoTentarDeNovo?: () => void,
): Estado {
  if (q.isPending) return { tipo: 'carregando' }
  if (q.isError) {
    return {
      tipo: 'erro',
      mensagem: q.error instanceof Error ? q.error.message : 'Algo deu errado.',
      aoTentarDeNovo,
    }
  }
  if (!q.data || q.data.length === 0) return { tipo: 'vazio', ...vazio }
  return { tipo: 'pronto' }
}
