import { useState, type FormEvent } from 'react'
import { AcoesDoFormulario } from '@/components/ui/AcoesDoFormulario'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { TextInput } from '@/components/ui/TextInput'
import { useExcluirUsuario } from '@/hooks/useUsuarios'
import type { UsuarioAdmin } from '@/services/usuarios'

type Alvo = Pick<UsuarioAdmin, 'id' | 'nome' | 'email'>

/**
 * Exclusão definitiva de conta (decisão do usuário: apaga tudo). Os cascades do banco levam o workspace
 * da pessoa com boards e tarefas, e os comentários dela em QUALQUER board. Digitar o e-mail é o freio —
 * e o servidor confere de novo contra o e-mail real da conta.
 */
export function ExcluirUsuarioDialog({ usuario, aoFechar }: { usuario: Alvo | null; aoFechar: () => void }) {
  return (
    <Modal open={usuario !== null} onClose={aoFechar} title="Excluir usuário">
      {usuario && <Confirmar key={usuario.id} usuario={usuario} aoConcluir={aoFechar} />}
    </Modal>
  )
}

function Confirmar({ usuario, aoConcluir }: { usuario: Alvo; aoConcluir: () => void }) {
  const [digitado, setDigitado] = useState('')
  const excluir = useExcluirUsuario()
  const confere = digitado.trim().toLowerCase() === usuario.email.toLowerCase()

  function aoSubmeter(e: FormEvent) {
    e.preventDefault()
    excluir.mutate({ id: usuario.id, confirmacao: digitado.trim() }, { onSuccess: aoConcluir })
  }

  return (
    <form onSubmit={aoSubmeter} className="flex flex-col gap-space-md">
      <p className="text-body text-ink">
        A conta de <strong>{usuario.nome}</strong> será apagada junto com o workspace dela, todos os painéis,
        tarefas e comentários — inclusive os comentários que ela fez em painéis de outras pessoas. Tarefas de
        outros atribuídas a ela ficam sem responsável. Não dá para desfazer.
      </p>

      <Field label={`Digite "${usuario.email}" para confirmar`}>
        <TextInput value={digitado} onChange={(e) => setDigitado(e.target.value)} autoComplete="off" />
      </Field>

      <AcoesDoFormulario
        erro={excluir.error}
        rotuloEnviar="Excluir conta"
        variante="danger"
        enviando={excluir.isPending}
        desabilitado={!confere}
        aoCancelar={aoConcluir}
      />
    </form>
  )
}
