import { lazy } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/features/AppShell'
import { AvisoPWA } from '@/components/features/AvisoPWA'
import { EmConstrucaoPage } from '@/components/features/EmConstrucaoPage'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { RotaProtegida } from '@/components/RotaProtegida'
import { SessaoProvider } from '@/components/SessaoProvider'
import AberturaPage from '@/pages/AberturaPage'
import BoardPage from '@/pages/BoardPage'
import LoginPage from '@/pages/LoginPage'
import NaoEncontrada from '@/pages/NaoEncontrada'

// Carregam por rota — nao pesam na primeira tela (docs/specs.md, requisito de
// performance). O <Suspense> fica no AppShell.
const GanttPage = lazy(() => import('@/pages/GanttPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
// Kanban leva o dnd-kit; as demais só são abertas depois da primeira tela.
const KanbanPage = lazy(() => import('@/pages/KanbanPage'))
const PaineisPage = lazy(() => import('@/pages/PaineisPage'))
const AtividadesPage = lazy(() => import('@/pages/AtividadesPage'))
const ModelosPage = lazy(() => import('@/pages/ModelosPage'))
const AjudaPage = lazy(() => import('@/pages/AjudaPage'))
const ConfiguracoesPage = lazy(() => import('@/pages/ConfiguracoesPage'))
const UsuariosPage = lazy(() => import('@/pages/UsuariosPage'))
const WorkspacesPage = lazy(() => import('@/pages/WorkspacesPage'))

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
        {/*
          Sem transição do React na navegação: com ela (padrão), ao ir para uma rota lazy a tela ANTIGA fica
          congelada até o chunk chegar e o <Suspense> do AppShell nunca mostra o skeleton — parece travado.
        */}
        <BrowserRouter useTransitions={false}>
          <SessaoProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RotaProtegida />}>
                <Route element={<AppShell />}>
                  <Route path="/" element={<AberturaPage />} />
                  <Route path="/boards/:boardId" element={<BoardPage />} />
                  <Route path="/boards/:boardId/kanban" element={<KanbanPage />} />
                  <Route path="/boards/:boardId/gantt" element={<GanttPage />} />
                  <Route path="/boards/:boardId/dashboard" element={<DashboardPage />} />
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
                  <Route path="/ajuda" element={<AjudaPage />} />
                  <Route path="/configuracoes" element={<ConfiguracoesPage />} />
                  <Route path="/usuarios" element={<UsuariosPage />} />
                  <Route path="/workspaces" element={<WorkspacesPage />} />
                </Route>
              </Route>
              <Route path="*" element={<NaoEncontrada />} />
            </Routes>
          </SessaoProvider>
        </BrowserRouter>
        <AvisoPWA />
      </ErrorBoundary>
    </QueryClientProvider>
  )
}
