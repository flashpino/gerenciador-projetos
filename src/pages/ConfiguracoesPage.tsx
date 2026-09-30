import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { StateView } from '@/components/ui/StateView'
import { TextInput } from '@/components/ui/TextInput'
import { useSessao } from '@/hooks/useSessao'
import { useAtualizarNome, useMembros, useWorkspaceAtual } from '@/hooks/useQuadro'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import type { Estado } from '@/components/ui/StateView'
import type { Profile } from '@/types/domain'

/**
 * Só o nome de exibição (docs/superpowers/specs/2026-09-29-configuracoes-ajuda-design.md).
 * O nome atual vem de `useMembros`, o mesmo caminho da Sidebar, então salvar aqui
 * atualiza a Sidebar pela invalidação de `['membros']`.
 */
export default function ConfiguracoesPage() {
  const { usuario } = useSessao()
  const workspace = useWorkspaceAtual()
  const membros = useMembros(workspace.data?.id)

  // Sem isto, um workspace com erro deixaria `membros` (desabilitado) pendente para sempre.
  const eu = membros.data?.filter((m) => m.id === usuario?.id)
  const estado: Estado = workspace.isError
    ? { tipo: 'erro', mensagem: workspace.error.message, aoTentarDeNovo: () => void workspace.refetch() }
    : estadoDaQuery(
        { isPending: membros.isPending, isError: membros.isError, error: membros.error, data: eu },
        { titulo: 'Perfil não encontrado', descricao: 'Saia e entre de novo.' },
        () => void membros.refetch(),
      )

  return (
    <div className="mx-auto max-w-canvas p-gutter md:p-margin">
      <h1 className="mb-gutter text-display">Configurações</h1>
      <StateView estado={estado}>
        {eu?.[0] && <FormularioNome key={eu[0].id} perfil={eu[0]} email={usuario?.email ?? ''} />}
      </StateView>
    </div>
  )
}

function FormularioNome({ perfil, email }: { perfil: Profile; email: string }) {
  const [nome, setNome] = useState(perfil.full_name)
  const [erro, setErro] = useState<string | null>(null)
  const salvar = useAtualizarNome()

  function aoSubmeter(e: FormEvent) {
    e.preventDefault()
    const limpo = nome.trim()
    if (!limpo) {
      setErro('O nome não pode ficar vazio.')
      return
    }
    setErro(null)
    salvar.mutate({ userId: perfil.id, nome: limpo })
  }

  return (
    <form onSubmit={aoSubmeter} className="glass flex max-w-md flex-col gap-space-md rounded-card p-space-lg">
      <Field label="Nome de exibição" error={erro ?? undefined}>
        {/* maxLength nativo cobre o limite de 120 do banco. */}
        <TextInput
          value={nome}
          maxLength={120}
          onChange={(e) => {
            setNome(e.target.value)
            salvar.reset() // editar de novo apaga "Nome atualizado."
          }}
        />
      </Field>

      <Field label="E-mail" hint="É o e-mail da sua conta e não pode ser alterado aqui.">
        <TextInput value={email} readOnly />
      </Field>

      {salvar.isError && (
        <p role="alert" className="rounded bg-danger-soft px-space-md py-space-sm text-body text-danger-ink">
          {salvar.error.message}
        </p>
      )}
      {salvar.isSuccess && <output className="rounded bg-success px-space-md py-space-sm text-body text-success-fg">Nome atualizado.</output>}

      <div>
        <Button type="submit" variant="primary" loading={salvar.isPending}>
          Salvar
        </Button>
      </div>
    </form>
  )
}
