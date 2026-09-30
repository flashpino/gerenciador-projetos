import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

export interface ItemTab {
  id: string
  rotulo: string
  /** Contagem ao lado do rótulo. Vai para o nome acessível, não só para o olho. */
  contagem?: number
  /** Se presente, o item navega em vez de alternar painel. Ver nota abaixo. */
  href?: string
}

interface Props {
  items: ItemTab[]
  value: string
  onChange?: (id: string) => void
  variant?: 'underline' | 'pill'
  /** Nome acessível da faixa. Obrigatório: faixa sem nome não diz nada. */
  rotulo: string
  /** id do painel controlado pelas abas. Só na variante de abas reais. */
  idPainel?: string
  className?: string
}

// O nome acessível traz a contagem junto: "Em andamento, 3 tarefas".
const nome = (i: ItemTab) =>
  i.contagem === undefined
    ? i.rotulo
    : `${i.rotulo}, ${i.contagem} ${i.contagem === 1 ? 'tarefa' : 'tarefas'}`

const visual = (i: ItemTab) => (
  <>
    <span aria-hidden="true">{i.rotulo}</span>
    {i.contagem !== undefined && (
      <span aria-hidden="true" className="rounded-full bg-surface-3 px-space-xs text-micro text-ink-muted">
        {i.contagem}
      </span>
    )}
  </>
)

/**
 * Faixa de seleção — abas reais OU navegação, decidido pelo `href` do item.
 *
 * `role="tablist"` exige que os painéis estejam no mesmo documento. Trocar de
 * view do board é mudar de ROTA: uma aba que navega mente para o leitor de tela,
 * que anuncia "aba 2 de 4, selecionada" para algo que trocou a página inteira.
 * Por isso item com `href` vira <nav> + link com aria-current="page".
 *
 * Um primitivo, dois elementos — variante, não componente novo.
 */
export function Tabs({
  items, value, onChange, variant = 'underline', rotulo, idPainel, className,
}: Props) {
  // A faixa rola dentro de si mesma em 375px. A PÁGINA nunca rola na horizontal
  // (docs/responsive.md, regra global) — por isso o overflow vive aqui.
  const faixa = cn('flex gap-space-xs overflow-x-auto', className)

  const aparencia = (ativo: boolean) =>
    cn(
      'flex min-h-touch shrink-0 items-center gap-space-xs whitespace-nowrap text-body',
      variant === 'underline'
        ? cn('border-b-2 px-space-md md:min-h-9', ativo ? 'border-primary font-semibold text-primary' : 'border-transparent text-ink-muted')
        : cn(
            'rounded-full px-space-lg font-semibold transition-colors duration-fast',
            ativo ? 'bg-primary text-primary-fg' : 'text-ink hover:bg-glass-strong',
          ),
    )

  if (items[0]?.href !== undefined) {
    return (
      <nav aria-label={rotulo} className={faixa}>
        {items.map((i) => (
          <Link
            key={i.id}
            to={i.href as string}
            aria-current={i.id === value ? 'page' : undefined}
            className={aparencia(i.id === value)}
          >
            <span className="sr-only">{nome(i)}</span>
            {visual(i)}
          </Link>
        ))}
      </nav>
    )
  }

  const mover = (delta: number) => {
    const atual = items.findIndex((i) => i.id === value)
    const proximo = items[(atual + delta + items.length) % items.length]
    if (proximo) onChange?.(proximo.id)
  }

  const tecla = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); mover(1); return }
    if (e.key === 'ArrowLeft') { e.preventDefault(); mover(-1); return }
    if (e.key === 'Home') { e.preventDefault(); onChange?.(items[0]?.id ?? value); return }
    if (e.key === 'End') { e.preventDefault(); onChange?.(items[items.length - 1]?.id ?? value) }
  }

  return (
    // tabIndex={-1} necessario para o lint jsx-a11y (role interativo) — nao afeta
    // a ordem de tab por ser negativo; quem recebe foco de verdade e o <button role="tab"> ativo.
    <div role="tablist" aria-label={rotulo} onKeyDown={tecla} tabIndex={-1} className={faixa}>
      {items.map((i) => (
        <button
          key={i.id}
          type="button"
          role="tab"
          id={`aba-${i.id}`}
          aria-selected={i.id === value}
          aria-controls={idPainel}
          // Só a aba ativa entra na ordem de Tab; as setas fazem o resto (WAI-ARIA).
          tabIndex={i.id === value ? 0 : -1}
          onClick={() => onChange?.(i.id)}
          className={aparencia(i.id === value)}
        >
          <span className="sr-only">{nome(i)}</span>
          {visual(i)}
        </button>
      ))}
    </div>
  )
}
