import { describe, expect, it } from 'vitest'
import { criarTarefaFixture as tarefa } from '@/test/fixtures'
import type { GroupComTarefas } from '@/types/domain'
import {
  aplicarFiltro,
  casaTarefa,
  contarFiltros,
  contarTarefas,
  escreverFiltro,
  FILTRO_VAZIO,
  filtroAtivo,
  lerFiltro,
  SEM_RESPONSAVEL,
  type FiltroTarefas,
} from './filtro'

const HOJE = new Date(2026, 8, 29) // 29/09/2026
const com = (parcial: Partial<FiltroTarefas>): FiltroTarefas => ({ ...FILTRO_VAZIO, ...parcial })

function grupo(id: string, tasks: ReturnType<typeof tarefa>[]): GroupComTarefas {
  return { id, board_id: 'b', name: id, color: 'azure', position: 0, tasks } as GroupComTarefas
}

describe('casaTarefa — busca', () => {
  it('sem filtro nenhum, toda tarefa casa', () => {
    expect(casaTarefa(tarefa(), FILTRO_VAZIO, HOJE)).toBe(true)
  })

  it('acha pelo título, sem diferenciar maiúsculas', () => {
    expect(casaTarefa(tarefa({ title: 'Refatorar Login' }), com({ q: 'refatorar' }), HOJE)).toBe(true)
    expect(casaTarefa(tarefa({ title: 'Refatorar Login' }), com({ q: 'deploy' }), HOJE)).toBe(false)
  })

  it('acha pela descrição', () => {
    const t = tarefa({ title: 'Ajustar', description: 'Trocar o gateway de pagamento' })
    expect(casaTarefa(t, com({ q: 'gateway' }), HOJE)).toBe(true)
  })

  it('não diferencia acentos, nos dois sentidos', () => {
    expect(casaTarefa(tarefa({ title: 'Ação urgente' }), com({ q: 'acao' }), HOJE)).toBe(true)
    expect(casaTarefa(tarefa({ title: 'Acao urgente' }), com({ q: 'AÇÃO' }), HOJE)).toBe(true)
  })

  it('espaços nas pontas da busca são ignorados; busca só de espaços não filtra', () => {
    expect(casaTarefa(tarefa({ title: 'Login' }), com({ q: '  login  ' }), HOJE)).toBe(true)
    expect(casaTarefa(tarefa({ title: 'Login' }), com({ q: '   ' }), HOJE)).toBe(true)
  })

  it('descrição nula não quebra a busca', () => {
    expect(casaTarefa(tarefa({ title: 'x', description: null }), com({ q: 'y' }), HOJE)).toBe(false)
  })
})

describe('casaTarefa — filtros', () => {
  it('status: OU dentro da categoria', () => {
    const f = com({ status: ['working', 'review'] })
    expect(casaTarefa(tarefa({ status: 'review' }), f, HOJE)).toBe(true)
    expect(casaTarefa(tarefa({ status: 'done' }), f, HOJE)).toBe(false)
  })

  it('prioridade', () => {
    const f = com({ prioridade: ['high', 'critical'] })
    expect(casaTarefa(tarefa({ priority: 'critical' }), f, HOJE)).toBe(true)
    expect(casaTarefa(tarefa({ priority: 'low' }), f, HOJE)).toBe(false)
  })

  it('responsável por id', () => {
    const f = com({ responsavel: 'u1' })
    expect(casaTarefa(tarefa({ assignee_id: 'u1' }), f, HOJE)).toBe(true)
    expect(casaTarefa(tarefa({ assignee_id: 'u2' }), f, HOJE)).toBe(false)
    expect(casaTarefa(tarefa({ assignee_id: null }), f, HOJE)).toBe(false)
  })

  it('"sem responsável" casa só quem não tem ninguém', () => {
    const f = com({ responsavel: SEM_RESPONSAVEL })
    expect(casaTarefa(tarefa({ assignee_id: null }), f, HOJE)).toBe(true)
    expect(casaTarefa(tarefa({ assignee_id: 'u1' }), f, HOJE)).toBe(false)
  })

  it('atrasadas: prazo vencido e não concluída', () => {
    const f = com({ atrasadas: true })
    expect(casaTarefa(tarefa({ due_date: '2026-09-20', status: 'working' }), f, HOJE)).toBe(true)
    expect(casaTarefa(tarefa({ due_date: '2026-09-20', status: 'done' }), f, HOJE)).toBe(false)
    expect(casaTarefa(tarefa({ due_date: '2026-10-05' }), f, HOJE)).toBe(false)
    expect(casaTarefa(tarefa({ due_date: null }), f, HOJE)).toBe(false)
  })

  it('categorias diferentes se combinam com E', () => {
    const f = com({ status: ['working'], prioridade: ['high'], q: 'api' })
    expect(casaTarefa(tarefa({ title: 'API', status: 'working', priority: 'high' }), f, HOJE)).toBe(true)
    expect(casaTarefa(tarefa({ title: 'API', status: 'working', priority: 'low' }), f, HOJE)).toBe(false)
    expect(casaTarefa(tarefa({ title: 'Web', status: 'working', priority: 'high' }), f, HOJE)).toBe(false)
  })
})

