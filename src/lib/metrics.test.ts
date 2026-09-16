import { describe, expect, it } from 'vitest'
import type { Task, TaskStatus } from '@/types/domain'
import { contarAtrasadas, distribuicaoStatus, progressoDoGrupo, taxaDeConclusao } from './metrics'

function tarefa(status: TaskStatus, extra: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(), board_id: 'b', group_id: 'g', title: 't',
    description: null, status, priority: 'medium', assignee_id: null,
    start_date: null, due_date: null, progress: 0, estimated_hours: null,
    logged_hours: null, is_milestone: false, tags: [], position: 0,
    created_at: '', updated_at: '', ...extra,
  }
}

describe('taxaDeConclusao', () => {
  it('e concluidas sobre total, com uma casa decimal', () => {
    const t = [tarefa('done'), tarefa('done'), tarefa('working'), tarefa('stuck')]
    expect(taxaDeConclusao(t)).toBe(50)
  })

  it('arredonda para uma casa', () => {
    expect(taxaDeConclusao([tarefa('done'), tarefa('working'), tarefa('working')])).toBe(33.3)
  })

  it('devolve 0 para lista vazia — nunca NaN (criterio F4.3)', () => {
    expect(taxaDeConclusao([])).toBe(0)
    expect(Number.isNaN(taxaDeConclusao([]))).toBe(false)
  })
})

describe('distribuicaoStatus', () => {
  // Soma em decimos INTEIROS. Somar os floats direto daria 99.99999999999999
  // por representacao binaria, escondendo o invariante real atras de ruido.
  // Isto mantem a igualdade estrita — nao e enfraquecer a assercao.
  const somaEmDecimos = (t: Task[]) =>
    distribuicaoStatus(t).reduce((s, f) => s + Math.round(f.percentual * 10), 0)

  it('soma exatamente 100% quando ha tarefas', () => {
    const t = [tarefa('done'), tarefa('working'), tarefa('working'), tarefa('stuck')]
    expect(somaEmDecimos(t)).toBe(1000)
  })

  it('soma 100% mesmo quando a divisao nao e exata (3 tarefas)', () => {
    // 1/3 = 33.33...; tres fatias de 33.3 somam 99.9. O maior resto absorve a sobra.
    const t = [tarefa('done'), tarefa('working'), tarefa('stuck')]
    expect(somaEmDecimos(t)).toBe(1000)
  })

  it('omite status sem nenhuma tarefa', () => {
    const fatias = distribuicaoStatus([tarefa('done')])
    expect(fatias).toHaveLength(1)
    expect(fatias[0]?.status).toBe('done')
  })

  it('devolve lista vazia para entrada vazia', () => {
    expect(distribuicaoStatus([])).toEqual([])
  })
})

describe('progressoDoGrupo', () => {
  it('e a media do campo progress das tarefas', () => {
    expect(progressoDoGrupo([tarefa('working', { progress: 60 }), tarefa('done', { progress: 100 })]))
      .toBe(80)
  })

  it('devolve 0 para grupo vazio', () => {
    expect(progressoDoGrupo([])).toBe(0)
  })
})

describe('contarAtrasadas', () => {
  const hoje = new Date(2026, 8, 15)

  it('conta so as vencidas e nao concluidas', () => {
    const t = [
      tarefa('working', { due_date: '2026-09-10' }),  // atrasada
      tarefa('done', { due_date: '2026-09-01' }),     // entregue, nao conta
      tarefa('working', { due_date: '2026-09-30' }),  // no prazo
      tarefa('stuck', { due_date: null }),            // sem prazo
    ]
    expect(contarAtrasadas(t, hoje)).toBe(1)
  })
})
