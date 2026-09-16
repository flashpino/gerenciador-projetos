import { Navigate, Outlet } from 'react-router-dom'
import { useSessao } from '@/hooks/useSessao'

/**
 * Guarda de rota (F0.3). Enquanto a sessao inicial carrega, nao renderiza
 * nada — nem o conteudo protegido, nem o redirecionamento. Decidir cedo
 * demais (sem sessao ainda == deslogado) faria a rota piscar o conteudo
 * protegido para quem so ainda nao terminou de carregar a sessao.
 */
export function RotaProtegida() {
  const { usuario, carregando } = useSessao()

  if (carregando) return null
  if (!usuario) return <Navigate to="/login" replace />
  return <Outlet />
}
