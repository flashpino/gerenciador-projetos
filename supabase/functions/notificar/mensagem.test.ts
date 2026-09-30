import { describe, expect, it } from 'vitest'
import { deveNotificar, montarNotificacao, type Atividade } from './mensagem'

const base: Atividade = {
  board_id: 'b1',
  task_id: 't1',
  actor_id: 'u-ana',
  kind: 'status_changed',
  task_title: 'Revisar contrato',
  from_status: 'working',
  to_status: 'done',
  comment_excerpt: null,
}

describe('deveNotificar — quem recebe o push', () => {
  it('o responsável da tarefa recebe quando OUTRA pessoa age', () => {
    expect(deveNotificar('u-beto', 'u-ana')).toBe(true)
  })
  it('ninguém recebe push da própria ação', () => {
    expect(deveNotificar('u-ana', 'u-ana')).toBe(false)
  })
  it('tarefa sem responsável: ninguém recebe', () => {
    expect(deveNotificar(null, 'u-ana')).toBe(false)
  })
  it('mudança feita fora do app (sem ator) ainda avisa o responsável', () => {
    expect(deveNotificar('u-beto', null)).toBe(true)
  })
})

describe('montarNotificacao — o texto que aparece no celular', () => {
  it('status alterado: nome da tarefa no título, quem mudou e o status novo em texto', () => {
    expect(montarNotificacao(base, 'Ana Lima')).toEqual({
      titulo: 'Revisar contrato',
      corpo: 'Ana Lima mudou o status para Pronto.',
      url: '/boards/b1',
    })
  })

  it('comentário: mostra o trecho', () => {
    const n = montarNotificacao({ ...base, kind: 'comment_added', comment_excerpt: 'Pode revisar hoje?' }, 'Ana Lima')
    expect(n.titulo).toBe('Comentário em "Revisar contrato"')
    expect(n.corpo).toBe('Ana Lima: Pode revisar hoje?')
  })

  it('tarefa criada já atribuída', () => {
    const n = montarNotificacao({ ...base, kind: 'task_created', to_status: 'not_started' }, 'Ana Lima')
    expect(n.titulo).toBe('Nova tarefa para você')
    expect(n.corpo).toBe('Ana Lima criou "Revisar contrato".')
  })

  it('sem nome de quem agiu (mudança via SQL) diz "Alguém"', () => {
    expect(montarNotificacao(base, null).corpo).toBe('Alguém mudou o status para Pronto.')
  })
})
