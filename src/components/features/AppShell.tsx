import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

/**
 * Container de toda rota autenticada (docs/superpowers/specs/2026-09-17-
 * casca-sidebar-design.md). Não sabe nada de board — BoardShell continua
 * sendo o cabeçalho+abas das 4 views, por dentro do <Outlet/> daqui.
 */
export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
