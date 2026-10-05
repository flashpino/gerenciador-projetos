import { useState, type FormEvent } from 'react'
import { AcoesDoFormulario } from '@/components/ui/AcoesDoFormulario'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useMoverBoard } from '@/hooks/useQuadro'
import type { Board } from '@/types/domain'

type BoardAlvo = Pick<Board, 'id' | 'name'>

interface Props {
  /** null = fechado. */
  board: BoardAlvo | null
  /** Workspaces para onde dá para levar o painel (os da pessoa, menos o atual). */
  destinos: { id: string; name: string }[]
  aoFechar: () => void
}

/**
 * Leva o painel inteiro para outro workspace. Sem freio de digitar o nome (como no excluir):
 * mover não apaga nada e se desfaz movendo de volta.
 */
export function MoverBoardDialog({ board, destinos, aoFechar }: Props) {
  return (
    <Modal open={board !== null} onClose={aoFechar} title="Mover painel">
      {board &&
        (destinos.length === 0 ? (
          <div className="flex flex-col gap-space-md">
            <p className="text-body text-ink">Você só tem este workspace. Crie outro workspace antes de mover o painel.</p>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={aoFechar}>
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <FormularioMover key={board.id} board={board} destinos={destinos} aoConcluir={aoFechar} />
        ))}
    </Modal>
  )
}

function FormularioMover({
  board,
  destinos,
  aoConcluir,
}: {
  board: BoardAlvo
  destinos: Props['destinos']
  aoConcluir: () => void
}) {
  const [destino, setDestino] = useState(destinos[0]?.id ?? '')
  const mover = useMoverBoard()

  function aoSubmeter(e: FormEvent) {
    e.preventDefault()
    mover.mutate({ id: board.id, workspaceId: destino }, { onSuccess: aoConcluir })
  }

  return (
    <form onSubmit={aoSubmeter} className="flex flex-col gap-space-md">
      <p className="text-body text-ink">
        <strong>{board.name}</strong> vai com todos os grupos, tarefas e comentários. Quem não for membro do
        workspace de destino deixa de ver o painel.
      </p>

      <Field label="Workspace de destino">
        <Select
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
          options={destinos.map((w) => ({ value: w.id, label: w.name }))}
        />
      </Field>

      <AcoesDoFormulario
        erro={mover.error}
        rotuloEnviar="Mover painel"
        enviando={mover.isPending}
        aoCancelar={aoConcluir}
      />
    </form>
  )
}
