import { useState, type FormEvent } from 'react'
import { AcoesDoFormulario } from '@/components/ui/AcoesDoFormulario'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { TextInput } from '@/components/ui/TextInput'
import { useCriarWorkspace, useRenomearWorkspace } from '@/hooks/useQuadro'
import type { Workspace } from '@/services/boards'

interface Props {
  aberto: boolean
  aoFechar: () => void
  /** null = criar (e já abrir). Presente = renomear. */
  workspace: Pick<Workspace, 'id' | 'name'> | null
}

export function WorkspaceFormModal({ aberto, aoFechar, workspace }: Props) {
  return (
    <Modal open={aberto} onClose={aoFechar} title={workspace ? 'Renomear workspace' : 'Novo workspace'}>
      {aberto && <Formulario key={workspace?.id ?? 'novo'} workspace={workspace} aoConcluir={aoFechar} />}
    </Modal>
  )
}

function Formulario({ workspace, aoConcluir }: { workspace: Props['workspace']; aoConcluir: () => void }) {
  const [nome, setNome] = useState(workspace?.name ?? '')
  const criar = useCriarWorkspace()
  const renomear = useRenomearWorkspace()
  const mutacao = workspace ? renomear : criar

  function aoSubmeter(e: FormEvent) {
    e.preventDefault()
    if (workspace) renomear.mutate({ id: workspace.id, nome }, { onSuccess: aoConcluir })
    else criar.mutate(nome, { onSuccess: aoConcluir })
  }

  return (
    <form onSubmit={aoSubmeter} className="flex flex-col gap-space-md">
      <Field label="Nome do workspace">
        {/* required + maxLength nativos cobrem a regra do banco (1–120). */}
        <TextInput value={nome} required maxLength={120} onChange={(e) => setNome(e.target.value)} />
      </Field>
      <AcoesDoFormulario
        erro={mutacao.error}
        rotuloEnviar={workspace ? 'Salvar' : 'Criar workspace'}
        enviando={mutacao.isPending}
        desabilitado={!nome.trim()}
        aoCancelar={aoConcluir}
      />
    </form>
  )
}
