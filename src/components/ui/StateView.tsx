import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/cn'
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
  /** Forma do skeleton enquanto carrega (a da tela que vai aparecer). Sem ela, algumas linhas genéricas. */
  esqueleto?: ReactNode
  children: ReactNode
}

export function StateView({ estado, esqueleto, children }: Props) {
  if (estado.tipo === 'pronto') return <>{children}</>

  if (estado.tipo === 'carregando') {
    return (
      // <output> e o role=status nativo. `aria-busy` + o texto sr-only: o skeleton e so decoracao (aria-hidden),
      // entao quem usa leitor de tela ouve "Carregando…" e nao uma lista de retangulos.
      <output aria-busy="true" className="block">
        <span className="sr-only">Carregando…</span>
        <div aria-hidden="true">{esqueleto ?? <LinhasGenericas />}</div>
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

/**
 * Peça de skeleton: retângulo cinza pulsante (ou círculo, com `redondo`). Tamanho e forma vêm de `className`.
 * Sem `animate-pulse` quando a pessoa pede menos movimento. As formas por tela moram em features/Esqueletos.
 */
export function BlocoEsqueleto({
  className,
  redondo = false,
  sobreFundo = false,
  style,
}: {
  className?: string
  redondo?: boolean
  /** Direto sobre o fundo da página (fora de cartão): o cinza padrão some no lavanda, este é mais escuro. */
  sobreFundo?: boolean
  /** Só posição/tamanho calculados (as barras do gantt). Cor nunca: vem do token. */
  style?: CSSProperties
}) {
  return (
    <span
      style={style}
      className={cn(
        'block animate-pulse motion-reduce:animate-none',
        sobreFundo ? 'bg-ink-muted/15' : 'bg-surface-3',
        redondo ? 'rounded-full' : 'rounded',
        className,
      )}
    />
  )
}

/** Padrão para quem não passa forma (modal, lista de comentários): três linhas de texto. */
function LinhasGenericas() {
  return (
    <div className="flex flex-col gap-space-sm p-space-md">
      <BlocoEsqueleto className="h-4 w-2/3" />
      <BlocoEsqueleto className="h-4 w-full" />
      <BlocoEsqueleto className="h-4 w-5/6" />
    </div>
  )
}
