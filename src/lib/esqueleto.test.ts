import { describe, expect, it } from 'vitest'
import { tipoDeEsqueleto } from './esqueleto'

describe('tipoDeEsqueleto — qual forma de skeleton mostrar enquanto a rota carrega', () => {
  it.each([
    ['/', 'tabela'], // a abertura redireciona para a tabela do primeiro board
    ['/boards/b1', 'tabela'],
    ['/boards/b1/kanban', 'kanban'],
    ['/boards/b1/gantt', 'gantt'],
    ['/boards/b1/dashboard', 'dashboard'],
    ['/paineis', 'paineis'],
    ['/favoritos', 'paineis'],
    ['/atividades', 'feed'],
    ['/modelos', 'paineis'],
    ['/ajuda', 'pagina'],
    ['/configuracoes', 'pagina'],
    ['/qualquer-outra', 'pagina'],
  ])('%s → %s', (rota, tipo) => {
    expect(tipoDeEsqueleto(rota)).toBe(tipo)
  })
})
