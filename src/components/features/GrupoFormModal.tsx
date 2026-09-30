import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { TextInput } from '@/components/ui/TextInput'
import { useAtualizarGrupo, useCriarGrupo } from '@/hooks/useQuadro'
import type { Group, GroupColor } from '@/types/domain'

type GrupoEditavel = Pick<Group, 'id' | 'name' | 'color'>

const CORES: { value: GroupColor; label: string }[] = [
  { value: 'azure', label: 'Azul' },
  { value: 'grape', label: 'Roxo' },
  { value: 'mint', label: 'Verde' },
  { value: 'crimson', label: 'Vermelho' },
]

interface Props {
  aberto: boolean
  aoFechar: () => void
  boardId: string
  /** null = criar. Presente = renomear/recolorir. Mesma dualidade do BoardFormModal. */
  grupo: GrupoEditavel | null
  /** Só lido ao criar: o grupo novo entra no fim da tabela. */
  proximaPosicao: number
}

export function GrupoFormModal({ aberto, aoFechar, boardId, grupo, proximaPosicao }: Props) {
  return (
    <Modal open={aberto} onClose={aoFechar} title={grupo ? 'Renomear grupo' : 'Novo grupo'}>
      {/* key: reabrir para outro grupo (ou para criar) começa com os campos certos, não com o texto anterior. */}
      {aberto && (
        <FormularioGrupo
          key={grupo?.id ?? 'novo'}
          boardId={boardId}
          grupo={grupo}
          proximaPosicao={proximaPosicao}
          aoConcluir={aoFechar}
        />
      )}
    </Modal>
  )
}

function FormularioGrupo({
  boardId,
  grupo,
  proximaPosicao,
  aoConcluir,
}: {
  boardId: string
  grupo: GrupoEditavel | null
  proximaPosicao: number
  aoConcluir: () => void
}) {
  const [nome, setNome] = useState(grupo?.name ?? '')
  const [cor, setCor] = useState<GroupColor>(grupo?.color ?? 'azure')
  const [erro, setErro] = useState<string | null>(null)
  const criar = useCriarGrupo(boardId)
  const atualizar = useAtualizarGrupo(boardId)
  const mutacao = grupo ? atualizar : criar

  function aoSubmeter(e: FormEvent) {
    e.preventDefault()
    const limpo = nome.trim()
    if (!limpo) {
      setErro('O nome não pode ficar vazio.')
      return
    }
    setErro(null)

    if (grupo) {
      atualizar.mutate({ id: grupo.id, campos: { name: limpo, color: cor } }, { onSuccess: aoConcluir })
      return
    }
    criar.mutate({ grupo: { name: limpo, color: cor }, position: proximaPosicao }, { onSuccess: aoConcluir })
  }

  return (
    <form onSubmit={aoSubmeter} className="flex flex-col gap-space-md">
      <Field label="Nome do grupo" error={erro ?? undefined}>
        {/* maxLength nativo cobre o limite de 120 do banco — sem validação à mão. */}
        <TextInput value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} />
      </Field>

      <Field label="Cor">
        <Select value={cor} options={CORES} onChange={(e) => setCor(e.target.value as GroupColor)} />
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
        <Button type="submit" variant="primary" loading={mutacao.isPending}>
          {grupo ? 'Salvar' : 'Criar grupo'}
        </Button>
      </div>
    </form>
  )
}
