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
      // <output> e o role=status nativo. Com o texto junto: spinner sozinho e silencioso.
      <output className="flex items-center justify-center gap-space-sm p-margin text-ink-muted">
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-border border-t-primary"
        />
        <span className="text-body">Carregando…</span>
      </output>
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
