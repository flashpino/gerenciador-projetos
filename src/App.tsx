import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/features/AppShell'
import { EmConstrucaoPage } from '@/components/features/EmConstrucaoPage'
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
                <Route element={<AppShell />}>
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
                  {/* Rotas "em construção" — cada sub-projeto da auditoria
                      (docs/superpowers/specs/2026-09-17-casca-sidebar-design.md)
                      substitui a sua por conteúdo real quando chegar a vez. */}
                  <Route
                    path="/paineis"
                    element={
                      <EmConstrucaoPage
                        titulo="Meus Painéis"
                        descricao="Vários painéis por workspace chegam no próximo sub-projeto."
                      />
                    }
                  />
                  <Route
                    path="/favoritos"
                    element={
                      <EmConstrucaoPage
                        titulo="Favoritos"
                        descricao="Marcar painéis como favoritos chega em breve."
                      />
                    }
                  />
                  <Route
                    path="/atividades"
                    element={
                      <EmConstrucaoPage
                        titulo="Atividades"
                        descricao="O feed de atividades do workspace chega em breve."
                      />
                    }
                  />
                  <Route
                    path="/modelos"
                    element={
                      <EmConstrucaoPage
                        titulo="Modelos"
                        descricao="Criar painéis a partir de modelos chega em breve."
                      />
                    }
                  />
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
