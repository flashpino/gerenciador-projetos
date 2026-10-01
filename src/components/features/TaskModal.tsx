import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { StateView, type Estado } from '@/components/ui/StateView'
import { Tabs } from '@/components/ui/Tabs'
import { TextInput } from '@/components/ui/TextInput'
import {
  useAtualizarSubtarefa,
  useAtualizarTarefa,
  useCriarComentario,
  useCriarSubtarefa,
  useCriarTarefa,
  useRemoverSubtarefa,
  useTarefaDetalhe,
} from '@/hooks/useQuadro'
import { useSessao } from '@/hooks/useSessao'
import type { Profile, TaskComDetalhe, TaskPriority, TaskStatus } from '@/types/domain'
import { AssigneeCell } from './AssigneeCell'
import { CommentList } from './CommentList'
import { PriorityCell, StatusCell } from './EnumCell'
import { SubtaskList } from './SubtaskList'

interface Props {
  aberto: boolean
  aoFechar: () => void
  boardId: string
  /** null = modo criação. Um id = edição, busca via useTarefaDetalhe. */
  taskId: string | null
  /** Só lido em modo criação. Quem edita (ex.: KanbanPage) não precisa passar. */
  grupoInicialId?: string
  grupos: { id: string; name: string }[]
  membros: Profile[]
}

/**
 * Único ponto de escrita rica do app (docs/specs.md, seção 2). So decide
 * ABRIR e o que buscar; todo o formulario vive em FormularioTarefa, montado
 * com `key` por tarefa — ver o comentario la para o motivo.
 */
export function TaskModal({ aberto, aoFechar, boardId, taskId, grupoInicialId = '', grupos, membros }: Props) {
  const editando = taskId !== null
  const detalhe = useTarefaDetalhe(taskId ?? undefined)

  const estadoDetalhe: Estado = detalhe.isPending
    ? { tipo: 'carregando' }
    : detalhe.isError
      ? { tipo: 'erro', mensagem: detalhe.error instanceof Error ? detalhe.error.message : 'Não foi possível carregar.' }
      : { tipo: 'pronto' }

  return (
    <Modal open={aberto} onClose={aoFechar} title={editando ? 'Editar tarefa' : 'Nova tarefa'} size="lg">
      {aberto && !editando && (
        <FormularioTarefa
          key="novo"
          tarefaInicial={null}
          taskId={null}
          boardId={boardId}
          grupoInicialId={grupoInicialId}
          grupos={grupos}
          membros={membros}
          aoFechar={aoFechar}
        />
      )}

      {aberto && editando && (
        <StateView estado={estadoDetalhe}>
          {detalhe.data && (
            <FormularioTarefa
              key={detalhe.data.id}
              tarefaInicial={detalhe.data}
              taskId={taskId}
              boardId={boardId}
              grupoInicialId={grupoInicialId}
              grupos={grupos}
              membros={membros}
              aoFechar={aoFechar}
            />
          )}
        </StateView>
      )}
    </Modal>
  )
}

type Aba = 'detalhes' | 'subtarefas' | 'atividade'

interface FormularioProps {
  /** null = criacao. Presente = edicao, ja carregada — usado so pra inicializar o useState. */
  tarefaInicial: TaskComDetalhe | null
  taskId: string | null
  boardId: string
  grupoInicialId: string
  grupos: { id: string; name: string }[]
  membros: Profile[]
  aoFechar: () => void
}

/**
 * Um `key` por tarefa (ou "novo") no componente pai faz o React desmontar e
 * remontar isto inteiro ao trocar de tarefa — os `useState` abaixo reinicializam
 * com o dado certo sem precisar de useEffect sincronizando estado a partir de
 * uma prop. Sincronizar via efeito dispara um segundo render em cascata
 * (react/set-state-in-effect) para resolver o que o proprio React resolve de
 * graca com remontagem.
 */
