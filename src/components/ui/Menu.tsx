import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface ItemMenu {
  id: string
  rotulo: ReactNode
  /** Texto puro para leitor de tela quando `rotulo` e visual (ex.: um badge). */
  rotuloTexto?: string
  aoEscolher: () => void
  selecionado?: boolean
  /** Continua alcançável por teclado (aria-disabled, não `disabled`) para o leitor de tela ler o rótulo/motivo. */
  desabilitado?: boolean
}

interface Props {
  /** Render prop do gatilho — o Menu cuida do aria e do foco. */
  trigger: (props: {
    ref: React.Ref<HTMLButtonElement>
    'aria-haspopup': 'menu'
    'aria-expanded': boolean
    'aria-controls': string
    onClick: () => void
    onKeyDown: (e: React.KeyboardEvent) => void
  }) => ReactNode
  items: ItemMenu[]
  rotulo: string
  align?: 'start' | 'end'
}

/**
 * Menu acessivel: navegacao por setas, Home/End, Esc fecha e devolve o foco,
 * clique fora fecha.
 *
 * Isto e escrito a mao de proposito. E o unico primitivo em que vale: ele
 * tambem e a ALTERNATIVA POR TECLADO ao arrastar (WCAG 2.5.7) e a forma de
 * mover tarefa em mobile. Uma unica implementacao resolve os tres.
 */
export function Menu({ trigger, items, rotulo, align = 'start' }: Props) {
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const idMenu = useId()
  const gatilhoRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const fechar = (devolverFoco = true) => {
    setAberto(false)
    if (devolverFoco) gatilhoRef.current?.focus()
  }

  /**
   * Abre posicionando o foco no item ja selecionado.
   * Calculado AQUI, no evento que causa a abertura — nao num efeito. setState
   * dentro de efeito dispara um segundo render em cascata sem necessidade.
   */
  const abrir = () => {
    const inicial = items.findIndex((i) => i.selecionado)
    setAtivo(inicial >= 0 ? inicial : 0)
    setAberto(true)
  }

  useEffect(() => {
    if (!aberto) return

    const porClique = (e: MouseEvent) => {
      const alvo = e.target as Node
      if (!menuRef.current?.contains(alvo) && !gatilhoRef.current?.contains(alvo)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', porClique)
    return () => document.removeEventListener('mousedown', porClique)
  }, [aberto])

  useEffect(() => {
    if (!aberto) return
    const botoes = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    botoes?.[ativo]?.focus()
  }, [aberto, ativo])

  const teclaNoGatilho = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      abrir()
    }
  }

  const teclaNoMenu = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); fechar(); return }
    if (e.key === 'Tab') { fechar(false); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo((i) => (i + 1) % items.length); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((i) => (i - 1 + items.length) % items.length); return }
    if (e.key === 'Home') { e.preventDefault(); setAtivo(0); return }
    if (e.key === 'End') { e.preventDefault(); setAtivo(items.length - 1) }
  }

  return (
    <div className="relative">
      {trigger({
        ref: gatilhoRef,
        'aria-haspopup': 'menu',
        'aria-expanded': aberto,
        'aria-controls': idMenu,
        onClick: () => (aberto ? fechar(false) : abrir()),
        onKeyDown: teclaNoGatilho,
      })}

      {aberto && (
        <div
          ref={menuRef}
          id={idMenu}
          role="menu"
          tabIndex={-1}
          aria-label={rotulo}
          onKeyDown={teclaNoMenu}
          className={cn(
            'absolute z-50 mt-space-xs min-w-48 animate-surgir rounded-md border border-border bg-surface p-space-xs shadow-overlay',
            align === 'end' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
          )}
        >
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              tabIndex={i === ativo ? 0 : -1}
              aria-current={item.selecionado || undefined}
              aria-disabled={item.desabilitado || undefined}
              onClick={() => {
                if (item.desabilitado) return
                item.aoEscolher()
                fechar()
              }}
              className={cn(
                'flex min-h-touch w-full items-center gap-space-sm rounded-sm px-space-sm text-left text-body md:min-h-9',
                'hover:bg-surface-2 focus-visible:bg-surface-2',
                item.selecionado && 'font-semibold',
                item.desabilitado && 'cursor-not-allowed text-ink-muted hover:bg-transparent',
              )}
            >
              {item.rotuloTexto && <span className="sr-only">{item.rotuloTexto}</span>}
              <span aria-hidden={item.rotuloTexto ? 'true' : undefined}>{item.rotulo}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
