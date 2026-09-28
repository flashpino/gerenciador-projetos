const CHAVE = 'ultimoBoardId'

// localStorage lança em modo privado / armazenamento bloqueado. Perder a
// lembrança do último board é aceitável; quebrar a navegação, não.
export function lerUltimoBoard(): string | null {
  try {
    return localStorage.getItem(CHAVE)
  } catch {
    return null
  }
}

export function lembrarUltimoBoard(id: string): void {
  try {
    localStorage.setItem(CHAVE, id)
  } catch {
    // idem acima
  }
}
