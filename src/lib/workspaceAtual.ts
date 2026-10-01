const CHAVE = 'workspaceAtualId'

/**
 * Qual workspace está aberto: o último escolhido (se a pessoa ainda tem acesso), senão o primeiro do qual
 * é dona, senão o primeiro da lista (só convidada). Pura: quem chama traz a lista e o id guardado.
 */
export function escolherWorkspace<T extends { id: string; owner_id: string }>(
  lista: readonly T[],
  guardado: string | null,
  meuId: string,
): T | undefined {
  return lista.find((w) => w.id === guardado) ?? lista.find((w) => w.owner_id === meuId) ?? lista[0]
}

// localStorage lança em modo privado / armazenamento bloqueado: perder a lembrança é aceitável,
// quebrar a navegação não (mesma decisão de ultimoBoard.ts).
export function lerWorkspaceAtual(): string | null {
  try {
    return localStorage.getItem(CHAVE)
  } catch {
    return null
  }
}

export function lembrarWorkspaceAtual(id: string): void {
  try {
    localStorage.setItem(CHAVE, id)
  } catch {
    // idem acima
  }
}
