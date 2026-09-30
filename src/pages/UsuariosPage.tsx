import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { StateView } from '@/components/ui/StateView'
import { EsqueletoFeed } from '@/components/features/Esqueletos'
import { ExcluirUsuarioDialog } from '@/components/features/ExcluirUsuarioDialog'
import { UsuarioFormModal } from '@/components/features/UsuarioFormModal'
import { useSessao } from '@/hooks/useSessao'
import { useUsuarios } from '@/hooks/useUsuarios'
import { tempoRelativo } from '@/lib/date'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import type { UsuarioAdmin } from '@/services/usuarios'

/**
 * Administração de contas — só o master (`app_metadata.role`). Esconder a tela é conveniência: quem barra
 * de verdade é a função `usuarios` no servidor, que devolve 403 para os demais.
 */
export default function UsuariosPage() {
  const { usuario } = useSessao()

  return (
    <div className="mx-auto max-w-canvas p-gutter md:p-margin">
      {usuario?.master ? (
        <ListaDeUsuarios meuId={usuario.id} />
      ) : (
        <>
          <h1 className="mb-gutter text-display">Usuários</h1>
          <p className="text-body text-ink-muted">Só o administrador pode gerenciar usuários.</p>
        </>
      )}
    </div>
  )
}

function ListaDeUsuarios({ meuId }: { meuId: string }) {
  const usuarios = useUsuarios()
  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null)
  const [excluindo, setExcluindo] = useState<UsuarioAdmin | null>(null)
  const estado = estadoDaQuery(usuarios, { titulo: 'Nenhuma conta ainda' }, () => void usuarios.refetch())

  function abrirForm(u: UsuarioAdmin | null) {
    setEditando(u)
    setFormAberto(true)
  }

  return (
    <>
      <div className="mb-gutter flex flex-wrap items-center justify-between gap-space-md">
        <h1 className="text-display">Usuários</h1>
        <Button variant="primary" iconStart={<Plus aria-hidden="true" className="size-4" />} onClick={() => abrirForm(null)}>
          Novo usuário
        </Button>
      </div>

      <StateView
        estado={estado}
        esqueleto={
          <div className="glass rounded-card p-space-lg">
            <EsqueletoFeed linhas={4} />
          </div>
        }
      >
        <ul className="glass divide-y divide-border rounded-card">
          {usuarios.data?.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-space-md px-space-lg py-space-md">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-space-sm text-body font-semibold text-ink">
                  <span className="truncate">{u.nome}</span>
                  {u.master && <Badge variant="soft">Master</Badge>}
                </p>
                <p className="truncate text-label text-ink-muted">{u.email}</p>
              </div>
              <p className="text-label text-ink-muted">
                {u.ultimoAcesso ? `Último acesso ${tempoRelativo(u.ultimoAcesso)}` : 'Nunca entrou'}
              </p>
              <div className="flex gap-space-xs">
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label={`Editar ${u.nome}`}
                  iconStart={<Pencil aria-hidden="true" className="size-4" />}
                  onClick={() => abrirForm(u)}
                />
                {/* O master não se exclui (o servidor também recusa): ficaria sem ninguém para administrar. */}
                {u.id !== meuId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label={`Excluir ${u.nome}`}
                    iconStart={<Trash2 aria-hidden="true" className="size-4 text-danger-ink" />}
                    onClick={() => setExcluindo(u)}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </StateView>

      <UsuarioFormModal aberto={formAberto} aoFechar={() => setFormAberto(false)} usuario={editando} />
      <ExcluirUsuarioDialog usuario={excluindo} aoFechar={() => setExcluindo(null)} />
    </>
  )
}
