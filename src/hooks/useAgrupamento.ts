import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export type Agrupamento = 'grupo' | 'status'

/**
 * Como a tabela agrupa as tarefas: pelos grupos do board (padrão) ou por status, como o kanban.
 * Estado na URL (`?agrupar=status`), como a busca e os filtros: sobrevive a reload e voltar.
 * O padrão não vai para a URL, que fica limpa; `replace` para não empilhar histórico.
 */
export function useAgrupamento() {
  const [params, setParams] = useSearchParams()
  const agrupamento: Agrupamento = params.get('agrupar') === 'status' ? 'status' : 'grupo'

  const definir = useCallback(
    (novo: Agrupamento) =>
      setParams(
        (atual) => {
          const saida = new URLSearchParams(atual)
          if (novo === 'status') saida.set('agrupar', 'status')
          else saida.delete('agrupar')
          return saida
        },
        { replace: true },
      ),
    [setParams],
  )

  return { agrupamento, definir }
}
