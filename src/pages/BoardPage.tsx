import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Select } from '@/components/ui/Select'
import { BoardShell } from '@/components/features/BoardShell'
import { GrupoFormModal } from '@/components/features/GrupoFormModal'
import { TaskGroup } from '@/components/features/TaskGroup'
import { TaskModal } from '@/components/features/TaskModal'
import { VisaoDoBoard } from '@/components/features/VisaoDoBoard'
import { useAgrupamento, type Agrupamento } from '@/hooks/useAgrupamento'
import { useGruposFiltrados } from '@/hooks/useGruposFiltrados'
import { useAtualizarTarefa, useBoard, useMembros, useRemoverGrupo } from '@/hooks/useQuadro'
import { colunasPorStatus } from '@/lib/kanban'
import type { Group, Task } from '@/types/domain'

const OPCOES_AGRUPAMENTO: { value: Agrupamento; label: string }[] = [
  { value: 'grupo', label: 'Grupo' },
  { value: 'status', label: 'Status' },
]

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const board = useBoard(boardId)
  const grupos = useGruposFiltrados(boardId)
  const membros = useMembros(board.data?.workspace_id)
  const editar = useAtualizarTarefa(boardId)
  const removerGrupo = useRemoverGrupo(boardId)
  const { agrupamento, definir: definirAgrupamento } = useAgrupamento()
  const porStatus = agrupamento === 'status'

  // null = modal fechado. string = editando essa tarefa. '' = criando (o
  // grupo alvo vai em grupoParaCriar).
  const [taskIdModal, setTaskIdModal] = useState<string | null>(null)
  const [grupoParaCriar, setGrupoParaCriar] = useState<string | null>(null)
  const modalAberto = taskIdModal !== null || grupoParaCriar !== null

  // Modal de grupo: null = criar, um grupo = renomear/recolorir.
  const [grupoModalAberto, setGrupoModalAberto] = useState(false)
  const [grupoEditando, setGrupoEditando] = useState<Group | null>(null)
  const todosOsGrupos = grupos.todos ?? []
  const proximaPosicao = todosOsGrupos.reduce((max, g) => Math.max(max, g.position), -1) + 1

  function abrirGrupo(g: Group | null) {
    setGrupoEditando(g)
    setGrupoModalAberto(true)
  }

  /**
   * Lê da lista SEM filtro: o `on delete cascade` apagaria as tarefas que a busca escondeu, então só
   * se exclui grupo vazio de verdade — e nunca o último (`tasks.group_id` NOT NULL: sem grupo não há
   * onde criar tarefa).
   */
  function motivoNaoExcluir(id: string): string | undefined {
    if (todosOsGrupos.find((g) => g.id === id)?.tasks.length) return 'mova ou exclua as tarefas antes'
    if (todosOsGrupos.length <= 1) return 'é o último grupo'
    return undefined
  }

  function abrirParaEditar(task: Task) {
    setTaskIdModal(task.id)
    setGrupoParaCriar(null)
  }

  function abrirParaCriar(groupId: string) {
    setTaskIdModal(null)
    setGrupoParaCriar(groupId)
  }

  function fecharModal() {
    setTaskIdModal(null)
    setGrupoParaCriar(null)
  }

  // Board apagado ou de outro workspace: "tentar de novo" não o traz de volta.
  if (board.isError) return <Navigate to="/paineis" replace />

  return (
    <BoardShell titulo={board.data?.name ?? 'Quadro'}>
      {(editar.isError || removerGrupo.isError) && (
        <p role="alert" className="mb-gutter rounded bg-danger-soft px-space-md py-space-sm text-body text-danger-ink">
          {(editar.error ?? removerGrupo.error)?.message ?? 'Nao foi possivel salvar.'}
        </p>
      )}

      <VisaoDoBoard
        grupos={grupos}
        boardPendente={board.isPending}
        vazio={{
          titulo: 'Nenhuma tarefa ainda',
          descricao: 'Crie o primeiro grupo para comecar a organizar o trabalho da squad.',
          acao: (
            <Button variant="primary" onClick={() => abrirGrupo(null)}>
              Criar primeiro grupo
            </Button>
          ),
        }}
      >
        <div className="mb-margin w-full md:w-56">
          <Field label="Agrupar por">
            <Select
              value={agrupamento}
              options={OPCOES_AGRUPAMENTO}
              onChange={(e) => definirAgrupamento(e.target.value as Agrupamento)}
            />
          </Field>
        </div>

        {porStatus
          ? // Mesma divisão do kanban (colunasPorStatus), só os status com tarefa; o bloco é uma visão, não um grupo.
            colunasPorStatus(grupos.data ?? [])
              .filter((c) => c.tarefas.length > 0)
              .map((c) => (
                <TaskGroup
                  key={c.status}
                  status={c.status}
                  // `color` não é usada em modo status (a barra vem de `status`); o tipo só a exige.
                  grupo={{ name: c.rotulo, color: 'azure', tasks: c.tarefas }}
                  membros={membros.data ?? []}
                  aoEditar={(id, campos) => editar.mutate({ id, campos })}
                  aoAbrir={abrirParaEditar}
                />
              ))
          : grupos.data?.map((g) => (
              <TaskGroup
                key={g.id}
                grupo={g}
                membros={membros.data ?? []}
                aoEditar={(id, campos) => editar.mutate({ id, campos })}
                aoAbrir={abrirParaEditar}
                aoCriar={() => abrirParaCriar(g.id)}
                aoRenomear={() => abrirGrupo(g)}
                aoExcluir={() => removerGrupo.mutate(g.id)}
                motivoNaoExcluir={motivoNaoExcluir(g.id)}
              />
            ))}
        {!porStatus && (
          <Button
            variant="secondary"
            iconStart={<Plus aria-hidden="true" className="size-4" />}
            onClick={() => abrirGrupo(null)}
          >
            Novo grupo
          </Button>
        )}
      </VisaoDoBoard>

      {board.data && (
        <GrupoFormModal
          aberto={grupoModalAberto}
          aoFechar={() => setGrupoModalAberto(false)}
          boardId={board.data.id}
          grupo={grupoEditando}
          proximaPosicao={proximaPosicao}
        />
      )}

      {board.data && (
        <TaskModal
          aberto={modalAberto}
          aoFechar={fecharModal}
          boardId={board.data.id}
          taskId={taskIdModal}
          grupoInicialId={grupoParaCriar ?? grupos.todos?.[0]?.id ?? ''}
          grupos={(grupos.todos ?? []).map((g) => ({ id: g.id, name: g.name }))}
          membros={membros.data ?? []}
        />
      )}
    </BoardShell>
  )
}
