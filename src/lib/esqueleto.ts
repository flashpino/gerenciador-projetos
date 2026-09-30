export type TipoEsqueleto = 'tabela' | 'kanban' | 'gantt' | 'dashboard' | 'paineis' | 'feed' | 'pagina'

/**
 * Qual forma de skeleton a troca de página mostra, pela rota de destino. O <Suspense> do AppShell não sabe qual
 * página vem (é lazy); a URL já mudou, então ela diz. Rota sem forma própria cai no genérico `pagina`.
 */
export function tipoDeEsqueleto(pathname: string): TipoEsqueleto {
  const visao = /^\/boards\/[^/]+(?:\/(kanban|gantt|dashboard))?\/?$/.exec(pathname)
  if (visao) return (visao[1] as TipoEsqueleto | undefined) ?? 'tabela'
  if (pathname === '/') return 'tabela' // a abertura redireciona para a tabela do primeiro board
  if (['/paineis', '/favoritos', '/modelos'].includes(pathname)) return 'paineis'
  if (pathname === '/atividades') return 'feed'
  return 'pagina'
}
