import { cloneElement, isValidElement, useId, type ReactElement } from 'react'

interface Props {
  label: string
  error?: string
  hint?: string
  required?: boolean
  /** Um unico input controlado (TextInput, Select...). Recebe id/aria-* injetados. */
  children: ReactElement
}

/**
 * Amarra label<->id, error<->aria-describedby e aria-invalid. Sem isto, cada
 * formulario refaz essa ligacao a mao e esquece uma parte — a violacao de
 * a11y mais comum em formulario gerado (docs/components.md #4).
 */
export function Field({ label, error, hint, required, children }: Props) {
  const id = useId()
  const errorId = error ? `${id}-error` : undefined
  const hintId = hint ? `${id}-hint` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  const campo = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        required,
        invalid: Boolean(error),
        'aria-describedby': describedBy,
      })
    : children

  return (
    <div className="flex flex-col gap-space-xs">
      {/* Sem marcador visual "*": `required` ja e anunciado pelo leitor de tela,
          e um "*" dentro do <label> vira parte do texto que getByLabelText/o
          proprio leitor de tela le — "E-mail asterisco" e ruido, nao clareza. */}
      <label htmlFor={id} className="text-label text-ink">
        {label}
      </label>
      {campo}
      {hint && !error && (
        <p id={hintId} className="text-label text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-label text-danger-ink">
          {error}
        </p>
      )}
    </div>
  )
}