describe('aplicarFiltro', () => {
  const grupos = [
    grupo('g1', [tarefa({ id: 'a', title: 'Login', status: 'working' }), tarefa({ id: 'b', title: 'Deploy', status: 'done' })]),
    grupo('g2', [tarefa({ id: 'c', title: 'Docs', status: 'done' })]),
    grupo('g3', []),
  ]

  it('sem filtro devolve tudo, inclusive grupo vazio (é onde se cria tarefa)', () => {
    expect(aplicarFiltro(grupos, FILTRO_VAZIO, HOJE)).toBe(grupos)
  })

  it('com filtro, mantém só as tarefas que casam e some com grupo sem nenhuma', () => {
    const r = aplicarFiltro(grupos, com({ status: ['done'] }), HOJE)
    expect(r.map((g) => g.id)).toEqual(['g1', 'g2'])
    expect(r[0]?.tasks.map((t) => t.id)).toEqual(['b'])
    expect(r[1]?.tasks.map((t) => t.id)).toEqual(['c'])
  })

  it('não altera os grupos de entrada', () => {
    aplicarFiltro(grupos, com({ q: 'login' }), HOJE)
    expect(grupos[0]?.tasks).toHaveLength(2)
  })

  it('nada casa: lista vazia', () => {
    expect(aplicarFiltro(grupos, com({ q: 'zzz' }), HOJE)).toEqual([])
  })

  it('contarTarefas soma todas as tarefas dos grupos', () => {
    expect(contarTarefas(grupos)).toBe(3)
    expect(contarTarefas([])).toBe(0)
  })
})

describe('filtroAtivo / contarFiltros', () => {
  it('vazio não está ativo', () => {
    expect(filtroAtivo(FILTRO_VAZIO)).toBe(false)
    expect(contarFiltros(FILTRO_VAZIO)).toBe(0)
  })

  it('busca só de espaços não conta como ativa', () => {
    expect(filtroAtivo(com({ q: '   ' }))).toBe(false)
  })

  it('a busca ativa o filtro mas não entra na contagem do botão Filtrar', () => {
    expect(filtroAtivo(com({ q: 'x' }))).toBe(true)
    expect(contarFiltros(com({ q: 'x' }))).toBe(0)
  })

  it('conta uma vez por categoria ativa, não por valor marcado', () => {
    const f = com({ status: ['working', 'review'], prioridade: ['high'], responsavel: 'u1', atrasadas: true })
    expect(contarFiltros(f)).toBe(4)
    expect(contarFiltros(com({ status: ['working', 'review', 'done'] }))).toBe(1)
  })
})

describe('lerFiltro / escreverFiltro (a URL é o estado)', () => {
  it('URL sem parâmetros é o filtro vazio', () => {
    expect(lerFiltro(new URLSearchParams())).toEqual(FILTRO_VAZIO)
  })

  it('ida e volta preserva o filtro', () => {
    const f = com({ q: 'ação', status: ['working', 'stuck'], prioridade: ['high'], responsavel: 'u1', atrasadas: true })
    expect(lerFiltro(escreverFiltro(new URLSearchParams(), f))).toEqual(f)
  })

  it('"sem responsável" faz a ida e volta', () => {
    const f = com({ responsavel: SEM_RESPONSAVEL })
    expect(lerFiltro(escreverFiltro(new URLSearchParams(), f)).responsavel).toBe(SEM_RESPONSAVEL)
  })

  it('valor inválido na URL é ignorado, sem quebrar', () => {
    const p = new URLSearchParams('status=working,banana&prio=urgentissima&atrasadas=talvez')
    expect(lerFiltro(p)).toEqual(com({ status: ['working'] }))
  })

  it('escrever um filtro vazio remove os parâmetros de filtro e preserva os outros', () => {
    const p = new URLSearchParams('q=x&status=working&aba=2')
    const r = escreverFiltro(p, FILTRO_VAZIO)
    expect(r.toString()).toBe('aba=2')
  })

  it('não altera o URLSearchParams recebido', () => {
    const p = new URLSearchParams('q=x')
    escreverFiltro(p, com({ q: 'y' }))
    expect(p.get('q')).toBe('x')
  })
})
