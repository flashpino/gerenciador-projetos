import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { TextInput } from '@/components/ui/TextInput'
import { useCriarBoard, useRenomearBoard, useWorkspaceAtual } from '@/hooks/useQuadro'

interface BoardEditavel {
  id: string
  name: string
}

interface Props {
  aberto: boolean
  aoFechar: () => void
  /** null = criar. Presente = renomear. Mesma dualidade do TaskModal. */
  board: BoardEditavel | null
}

export function BoardFormModal({ aberto, aoFechar, board }: Props) {
  return (
    <Modal open={aberto} onClose={aoFechar} title={board ? 'Renomear painel' : 'Novo painel'}>
      {/* key: reabrir para outro board (ou para criar) começa com o campo certo, não com o texto anterior. */}
      {aberto && <FormularioBoard key={board?.id ?? 'novo'} board={board} aoConcluir={aoFechar} />}
    </Modal>
  )
}

function FormularioBoard({ board, aoConcluir }: { board: BoardEditavel | null; aoConcluir: () => void }) {
  const [nome, setNome] = useState(board?.name ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const workspace = useWorkspaceAtual()
  const criar = useCriarBoard()
  const renomear = useRenomearBoard()
  const navigate = useNavigate()
  const mutacao = board ? renomear : criar

  function aoSubmeter(e: FormEvent) {
    e.preventDefault()
    const limpo = nome.trim()
    if (!limpo) {
      setErro('O nome não pode ficar vazio.')
      return
    }
    setErro(null)

    if (board) {
      renomear.mutate({ id: board.id, name: limpo }, { onSuccess: aoConcluir })
      return
    }
    if (!workspace.data) return
    criar.mutate(
      { workspaceId: workspace.data.id, name: limpo },
      {
        onSuccess: (novo) => {
          aoConcluir()
          navigate(`/boards/${novo.id}`)
        },
      },
    )
  }

  return (
    <form onSubmit={aoSubmeter} className="flex flex-col gap-space-md">
      <Field label="Nome do painel" error={erro ?? undefined}>
        {/* maxLength nativo cobre o limite de 120 do banco — sem validação à mão. */}
        <TextInput value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} />
      </Field>

      {mutacao.isError && (
        <p role="alert" className="rounded bg-danger-soft px-space-md py-space-sm text-body text-danger-ink">
          {mutacao.error.message}
        </p>
      )}

      <div className="flex justify-end gap-space-sm">
        <Button variant="secondary" onClick={aoConcluir}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={mutacao.isPending} disabled={!board && !workspace.data}>
          {board ? 'Salvar' : 'Criar painel'}
        </Button>
      </div>
    </form>
  )
}
