import { FeedAtividades } from '@/components/features/FeedAtividades'
import { StateView } from '@/components/ui/StateView'
import { useAtividades } from '@/hooks/useQuadro'
import { estadoDaQuery } from '@/lib/estadoDaQuery'

/** Workspace inteiro, 50 mais recentes (docs/superpowers/specs/2026-09-28-atividades-design.md). */
export default function AtividadesPage() {
  const atividades = useAtividades(undefined, 50)
  const estado = estadoDaQuery(
    atividades,
    { titulo: 'Nenhuma atividade ainda', descricao: 'Criar tarefas, mudar status e comentar aparece aqui.' },
    () => void atividades.refetch(),
  )

  return (
    <div className="mx-auto max-w-canvas p-gutter md:p-margin">
      <h1 className="mb-gutter text-display">Atividades</h1>
      <StateView estado={estado}>
        <div className="glass rounded-card p-space-lg">
          <FeedAtividades atividades={atividades.data ?? []} mostrarBoard />
        </div>
      </StateView>
    </div>
  )
}
