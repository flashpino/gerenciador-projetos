import { useState, type FormEvent } from 'react'
import { AcoesDoFormulario } from '@/components/ui/AcoesDoFormulario'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { TextInput } from '@/components/ui/TextInput'
import { useAtualizarUsuario, useCriarUsuario } from '@/hooks/useUsuarios'
import type { UsuarioAdmin } from '@/services/usuarios'

type Alvo = Pick<UsuarioAdmin, 'id' | 'nome' | 'email'>

interface Props {
  aberto: boolean
  aoFechar: () => void
  /** null = cadastrar. Presente = editar. */
  usuario: Alvo | null
}

/**
 * Cadastrar/editar conta (tela Usuários, master). As regras de verdade (e-mail, 8–72 na senha, nome)
 * estão no servidor (supabase/functions/usuarios/regras.ts); aqui só o que evita ida e volta à toa.
 */
export function UsuarioFormModal({ aberto, aoFechar, usuario }: Props) {
  return (
    <Modal open={aberto} onClose={aoFechar} title={usuario ? 'Editar usuário' : 'Novo usuário'}>
      {aberto && <Formulario key={usuario?.id ?? 'novo'} usuario={usuario} aoConcluir={aoFechar} />}
    </Modal>
  )
}

function Formulario({ usuario, aoConcluir }: { usuario: Alvo | null; aoConcluir: () => void }) {
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [senha, setSenha] = useState('')
  const criar = useCriarUsuario()
  const atualizar = useAtualizarUsuario()
  const mutacao = usuario ? atualizar : criar

  function aoSubmeter(e: FormEvent) {
    e.preventDefault()
    const campos = { nome: nome.trim(), email: email.trim() }
    if (usuario) {
      // Senha em branco = mantém a atual.
      atualizar.mutate({ id: usuario.id, ...campos, ...(senha && { senha }) }, { onSuccess: aoConcluir })
      return
    }
    criar.mutate({ ...campos, senha }, { onSuccess: aoConcluir })
  }

  return (
    <form onSubmit={aoSubmeter} className="flex flex-col gap-space-md">
      <Field label="Nome">
        <TextInput value={nome} maxLength={120} required onChange={(e) => setNome(e.target.value)} />
      </Field>
      <Field label="E-mail">
        <TextInput type="email" value={email} required autoComplete="off" onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field
        label={usuario ? 'Nova senha' : 'Senha provisória'}
        hint={usuario ? 'Deixe em branco para manter a senha atual.' : 'De 8 a 72 caracteres. Passe para a pessoa trocar depois.'}
      >
        <TextInput
          type="password"
          value={senha}
          minLength={8}
          maxLength={72}
          required={!usuario}
          autoComplete="new-password"
          onChange={(e) => setSenha(e.target.value)}
        />
      </Field>

      <AcoesDoFormulario
        erro={mutacao.error}
        rotuloEnviar={usuario ? 'Salvar' : 'Cadastrar'}
        enviando={mutacao.isPending}
        aoCancelar={aoConcluir}
      />
    </form>
  )
}
