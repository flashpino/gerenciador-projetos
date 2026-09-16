import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { escutarSessao, obterSessaoAtual, type Usuario } from '@/services/auth'
import { SessaoContext } from '@/hooks/sessaoContext'

/**
 * Fonte unica de verdade da sessao. Le a sessao atual uma vez e escuta
 * mudancas (login/logout/expiracao) pelo resto da vida do app.
 */
export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true

    obterSessaoAtual().then((u) => {
      if (!ativo) return
      setUsuario(u)
      setCarregando(false)
    })

    const cancelar = escutarSessao((u) => {
      if (!ativo) return
      setUsuario(u)
      setCarregando(false)
    })

    return () => {
      ativo = false
      cancelar()
    }
  }, [])

  const valor = useMemo(() => ({ usuario, carregando }), [usuario, carregando])

  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>
}
