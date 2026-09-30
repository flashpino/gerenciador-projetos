import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { escreverFiltro, FILTRO_VAZIO, lerFiltro, type FiltroTarefas } from '@/lib/filtro'

/**
 * Busca e filtros do board. O estado é a query da URL: sobrevive à troca de visão,
 * ao reload e ao botão voltar, e o link é compartilhável. `replace` para digitar
 * na busca não empilhar uma entrada de histórico por tecla.
 */
export function useFiltroTarefas() {
  const [params, setParams] = useSearchParams()
  const filtro = useMemo(() => lerFiltro(params), [params])

  const definir = useCallback(
    (parcial: Partial<FiltroTarefas>) =>
      setParams((atual) => escreverFiltro(atual, { ...lerFiltro(atual), ...parcial }), { replace: true }),
    [setParams],
  )

  const limpar = useCallback(
    () => setParams((atual) => escreverFiltro(atual, FILTRO_VAZIO), { replace: true }),
    [setParams],
  )

  return { filtro, definir, limpar }
}
