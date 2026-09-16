import { describe, expect, it } from 'vitest'
import type { GroupComTarefas, Task, TaskStatus } from '@/types/domain'
import { ORDEM_STATUS } from './status'
import { colunasPorStatus } from './kanban'

function tarefa(status: TaskStatus, extra: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(), board_id: 'b', group_id: 'g', title: 't',
    description: null, status, priority: 'medium', assignee_id: null,
    start_date: null, due_date: null, progress: 0, estimated_hours: null,
    logged_hours: null, is_milestone: false, tags: [], position: 0,
    created_at: '', updated_at: '', ...extra,
  }
}

function grupo(nome: string, position: number, tasks: Task[]): GroupComTarefas {
  return { id: nome, board_id: 'b', name: nome, color: 'azure', position, tasks }
}

describe('colunasPorStatus', () => {
  it('devolve UMA coluna por status, na ordem do backlog ao bloqueio', () => {
    const colunas = colunasPorStatus([grupo('g1', 0, [tarefa('working')])])

    expect(colunas.map((c) => c.status)).toEqual([...ORDEM_STATUS])
  })

  // F2.1 + F2.5: coluna sem card ainda existe, mostra contagem 0 e aceita drop.
  // Se o agrupamento devolvesse so os status presentes, "Nao iniciado" sumiria
  // assim que a ultima tarefa saisse dela — e nao haveria para onde voltar.
  it('mantem a coluna vazia mesmo quando nenhuma tarefa tem aquele status', () => {
    const colunas = colunasPorStatus([grupo('g1', 0, [tarefa('done')])])

    expect(colunas).toHaveLength(ORDEM_STATUS.length)
    expect(colunas.find((c) => c.status === 'not_started')?.tarefas).toEqual([])
  })

  it('devolve o board vazio como 5 colunas vazias, nao como lista vazia', () => {
    expect(colunasPorStatus([])).toHaveLength(ORDEM_STATUS.length)
    expect(colunasPorStatus([]).every((c) => c.tarefas.length === 0)).toBe(true)
  })

  it('poe cada tarefa na coluna do seu status', () => {
    const colunas = colunasPorStatus([
      grupo('g1', 0, [tarefa('working'), tarefa('done'), tarefa('working')]),
    ])
    const por = (s: TaskStatus) => colunas.find((c) => c.status === s)?.tarefas.length

    expect(por('working')).toBe(2)
    expect(por('done')).toBe(1)
    expect(por('stuck')).toBe(0)
  })

  // O kanban e uma visao sobre o board INTEIRO: as colunas cortam os grupos na
  // transversal. Uma tarefa "Em andamento" do grupo 2 divide coluna com uma do
  // grupo 1 — por isso a origem nao pode ser o grupo.
  it('junta na mesma coluna tarefas de grupos diferentes', () => {
    const colunas = colunasPorStatus([
      grupo('g1', 0, [tarefa('working', { title: 'do g1' })]),
      grupo('g2', 1, [tarefa('working', { title: 'do g2' })]),
    ])

    expect(colunas.find((c) => c.status === 'working')?.tarefas.map((t) => t.title))
      .toEqual(['do g1', 'do g2'])
  })

  // A ordem dentro da coluna precisa ser estavel entre renders, senao o card
  // pula de lugar sozinho a cada refetch. Grupo primeiro, position depois —
  // a mesma ordem que buscarGruposComTarefas ja devolve do banco.
  it('ordena por grupo e depois por position, nao pela ordem de chegada', () => {
    const colunas = colunasPorStatus([
      grupo('g2', 1, [
        tarefa('working', { title: 'b2', position: 1 }),
        tarefa('working', { title: 'b1', position: 0 }),
      ]),
      grupo('g1', 0, [tarefa('working', { title: 'a1', position: 0 })]),
    ])

    expect(colunas.find((c) => c.status === 'working')?.tarefas.map((t) => t.title))
      .toEqual(['a1', 'b1', 'b2'])
  })

  it('leva o rotulo em texto junto — cor nunca e o unico portador (WCAG 1.4.1)', () => {
    const colunas = colunasPorStatus([])

    expect(colunas.find((c) => c.status === 'not_started')?.rotulo).toBe('Não iniciado')
    expect(colunas.every((c) => c.rotulo.length > 0)).toBe(true)
  })
})
