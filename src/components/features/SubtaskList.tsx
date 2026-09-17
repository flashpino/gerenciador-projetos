import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { StateView, type Estado } from '@/components/ui/StateView'
import { TextInput } from '@/components/ui/TextInput'
import type { Subtask } from '@/types/domain'

interface Props {
  subtasks: Subtask[]
  aoAlternar: (id: string, done: boolean) => void
  aoAdicionar: (title: string) => void
  aoRemover: (id: string) => void
  adicionando?: boolean
}

/** Contador "4/6" — critério F5.5. Muda no mesmo render que `subtasks` muda,
 * porque quem chama (TaskModal) usa update otimista em useAtualizarSubtarefa. */
export function SubtaskList({ subtasks, aoAlternar, aoAdicionar, aoRemover, adicionando }: Props) {
  const [titulo, setTitulo] = useState('')
  const feitas = subtasks.filter((s) => s.done).length

  function aoSubmeter(evento: FormEvent) {
    evento.preventDefault()
    const limpo = titulo.trim()
    if (!limpo) return
    aoAdicionar(limpo)
    setTitulo('')
  }

  const estado: Estado =
    subtasks.length === 0
      ? { tipo: 'vazio', titulo: 'Nenhuma subtarefa ainda' }
      : { tipo: 'pronto' }

  return (
    <div>
      <div className="mb-space-sm flex items-center justify-between">
        <h3 className="text-label text-ink-muted">Subtarefas</h3>
        <span className="text-label text-ink-muted">
          {feitas}/{subtasks.length}
        </span>
      </div>

      <StateView estado={estado}>
        <ul className="flex flex-col gap-space-xs">
          {subtasks.map((s) => (
            <li key={s.id} className="flex items-center gap-space-sm">
              <Checkbox checked={s.done} onChange={(v) => aoAlternar(s.id, v)} label={s.title} />
              <button
                type="button"
                aria-label={`Remover ${s.title}`}
                onClick={() => aoRemover(s.id)}
                className="ml-auto rounded p-space-xs text-ink-muted hover:bg-surface-2 hover:text-danger-ink"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </StateView>

      <form onSubmit={aoSubmeter} className="mt-space-sm flex gap-space-sm">
        <TextInput
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          aria-label="Nova subtarefa"
          placeholder="Adicionar subtarefa"
        />
        <Button type="submit" variant="secondary" size="sm" loading={adicionando}>
          Adicionar
        </Button>
      </form>
    </div>
  )
}
