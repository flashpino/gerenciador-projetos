import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { StateView } from '@/components/ui/StateView'
import { TextInput } from '@/components/ui/TextInput'
import { useAdicionarMembro, useMembros, useRemoverMembro } from '@/hooks/useQuadro'
import { useSessao } from '@/hooks/useSessao'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import type { Profile } from '@/types/domain'

interface Props {
  aberto: boolean
  aoFechar: () => void
  workspaceId: string
  donoId: string
}

/** Integrantes do workspace do board. Todos veem; só o dono adiciona e remove. */
export function IntegrantesModal({ aberto, aoFechar, workspaceId, donoId }: Props) {
  return (
    <Modal open={aberto} onClose={aoFechar} title="Integrantes">
      {aberto && <Conteudo workspaceId={workspaceId} donoId={donoId} />}
    </Modal>
  )
}

function Conteudo({ workspaceId, donoId }: { workspaceId: string; donoId: string }) {
  const membros = useMembros(workspaceId)
  const { usuario } = useSessao()
  const navigate = useNavigate()
  const adicionar = useAdicionarMembro()
  const remover = useRemoverMembro()
  const [email, setEmail] = useState('')
  const souDono = usuario?.id === donoId
  const erro = adicionar.error ?? remover.error

  function aoSubmeter(e: FormEvent) {
    e.preventDefault()
    const limpo = email.trim()
    if (!limpo) return
    remover.reset()
    adicionar.mutate({ workspaceId, email: limpo }, { onSuccess: () => setEmail('') })
  }

  function aoRemover(membro: Profile) {
    // ponytail: confirm() nativo; diálogo próprio só se o texto precisar de formatação.
    if (!window.confirm(`Remover ${membro.full_name} do workspace?`)) return
    adicionar.reset()
    remover.mutate({ workspaceId, userId: membro.id })
  }

  // Quem foi adicionado sem pedir sai sozinho (0006). O board deixa de ser visível,
  // então a volta é para Meus Painéis.
  function aoSair() {
    if (!usuario || !window.confirm('Sair deste workspace? Você deixa de ver os boards dele.')) return
    adicionar.reset()
    remover.mutate({ workspaceId, userId: usuario.id }, { onSuccess: () => navigate('/paineis') })
  }

  const estado = estadoDaQuery(membros, { titulo: 'Nenhum integrante' }, () => void membros.refetch())

  return (
    <div className="flex flex-col gap-space-md">
      {souDono ? (
        <form onSubmit={aoSubmeter} className="flex flex-col gap-space-sm">
          <Field label="E-mail de quem já tem conta">
            <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" variant="primary" loading={adicionar.isPending} className="self-end">
            Adicionar
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-space-sm">
          <p className="text-body text-ink-muted">Só o dono do workspace pode convidar.</p>
          <Button variant="secondary" size="sm" loading={remover.isPending} className="self-start" onClick={aoSair}>
            Sair do workspace
          </Button>
        </div>
      )}

      {erro && (
        <p role="alert" className="rounded bg-danger-soft px-space-md py-space-sm text-body text-danger-ink">
          {erro.message}
        </p>
      )}

      <StateView estado={estado}>
        <ul aria-label="Integrantes do workspace" className="flex flex-col gap-space-sm">
          {membros.data?.map((m) => (
            <li key={m.id} className="flex min-h-touch items-center gap-space-sm">
              <span className="min-w-0 flex-1 truncate text-body text-ink">{m.full_name}</span>
              {m.id === donoId && <Badge variant="soft">Dono</Badge>}
              {souDono && m.id !== donoId && (
                <Button variant="ghost" size="sm" disabled={remover.isPending} aria-label={`Remover ${m.full_name}`} onClick={() => aoRemover(m)}>
                  Remover
                </Button>
              )}
            </li>
          ))}
        </ul>
      </StateView>
    </div>
  )
}
