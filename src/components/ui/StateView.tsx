import type { ReactNode } from 'react'
import { Button } from './Button'

/**
 * Os QUATRO estados, como uniao discriminada.
 *
 * Nao existe um quinto e nao da para esquecer o vazio: o TypeScript exige que
 * quem constroi o estado escolha um dos quatro. "Estado vazio ausente" (erro n.3
 * do manual) deixa de ser questao de disciplina e vira erro de compilacao.
 */
export type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string; aoTentarDeNovo?: () => void }
  | { tipo: 'vazio'; titulo: string; descricao?: string; acao?: ReactNode }
  | { tipo: 'pronto' }

interface Props {
  estado: Estado
  children: ReactNode
}

export function StateView({ estado, children }: Props) {
  if (estado.tipo === 'pronto') return <>{children}</>

  if (estado.tipo === 'carregando') {
    return (
      // role=status + texto: leitor de tela anuncia. Spinner sozinho e silencioso.
      <div role="status" className="flex items-center justify-center gap-space-sm p-margin text-ink-muted">
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-border border-t-primary"
        />
        <span className="text-body">Carregando…</span>
      </div>
    )
  }

  if (estado.tipo === 'erro') {
    return (
      <div role="alert" className="flex flex-col items-center gap-space-md p-margin text-center">
        <p className="text-body text-danger-ink">{estado.mensagem}</p>
        {estado.aoTentarDeNovo && (
          <Button variant="secondary" size="sm" onClick={estado.aoTentarDeNovo}>
            Tentar de novo
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-space-sm p-margin text-center">
      <p className="text-title text-ink">{estado.titulo}</p>
      {estado.descricao && <p className="text-body text-ink-muted">{estado.descricao}</p>}
      {estado.acao && <div className="mt-space-sm">{estado.acao}</div>}
    </div>
  )
}

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
