import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus, Trash2, UserPlus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { StateView } from '@/components/ui/StateView'
import { EsqueletoFeed } from '@/components/features/Esqueletos'
import { ExcluirWorkspaceDialog } from '@/components/features/ExcluirWorkspaceDialog'
import { IntegrantesModal } from '@/components/features/IntegrantesModal'
import { WorkspaceFormModal } from '@/components/features/WorkspaceFormModal'
import { useTrocarWorkspace, useWorkspaces } from '@/hooks/useQuadro'
import { useSessao } from '@/hooks/useSessao'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import type { Workspace } from '@/services/boards'

/**
 * Gerenciar workspaces: abrir, compartilhar (o workspace inteiro), renomear e excluir. Renomear/excluir só o
 * dono — o RLS confere de novo; aqui só não oferece o que o banco recusaria.
 */
export default function WorkspacesPage() {
  const { usuario } = useSessao()
  const workspaces = useWorkspaces()
  const trocar = useTrocarWorkspace()
  const navigate = useNavigate()
  const [form, setForm] = useState<Workspace | 'novo' | null>(null)
  const [excluindo, setExcluindo] = useState<Workspace | null>(null)
  const [compartilhando, setCompartilhando] = useState<Workspace | null>(null)
  const estado = estadoDaQuery(workspaces, { titulo: 'Nenhum workspace' }, () => void workspaces.refetch())
  // O último não sai: sem workspace nenhum, não há onde criar painel.
  const ehOUnico = (workspaces.data?.length ?? 0) <= 1

  function abrir(w: Workspace) {
    trocar(w.id)
    navigate('/paineis')
  }

  return (
    <div className="mx-auto max-w-canvas p-gutter md:p-margin">
      <div className="mb-gutter flex flex-wrap items-center justify-between gap-space-md">
        <h1 className="text-display">Workspaces</h1>
        <Button variant="primary" iconStart={<Plus aria-hidden="true" className="size-4" />} onClick={() => setForm('novo')}>
          Novo workspace
        </Button>
      </div>

      <StateView
        estado={estado}
        esqueleto={
          <div className="glass rounded-card p-space-lg">
            <EsqueletoFeed linhas={3} />
          </div>
        }
      >
        <ul className="glass divide-y divide-border rounded-card">
          {workspaces.data?.map((w) => {
            const dono = w.owner_id === usuario?.id
            return (
              <li key={w.id} className="flex flex-wrap items-center gap-space-md px-space-lg py-space-md">
                <p className="flex min-w-0 flex-1 basis-48 items-center gap-space-sm text-body font-semibold text-ink">
                  <span className="truncate">{w.name}</span>
                  <Badge variant="soft">{dono ? 'Seu' : 'Convidado'}</Badge>
                </p>
                <div className="flex flex-wrap gap-space-xs">
                  <Button variant="secondary" size="sm" aria-label={`Abrir ${w.name}`} onClick={() => abrir(w)}>
                    Abrir
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label={`Compartilhar ${w.name}`}
                    iconStart={<UserPlus aria-hidden="true" className="size-4" />}
                    onClick={() => setCompartilhando(w)}
                  />
                  {dono && (
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label={`Renomear ${w.name}`}
                      iconStart={<Pencil aria-hidden="true" className="size-4" />}
                      onClick={() => setForm(w)}
                    />
                  )}
                  {dono && !ehOUnico && (
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label={`Excluir ${w.name}`}
                      iconStart={<Trash2 aria-hidden="true" className="size-4 text-danger-ink" />}
                      onClick={() => setExcluindo(w)}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </StateView>

      <WorkspaceFormModal aberto={form !== null} aoFechar={() => setForm(null)} workspace={form === 'novo' ? null : form} />
      <ExcluirWorkspaceDialog workspace={excluindo} aoFechar={() => setExcluindo(null)} />
      {compartilhando && (
        <IntegrantesModal
          aberto
          aoFechar={() => setCompartilhando(null)}
          workspaceId={compartilhando.id}
          donoId={compartilhando.owner_id}
        />
      )}
    </div>
  )
}
