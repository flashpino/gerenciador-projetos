import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

type Tamanho = 'md' | 'lg' | 'full'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: Tamanho
}

const TAMANHOS: Record<Tamanho, string> = {
  md: 'w-[min(28rem,calc(100vw-2rem))]',
  lg: 'w-[min(42rem,calc(100vw-2rem))]',
  full: 'h-[calc(100vh-2rem)] w-[calc(100vw-2rem)]',
}

/**
 * `<dialog>` nativo (docs/components.md #9): trap de foco, Esc e camada
 * superior vem de graca do navegador. Devolver o foco a origem e a UNICA
 * parte manual (F5.1) — guardamos o elemento ativo no instante em que o
 * modal abre e focamos ele de volta quando o evento `close` dispara, seja
 * por Esc, pelo botao "Fechar" ou por uma chamada a close() vinda de fora.
 */
export function Modal({ open, onClose, title, children, footer, size = 'md' }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const origemRef = useRef<HTMLElement | null>(null)
  const idTitulo = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      origemRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const aoFecharNativo = () => {
      onClose()
      origemRef.current?.focus()
    }
    dialog.addEventListener('close', aoFecharNativo)
    return () => dialog.removeEventListener('close', aoFecharNativo)
  }, [onClose])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={idTitulo}
      className={cn(
        'rounded-md border border-border bg-surface p-0 text-ink shadow-overlay backdrop:bg-ink/40',
        TAMANHOS[size],
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-space-lg py-space-md">
        <h2 id={idTitulo} className="text-title">
          {title}
        </h2>
        <button
          type="button"
          aria-label="Fechar"
          onClick={() => dialogRef.current?.close()}
          className="rounded p-space-xs hover:bg-surface-2"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-space-lg">{children}</div>

      {footer && (
        <div className="flex justify-end gap-space-sm border-t border-border px-space-lg py-space-md">{footer}</div>
      )}
    </dialog>
  )
}
