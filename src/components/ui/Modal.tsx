import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

type Tamanho = 'md' | 'lg' | 'full' | 'drawer'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: Tamanho
}

// `m-auto` nos três centralizados: o preflight do Tailwind zera o margin de
// todo elemento, inclusive o `margin: auto` nativo que centraliza o <dialog>.
// Sem ele o modal abre colado no canto superior esquerdo (visto no navegador;
// invisível no jsdom, que roda com `css: false`).
const TAMANHOS: Record<Tamanho, string> = {
  md: 'm-auto w-[min(28rem,calc(100vw-2rem))]',
  lg: 'm-auto w-[min(42rem,calc(100vw-2rem))]',
  full: 'm-auto h-[calc(100vh-2rem)] w-[calc(100vw-2rem)]',
  // Ocupa a lateral inteira — usado pelo drawer de navegação em 375px
  // (docs/responsive.md:38, docs/superpowers/specs/2026-09-17-casca-
  // sidebar-design.md). Mesmo <dialog>, trap de foco e Esc de graça; só a
  // posição/tamanho mudam.
  //
  // `hidden` + `open:flex`, NUNCA `flex` puro: `flex` é regra de AUTOR
  // (Tailwind) e vence a regra nativa `dialog:not([open]) { display: none }`
  // do navegador — um `flex` incondicional deixava o drawer visível mesmo
  // FECHADO, sobrepondo a sidebar de verdade (achado em checagem manual no
  // navegador; invisível no jsdom porque o ambiente de teste roda com
  // `css: false`, sem CSS real carregado).
  //
  // `max-h-none`: o estilo padrão do navegador (`dialog:modal { max-height:
  // calc(100% - 6px - 2em) }`) cortava o h-dvh e deixava um vão no rodapé.
  drawer: 'fixed inset-y-0 left-0 m-0 hidden h-dvh max-h-none w-[min(20rem,85vw)] max-w-none flex-col rounded-none open:flex',
}

// O conteúdo do drawer precisa preencher a altura toda, não ficar limitado
// a 70vh como os tamanhos centralizados (md/lg/full mantêm o comportamento
// de sempre — isto só adiciona um caso, não muda os outros três).
// Sem padding: quem usa o drawer (a Sidebar) pinta o próprio fundo até a
// borda — o padding virava uma moldura branca em volta dele.
const ALTURA_CONTEUDO: Partial<Record<Tamanho, string>> = {
  drawer: 'flex-1 overflow-y-auto',
}

/**
 * `<dialog>` nativo (docs/components.md #9): trap de foco, Esc e camada
 * superior vem de graca do navegador. Devolver o foco a origem e a UNICA
 * parte manual (F5.1) — guardamos o elemento ativo no instante em que o
 * modal abre e focamos ele de volta quando o evento `close` dispara, seja
 * por Esc, pelo botao "Fechar", por clique fora ou por uma chamada a
 * close() vinda de fora.
 */
export function Modal({ open, onClose, title, children, footer, size = 'md' }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const origemRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const idTitulo = useId()

  // Declarado ANTES do efeito que fecha: a ref já aponta pro onClose atual
  // quando o `close` disparar no mesmo commit.
  useEffect(() => {
    onCloseRef.current = onClose
  })

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

  // Listener atachado UMA vez, lendo o onClose pela ref. Com `[onClose]` como
  // dependência (e o chamador passando uma arrow nova a cada render), o
  // listener era removido no mesmo commit em que `open=false` fazia
  // dialog.close() — o `close` disparava sem ninguém ouvindo e o foco não
  // voltava. Afetava todo fechamento vindo do conteúdo (Cancelar, Salvar).
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const aoFecharNativo = () => {
      onCloseRef.current()
      origemRef.current?.focus()
    }
    dialog.addEventListener('close', aoFecharNativo)
    return () => dialog.removeEventListener('close', aoFecharNativo)
  }, [])

  // Clique no backdrop nativo chega como clique no próprio <dialog> (não
  // num descendente) — o ::backdrop não é um nó do DOM. Padrão documentado
  // pela MDN. Atachado uma vez só; um dialog fechado não recebe clique.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const aoClicarFora = (e: MouseEvent) => {
      if (e.target === dialog) dialog.close()
    }
    dialog.addEventListener('click', aoClicarFora)
    return () => dialog.removeEventListener('click', aoClicarFora)
  }, [])

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

      <div className={ALTURA_CONTEUDO[size] ?? 'max-h-[70vh] overflow-y-auto p-space-lg'}>{children}</div>

      {footer && (
        <div className="flex justify-end gap-space-sm border-t border-border px-space-lg py-space-md">{footer}</div>
      )}
    </dialog>
  )
}
