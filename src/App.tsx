import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/features/AppShell'
import { EmConstrucaoPage } from '@/components/features/EmConstrucaoPage'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { RotaProtegida } from '@/components/RotaProtegida'
import { SessaoProvider } from '@/components/SessaoProvider'
import { StateView } from '@/components/ui/StateView'
import AberturaPage from '@/pages/AberturaPage'
import AtividadesPage from '@/pages/AtividadesPage'
import BoardPage from '@/pages/BoardPage'
import KanbanPage from '@/pages/KanbanPage'
import LoginPage from '@/pages/LoginPage'
import ModelosPage from '@/pages/ModelosPage'
import NaoEncontrada from '@/pages/NaoEncontrada'
import PaineisPage from '@/pages/PaineisPage'

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
                <Route element={<AppShell />}>
                  <Route path="/" element={<AberturaPage />} />
                  <Route path="/boards/:boardId" element={<BoardPage />} />
                  <Route path="/boards/:boardId/kanban" element={<KanbanPage />} />
                  <Route
                    path="/boards/:boardId/gantt"
                    element={
                      <Suspense fallback={carregandoRota}>
                        <GanttPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/boards/:boardId/dashboard"
                    element={
                      <Suspense fallback={carregandoRota}>
                        <DashboardPage />
                      </Suspense>
                    }
                  />
                  {/* Rotas "em construção" — cada sub-projeto da auditoria
                      (docs/superpowers/specs/2026-09-17-casca-sidebar-design.md)
                      substitui a sua por conteúdo real quando chegar a vez. */}
                  <Route path="/paineis" element={<PaineisPage />} />
                  <Route path="/favoritos" element={<PaineisPage filtro="favoritos" />} />
                  <Route path="/atividades" element={<AtividadesPage />} />
                  <Route path="/modelos" element={<ModelosPage />} />
                  <Route
                    path="/notificacoes"
                    element={<EmConstrucaoPage titulo="Notificações" descricao="Central de notificações em construção." />}
                  />
                  <Route
                    path="/ajuda"
                    element={<EmConstrucaoPage titulo="Ajuda" descricao="Central de ajuda em construção." />}
                  />
                  <Route
                    path="/configuracoes"
                    element={<EmConstrucaoPage titulo="Configurações" descricao="Configurações da conta em construção." />}
                  />
                </Route>
              </Route>
              <Route path="*" element={<NaoEncontrada />} />
            </Routes>
          </SessaoProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  )
}
