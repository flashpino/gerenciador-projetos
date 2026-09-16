import { useContext } from 'react'
import { SessaoContext, type SessaoContextValor } from './sessaoContext'

export function useSessao(): SessaoContextValor {
  const ctx = useContext(SessaoContext)
  if (!ctx) throw new Error('useSessao precisa estar dentro de <SessaoProvider>')
  return ctx
}
