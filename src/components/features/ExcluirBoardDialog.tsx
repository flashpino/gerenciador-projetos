import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { TextInput } from '@/components/ui/TextInput'
import { useExcluirBoard } from '@/hooks/useQuadro'

interface BoardAlvo {
  id: string
  name: string
}

interface Props {
  /** null = fechado. */
  board: BoardAlvo | null
  aoFechar: () => void
  /** A raiz `/` precisa de ao menos um board pra onde ir. */
  ehOUltimo: boolean
}

/**
 * Exclusão definitiva: o cascade do banco leva grupos, tarefas, subtarefas e
 * comentários junto (docs/superpowers/specs/2026-09-25-multiplos-boards-design.md).
 * Digitar o nome é o freio pra uma ação que não tem desfazer.
 */
export function ExcluirBoardDialog({ board, aoFechar, ehOUltimo }: Props) {
  return (
    <Modal open={board !== null} onClose={aoFechar} title="Excluir painel">
      {board &&
        (ehOUltimo ? (
          <UnicoBoard aoFechar={aoFechar} />
        ) : (
          <ConfirmarExclusao key={board.id} board={board} aoConcluir={aoFechar} />
        ))}
    </Modal>
  )
}

function UnicoBoard({ aoFechar }: { aoFechar: () => void }) {
  return (
    <div className="flex flex-col gap-space-md">
      <p className="text-body text-ink">Este é o único painel do workspace. Crie outro antes de excluir este.</p>
      <div className="flex justify-end">
        <Button variant="secondary" onClick={aoFechar}>
          Fechar
        </Button>
      </div>
    </div>
  )
}

function ConfirmarExclusao({ board, aoConcluir }: { board: BoardAlvo; aoConcluir: () => void }) {
  const [digitado, setDigitado] = useState('')
  const excluir = useExcluirBoard()

  function aoSubmeter(e: FormEvent) {
    e.preventDefault()
    excluir.mutate(board.id, { onSuccess: aoConcluir })
  }

  return (
    <form onSubmit={aoSubmeter} className="flex flex-col gap-space-md">
      <p className="text-body text-ink">
        Todas as tarefas, subtarefas e comentários de <strong>{board.name}</strong> serão apagados. Não dá
        para desfazer.
      </p>

      <Field label={`Digite "${board.name}" para confirmar`}>
        <TextInput value={digitado} onChange={(e) => setDigitado(e.target.value)} autoComplete="off" />
      </Field>

      {excluir.isError && (
        <p role="alert" className="rounded bg-danger-soft px-space-md py-space-sm text-body text-danger-ink">
          {excluir.error.message}
        </p>
      )}

      <div className="flex justify-end gap-space-sm">
        <Button variant="secondary" onClick={aoConcluir}>
          Cancelar
        </Button>
        <Button type="submit" variant="danger" loading={excluir.isPending} disabled={digitado !== board.name}>
          Excluir painel
        </Button>
      </div>
    </form>
  )
}
