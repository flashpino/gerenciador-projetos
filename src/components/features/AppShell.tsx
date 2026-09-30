import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { EsqueletoDaRota } from './Esqueletos'
import { Sidebar } from './Sidebar'

/**
 * Container de toda rota autenticada (docs/superpowers/specs/2026-09-17-
 * casca-sidebar-design.md). Não sabe nada de board — BoardShell continua
 * sendo o cabeçalho+abas das 4 views, por dentro do <Outlet/> daqui.
 *
 * O <Suspense> mora aqui, e não em volta das <Routes>, para a Sidebar continuar
 * na tela enquanto a página (carregada por rota, React.lazy) chega.
 */
export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1">
        {/* Fallback com a forma da página de destino (a URL já mudou; ver lib/esqueleto). */}
        <Suspense fallback={<EsqueletoDaRota />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
