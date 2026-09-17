import { ProgressBar } from '@/components/ui/ProgressBar'
import { progressoDoGrupo } from '@/lib/metrics'
import type { GroupComTarefas } from '@/types/domain'

interface Props {
  grupos: GroupComTarefas[]
}

/** Uma linha por grupo, progresso medio das tarefas dele. docs/components.md, Tabela 2. */
export function GroupProgressList({ grupos }: Props) {
  return (
    <ul className="flex flex-col gap-space-md">
      {grupos.map((g) => {
        const progresso = progressoDoGrupo(g.tasks)
        return (
          <li key={g.id}>
            <div className="mb-space-xs flex items-center justify-between text-body text-ink">
              <span className="font-semibold">{g.name}</span>
              <span className="text-ink-muted">{progresso}%</span>
            </div>
            <ProgressBar value={progresso} label={`Progresso de ${g.name}`} />
          </li>
        )
      })}
    </ul>
  )
}