function FormularioTarefa({
  tarefaInicial,
  taskId,
  boardId,
  grupoInicialId,
  grupos,
  membros,
  aoFechar,
}: FormularioProps) {
  const editando = taskId !== null
  const { usuario } = useSessao()

  const salvarEdicao = useAtualizarTarefa(boardId)
  const salvarNova = useCriarTarefa(boardId)
  const alternarSubtarefa = useAtualizarSubtarefa(taskId ?? undefined)
  const adicionarSubtarefa = useCriarSubtarefa(taskId ?? undefined)
  const removerSubtarefaMut = useRemoverSubtarefa(taskId ?? undefined)
  const comentar = useCriarComentario(taskId ?? undefined)

  const [aba, setAba] = useState<Aba>('detalhes')
  const [titulo, setTitulo] = useState(tarefaInicial?.title ?? '')
  const [descricao, setDescricao] = useState(tarefaInicial?.description ?? '')
  const [grupoId, setGrupoId] = useState(tarefaInicial?.group_id ?? grupoInicialId)
  const [status, setStatus] = useState<TaskStatus>(tarefaInicial?.status ?? 'not_started')
  const [prioridade, setPrioridade] = useState<TaskPriority>(tarefaInicial?.priority ?? 'medium')
  const [assigneeId, setAssigneeId] = useState<string | null>(tarefaInicial?.assignee_id ?? null)
  const [inicio, setInicio] = useState(tarefaInicial?.start_date ?? '')
  const [prazo, setPrazo] = useState(tarefaInicial?.due_date ?? '')
  const [horasEstimadas, setHorasEstimadas] = useState(tarefaInicial?.estimated_hours?.toString() ?? '')
  const [horasGastas, setHorasGastas] = useState(tarefaInicial?.logged_hours?.toString() ?? '')
  const [isMarco, setIsMarco] = useState(tarefaInicial?.is_milestone ?? false)
  const [erroTitulo, setErroTitulo] = useState<string | null>(null)
  const [erroPeriodo, setErroPeriodo] = useState<string | null>(null)

  function aoSalvar() {
    const tituloLimpo = titulo.trim()
    if (!tituloLimpo) {
      setErroTitulo('O título não pode ficar vazio.')
      return
    }
    // Mesma regra do constraint periodo_coerente do banco (0001_init.up.sql).
    if (inicio && prazo && prazo < inicio) {
      setErroPeriodo('O prazo não pode ser anterior à data de início.')
      return
    }
    // Mesma regra do constraint marco_tem_data — um marco e uma data unica (F3.4).
    if (isMarco && !prazo) {
      setErroPeriodo('Um marco precisa de uma data de prazo.')
      return
    }
    setErroTitulo(null)
    setErroPeriodo(null)

    const campos = {
      title: tituloLimpo,
      description: descricao.trim() || null,
      group_id: grupoId,
      status,
      priority: prioridade,
      assignee_id: assigneeId,
      start_date: inicio || null,
      due_date: prazo || null,
      estimated_hours: horasEstimadas ? Number(horasEstimadas) : null,
      logged_hours: horasGastas ? Number(horasGastas) : null,
      is_milestone: isMarco,
    }

    if (editando && taskId) {
      salvarEdicao.mutate({ id: taskId, campos }, { onSuccess: aoFechar })
    } else {
      salvarNova.mutate({ board_id: boardId, ...campos }, { onSuccess: aoFechar })
    }
  }

  const salvando = salvarEdicao.isPending || salvarNova.isPending
  const nomeParaAria = titulo || 'nova tarefa'

  const campos = (
    <div className="flex flex-col gap-space-md">
      <Field label="Título" error={erroTitulo ?? undefined}>
        <TextInput value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </Field>

      <Field label="Descrição">
        <TextInput multiline rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </Field>

      <div className="grid gap-space-md md:grid-cols-2">
        <Field label="Grupo de destino">
          <Select
            value={grupoId}
            onChange={(e) => setGrupoId(e.target.value)}
            options={grupos.map((g) => ({ value: g.id, label: g.name }))}
          />
        </Field>
        <div className="flex flex-wrap items-end gap-space-sm">
          <StatusCell valor={status} nomeTarefa={nomeParaAria} aoMudar={setStatus} />
          <PriorityCell valor={prioridade} nomeTarefa={nomeParaAria} aoMudar={setPrioridade} />
        </div>
      </div>

      <AssigneeCell assigneeId={assigneeId} membros={membros} nomeTarefa={nomeParaAria} aoMudar={setAssigneeId} />

      <div className="grid grid-cols-2 gap-space-md">
        <Field label="Início">
          <TextInput type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} disabled={isMarco} />
        </Field>
        <Field label="Prazo" error={erroPeriodo ?? undefined}>
          <TextInput type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </Field>
      </div>

      <Checkbox checked={isMarco} onChange={setIsMarco} label="É um marco (data única, sem período)" />

      <div className="grid grid-cols-2 gap-space-md">
        <Field label="Horas estimadas">
          <TextInput type="number" min={0} value={horasEstimadas} onChange={(e) => setHorasEstimadas(e.target.value)} />
        </Field>
        <Field label="Horas gastas">
          <TextInput type="number" min={0} value={horasGastas} onChange={(e) => setHorasGastas(e.target.value)} />
        </Field>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-space-lg">
      {editando && (
        <Tabs
          rotulo="Seções da tarefa"
          items={[
            { id: 'detalhes', rotulo: 'Detalhes' },
            { id: 'subtarefas', rotulo: 'Subtarefas', contagem: tarefaInicial?.subtasks.length ?? 0 },
            { id: 'atividade', rotulo: 'Atividade', contagem: tarefaInicial?.comments.length ?? 0 },
          ]}
          value={aba}
          onChange={(id) => setAba(id as Aba)}
          className="border-b border-border"
        />
      )}

      {(!editando || aba === 'detalhes') && campos}

      {editando && aba === 'subtarefas' && (
        <SubtaskList
          subtasks={tarefaInicial?.subtasks ?? []}
          aoAlternar={(id, done) => alternarSubtarefa.mutate({ id, campos: { done } })}
          aoAdicionar={(title) => adicionarSubtarefa.mutate({ title, position: tarefaInicial?.subtasks.length ?? 0 })}
          aoRemover={(id) => removerSubtarefaMut.mutate(id)}
          adicionando={adicionarSubtarefa.isPending}
        />
      )}

      {editando && aba === 'atividade' && (
        <CommentList
          comments={tarefaInicial?.comments ?? []}
          aoComentar={(body) => usuario && comentar.mutate({ authorId: usuario.id, body })}
          comentando={comentar.isPending}
        />
      )}

      <div className="flex justify-end gap-space-sm border-t border-border pt-space-md">
        <Button variant="secondary" onClick={aoFechar}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={aoSalvar} loading={salvando}>
          Salvar
        </Button>
      </div>
    </div>
  )
}
