import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { RotaProtegida } from '@/components/RotaProtegida'
import { SessaoProvider } from '@/components/SessaoProvider'
import { StateView } from '@/components/ui/StateView'
import BoardPage from '@/pages/BoardPage'
import KanbanPage from '@/pages/KanbanPage'
import LoginPage from '@/pages/LoginPage'
import NaoEncontrada from '@/pages/NaoEncontrada'

// Gantt e Dashboard carregam por rota — nao pesam na primeira tela
// (docs/specs.md, requisito de performance).
const GanttPage = lazy(() => import('@/pages/GanttPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))

const carregandoRota = (
  <StateView estado={{ tipo: 'carregando' }}>
    <></>
  </StateView>
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Interacoes sao curtas e frequentes (docs/specs.md, persona). Meio minuto
      // de dado fresco evita refetch a cada troca de aba sem servir dado velho.
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <SessaoProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RotaProtegida />}>
                <Route path="/" element={<BoardPage />} />
                <Route path="/kanban" element={<KanbanPage />} />
                <Route
                  path="/gantt"
                  element={
                    <Suspense fallback={carregandoRota}>
                      <GanttPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <Suspense fallback={carregandoRota}>
                      <DashboardPage />
                    </Suspense>
                  }
                />
              </Route>
              <Route path="*" element={<NaoEncontrada />} />
            </Routes>
          </SessaoProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  )
}
