import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/cn'
import { distribuicaoStatus, progressoDoGrupo } from '@/lib/metrics'
import { STATUS } from '@/lib/status'
import type { CamposEditaveis } from '@/services/boards'
import type { GroupColor, GroupComTarefas, Profile, Task } from '@/types/domain'
import { AssigneeCell } from './AssigneeCell'
import { DueDateCell } from './DueDateCell'
import { PriorityCell, StatusCell } from './EnumCell'

const BARRA_GRUPO: Record<GroupColor, string> = {
  azure: 'bg-group-azure',
  grape: 'bg-group-grape',
  mint: 'bg-group-mint',
  crimson: 'bg-group-crimson',
}

const TEXTO_GRUPO: Record<GroupColor, string> = {
  azure: 'text-group-azure',
  grape: 'text-group-grape',
  mint: 'text-group-mint',
  crimson: 'text-group-crimson',
}

interface Props {
  grupo: GroupComTarefas
  membros: Profile[]
  aoEditar: (id: string, campos: CamposEditaveis) => void
  aoAbrir: (task: Task) => void
  aoCriar: () => void
}

export function TaskGroup({ grupo, membros, aoEditar, aoAbrir, aoCriar }: Props) {
  const [aberto, setAberto] = useState(true)
  const tarefas = grupo.tasks
  const progresso = progressoDoGrupo(tarefas)
  const fatias = distribuicaoStatus(tarefas).map((f) => ({
    percentual: f.percentual,
    tone: STATUS[f.status].classe.split(' ')[0] ?? '',
    rotulo: STATUS[f.status].rotulo,
  }))

  return (
    <section className="glass mb-margin overflow-hidden rounded-card">
      <header className="flex items-center gap-space-sm border-b border-border px-space-md py-space-sm">
        <span aria-hidden="true" className={cn('h-6 w-1.5 rounded-full', BARRA_GRUPO[grupo.color])} />
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          className="flex min-h-touch items-center gap-space-xs md:min-h-0"
        >
          {aberto ? (
            <ChevronDown aria-hidden="true" className="size-4" />
          ) : (
            <ChevronRight aria-hidden="true" className="size-4" />
          )}
          <h2 className={cn('text-title', TEXTO_GRUPO[grupo.color])}>{grupo.name}</h2>
        </button>
        <Badge variant="soft">
          {tarefas.length} {tarefas.length === 1 ? 'item' : 'itens'}
        </Badge>

        <span className="ml-auto text-label text-ink-muted">Progresso: {progresso}%</span>
      </header>

      {aberto && (
        <>
          {/*
            Tabela a partir de 768px. `hidden` aplica display:none, que remove do
            DOM acessivel — leitor de tela nunca ve as duas versoes ao mesmo tempo.
          */}
          <table className="hidden w-full border-collapse md:table">
            <caption className="sr-only">
              Tarefas do grupo {grupo.name}, {tarefas.length} itens
            </caption>
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-label text-ink-muted">
                <th scope="col" className="w-10 px-space-sm py-space-sm">
                  <span className="sr-only">Selecionar</span>
                </th>
                <th scope="col" className="px-space-md py-space-sm">Item / Tarefa</th>
                <th scope="col" className="px-space-md py-space-sm">Responsável</th>
                <th scope="col" className="px-space-md py-space-sm">Status</th>
                <th scope="col" className="px-space-md py-space-sm">Prazo</th>
                <th scope="col" className="hidden px-space-md py-space-sm lg:table-cell">Prioridade</th>
                <th scope="col" className="hidden px-space-md py-space-sm lg:table-cell">Progresso</th>
              </tr>
            </thead>
            <tbody>
              {tarefas.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                  <td className="px-space-sm">
                    <Checkbox
                      checked={t.status === 'done'}
                      onChange={(v) => aoEditar(t.id, { status: v ? 'done' : 'working' })}
                      label={`Concluir ${t.title}`}
                      rotuloOculto
                    />
                  </td>
                  <td className="px-space-md py-space-sm">
                    <button
                      type="button"
                      onClick={() => aoAbrir(t)}
                      className={cn(
                        'text-left text-cell hover:underline',
                        t.status === 'done' && 'text-ink-muted line-through',
                      )}
                    >
                      {t.title}
                    </button>
                  </td>
                  <td className="px-space-md">
                    <AssigneeCell
                      assigneeId={t.assignee_id}
                      membros={membros}
                      nomeTarefa={t.title}
                      aoMudar={(id) => aoEditar(t.id, { assignee_id: id })}
                    />
                  </td>
                  <td className="px-space-md">
                    <StatusCell
                      valor={t.status}
                      nomeTarefa={t.title}
                      aoMudar={(s) => aoEditar(t.id, { status: s })}
                    />
                  </td>
                  <td className="px-space-md">
                    <DueDateCell task={t} />
                  </td>
                  <td className="hidden px-space-md lg:table-cell">
                    <PriorityCell
                      valor={t.priority}
                      nomeTarefa={t.title}
                      aoMudar={(p) => aoEditar(t.id, { priority: p })}
                    />
                  </td>
                  <td className="hidden px-space-md lg:table-cell">
                    <span className="flex items-center gap-space-sm">
                      <ProgressBar
                        value={t.progress}
                        label={`Progresso de ${t.title}`}
                        className="w-20"
                      />
                      <span className="text-cell text-ink-muted">{t.progress}%</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-2 text-label text-ink-muted">
                <td><span className="sr-only">Resumo do grupo</span></td>
                <td className="px-space-md py-space-sm">Total: {tarefas.length} tarefas</td>
                <td colSpan={2} className="px-space-md">
                  {fatias.length > 0 && (
                    <ProgressBar segments={fatias} label={`Distribuição do grupo ${grupo.name}`} />
                  )}
                </td>
                <td colSpan={3} className="px-space-md">Média: {progresso}%</td>
              </tr>
            </tfoot>
          </table>

          {/*
            Lista de cards abaixo de 768px (docs/responsive.md, F1).
            Uma <ul> de verdade: tabela "virada em card" por CSS mantem role=table
            e o leitor de tela anuncia "tabela, 7 colunas" para algo que virou lista.
          */}
          <ul className="md:hidden">
            {tarefas.map((t) => (
              <li key={t.id} className="border-b border-border p-space-md last:border-0">
                <div className="flex items-start gap-space-sm">
                  <Checkbox
                    checked={t.status === 'done'}
                    onChange={(v) => aoEditar(t.id, { status: v ? 'done' : 'working' })}
                    label={`Concluir ${t.title}`}
                    rotuloOculto
                  />
                  <button
                    type="button"
                    onClick={() => aoAbrir(t)}
                    className={cn(
                      'min-h-touch flex-1 text-left text-body font-medium',
                      t.status === 'done' && 'text-ink-muted line-through',
                    )}
                  >
                    {t.title}
                  </button>
                </div>
                <div className="mt-space-sm flex flex-wrap items-center gap-space-sm">
                  <StatusCell
                    valor={t.status}
                    nomeTarefa={t.title}
                    aoMudar={(s) => aoEditar(t.id, { status: s })}
                  />
                  <DueDateCell task={t} />
                  <AssigneeCell
                    assigneeId={t.assignee_id}
                    membros={membros}
                    nomeTarefa={t.title}
                    aoMudar={(id) => aoEditar(t.id, { assignee_id: id })}
                  />
                </div>
                <ProgressBar
                  value={t.progress}
                  label={`Progresso de ${t.title}`}
                  className="mt-space-sm"
                />
              </li>
            ))}
          </ul>

          <div className="border-t border-border p-space-sm">
            <Button
              variant="ghost"
              size="sm"
              iconStart={<Plus aria-hidden="true" className="size-4" />}
              onClick={aoCriar}
            >
              Adicionar item
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
