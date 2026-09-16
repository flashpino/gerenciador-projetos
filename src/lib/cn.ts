/** Junta classes ignorando falsy. Uma linha; nao precisa de clsx. */
export const cn = (...partes: (string | false | null | undefined)[]): string =>
  partes.filter(Boolean).join(' ')
