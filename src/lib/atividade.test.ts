import { describe, expect, it } from 'vitest'
import { descreverAtividade } from './atividade'

const ANA = { full_name: 'Ana Lima', avatar_url: null }

describe('descreverAtividade', () => {
  it('tarefa criada', () => {
    expect(descreverAtividade({ kind: 'task_created', to_status: 'not_started', comment_excerpt: null, ator: ANA }))
      .toEqual({ icone: 'criada', ator: 'Ana Lima', antes: 'criou a tarefa', depois: '', status: null, trecho: null })
  })

  it('status → Pronto vira "concluiu", sem badge', () => {
    expect(descreverAtividade({ kind: 'status_changed', to_status: 'done', comment_excerpt: null, ator: ANA }))
      .toMatchObject({ icone: 'concluida', antes: 'concluiu', depois: '', status: null })
  })

  it('status → Travado vira "marcou … como travada"', () => {
    expect(descreverAtividade({ kind: 'status_changed', to_status: 'stuck', comment_excerpt: null, ator: ANA }))
      .toMatchObject({ icone: 'travada', antes: 'marcou', depois: ' como travada', status: null })
  })

  it('outros status: "mudou … para" + o status no badge', () => {
    expect(descreverAtividade({ kind: 'status_changed', to_status: 'review', comment_excerpt: null, ator: ANA }))
      .toMatchObject({ icone: 'status', antes: 'mudou', depois: ' para', status: 'review' })
  })

  it('comentário traz o trecho', () => {
    expect(descreverAtividade({ kind: 'comment_added', to_status: null, comment_excerpt: 'Figma exportado', ator: ANA }))
      .toMatchObject({ icone: 'comentario', antes: 'comentou em', depois: ':', trecho: 'Figma exportado' })
  })

  it('ator apagado (null) vira "Alguém"', () => {
    expect(descreverAtividade({ kind: 'task_created', to_status: null, comment_excerpt: null, ator: null }).ator).toBe('Alguém')
  })
})
