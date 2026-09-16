import { describe, expect, it } from 'vitest'
import { ORDEM_STATUS, PRIORIDADES, STATUS, rotuloPrioridade, rotuloStatus } from './status'

describe('STATUS', () => {
  it('cobre exatamente os 5 valores do enum do banco', () => {
    expect(Object.keys(STATUS).sort()).toEqual(
      ['done', 'not_started', 'review', 'stuck', 'working'],
    )
  })

  it('todo status tem rotulo em texto — cor nunca e o unico portador de significado', () => {
    for (const s of ORDEM_STATUS) {
      expect(rotuloStatus(s)).toMatch(/\S/)
    }
  })

  it('toda prioridade tem rotulo em texto', () => {
    for (const p of PRIORIDADES) {
      expect(rotuloPrioridade(p)).toMatch(/\S/)
    }
  })

  it('as classes de status referenciam tokens, nunca cor literal', () => {
    for (const s of ORDEM_STATUS) {
      expect(STATUS[s].classe).not.toMatch(/#[0-9a-f]{3}/i)
      expect(STATUS[s].classe).toContain('bg-status-')
      // par fundo+texto sempre junto: e o que garante os 4.5:1 validados
      expect(STATUS[s].classe).toContain('text-status-')
    }
  })

  it('a ordem do kanban comeca em nao iniciado e termina em travado', () => {
    expect(ORDEM_STATUS[0]).toBe('not_started')
    expect(ORDEM_STATUS.at(-1)).toBe('stuck')
  })
})
