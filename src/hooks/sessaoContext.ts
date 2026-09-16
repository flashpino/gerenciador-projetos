import { createContext } from 'react'
import type { Usuario } from '@/services/auth'

export interface SessaoContextValor {
  usuario: Usuario | null
  carregando: boolean
}

export const SessaoContext = createContext<SessaoContextValor | null>(null)
