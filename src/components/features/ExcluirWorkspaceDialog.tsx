import { useState, type FormEvent } from 'react'
import { AcoesDoFormulario } from '@/components/ui/AcoesDoFormulario'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { TextInput } from '@/components/ui/TextInput'
import { useExcluirWorkspace } from '@/hooks/useQuadro'
import type { Workspace } from '@/services/boards'

type Alvo = Pick<Workspace, 'id' | 'name'>

/**
 * Exclusão definitiva de workspace (só o dono — o RLS confere). O cascade leva os painéis, tarefas,
 * comentários e a lista de integrantes. Digitar o nome é o freio, como no ExcluirBoardDialog.
 */
export function ExcluirWorkspaceDialog({ workspace, aoFechar }: { workspace: Alvo | null; aoFechar: () => void }) {
  return (
    <Modal open={workspace !== null} onClose={aoFechar} title="Excluir workspace">
      {workspace && <Confirmar key={workspace.id} workspace={workspace} aoConcluir={aoFechar} />}
    </Modal>
  )
}

function Confirmar({ workspace, aoConcluir }: { workspace: Alvo; aoConcluir: () => void }) {
  const [digitado, setDigitado] = useState('')
  const excluir = useExcluirWorkspace()

  function aoSubmeter(e: FormEvent) {
    e.preventDefault()
    excluir.mutate(workspace.id, { onSuccess: aoConcluir })
  }

  return (
    <form onSubmit={aoSubmeter} className="flex flex-col gap-space-md">
      <p className="text-body text-ink">
        O workspace <strong>{workspace.name}</strong> será apagado com todos os painéis, tarefas e comentários, e
        os integrantes perdem o acesso. Não dá para desfazer.
      </p>
      <Field label={`Digite "${workspace.name}" para confirmar`}>
        <TextInput value={digitado} onChange={(e) => setDigitado(e.target.value)} autoComplete="off" />
      </Field>
      <AcoesDoFormulario
        erro={excluir.error}
        rotuloEnviar="Excluir workspace"
        variante="danger"
        enviando={excluir.isPending}
        desabilitado={digitado !== workspace.name}
        aoCancelar={aoConcluir}
      />
    </form>
  )
}
