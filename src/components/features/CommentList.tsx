import { useState, type FormEvent } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { StateView, type Estado } from '@/components/ui/StateView'
import { TextInput } from '@/components/ui/TextInput'
import { tempoRelativo } from '@/lib/date'
import type { Comment } from '@/types/domain'

interface Props {
  comments: Comment[]
  aoComentar: (body: string) => void
  comentando?: boolean
}

export function CommentList({ comments, aoComentar, comentando }: Props) {
  const [texto, setTexto] = useState('')

  function aoSubmeter(evento: FormEvent) {
    evento.preventDefault()
    const limpo = texto.trim()
    if (!limpo) return
    aoComentar(limpo)
    setTexto('')
  }

  const estado: Estado =
    comments.length === 0
      ? { tipo: 'vazio', titulo: 'Nenhum comentário ainda', descricao: 'Seja o primeiro a comentar.' }
      : { tipo: 'pronto' }

  return (
    <div>
      <form onSubmit={aoSubmeter} className="mb-space-md flex flex-col gap-space-sm">
        <TextInput
          multiline
          rows={3}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-label="Novo comentário"
          placeholder="Escreva um comentário…"
        />
        <Button type="submit" variant="primary" size="sm" loading={comentando} className="self-end">
          Comentar
        </Button>
      </form>

      <StateView estado={estado}>
        <ul className="flex flex-col gap-space-md">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-space-sm">
              <Avatar users={[c.author]} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-space-sm">
                  <span className="text-cell font-semibold text-ink">{c.author.full_name}</span>
                  <span className="text-label text-ink-muted">{tempoRelativo(c.created_at)}</span>
                </div>
                <p className="text-body text-ink">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </StateView>
    </div>
  )
}
