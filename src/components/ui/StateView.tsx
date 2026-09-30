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
      // <output> e o role=status nativo. `aria-busy` + o texto sr-only: o skeleton e so decoracao (aria-hidden),
      // entao quem usa leitor de tela ouve "Carregando…" e nao uma lista de retangulos.
      <output aria-busy="true" className="flex flex-col gap-margin p-margin">
        <span className="sr-only">Carregando…</span>
        <Esqueleto />
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

/** Bloco cinza pulsante. Sem `animate-pulse` quando a pessoa pede menos movimento. */
function Bloco({ className }: { className: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded bg-surface-3 motion-reduce:animate-none ${className}`} />
}

/**
 * Skeleton de uma tela de dados: 3 cartões de vidro (cabeçalho + linhas). Genérico de propósito — vale para
 * a troca de página (Suspense do AppShell) e para o carregamento dos dados de qualquer visão. Não está no
 * inventário de primitivos: só o StateView o usa (regra dos três).
 */
function Esqueleto() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-margin">
      {[0, 1, 2].map((i) => (
        <div key={i} className="glass flex flex-col gap-space-md rounded-card p-space-md">
          <Bloco className="h-6 w-1/3" />
          <Bloco className="h-4 w-full" />
          <Bloco className="h-4 w-5/6" />
          <Bloco className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}
