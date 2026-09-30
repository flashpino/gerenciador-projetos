import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { StateView } from '@/components/ui/StateView'
import type { GruposFiltrados } from '@/hooks/useGruposFiltrados'
import { estadoDaQuery } from '@/lib/estadoDaQuery'
import { ResumoFiltro } from './ResumoFiltro'

interface Props {
  grupos: GruposFiltrados
  /** O board ainda carrega: as visões esperam por ele antes de mostrar "vazio". */
  boardPendente: boolean
  /** Estado vazio de um board SEM tarefas. Com busca/filtro ligado vale o texto próprio abaixo. */
  vazio: { titulo: string; descricao?: string; acao?: ReactNode }
  children: ReactNode
}

/**
 * Casca de dados comum de Tabela, Kanban e Gantt: os quatro estados da consulta dos
 * grupos + o resumo "Mostrando X de Y" quando há busca ou filtro. Unificado na 3ª
 * ocorrência (regra dos três).
 *
 * Nada encontrado com filtro ligado NÃO é "Nenhuma tarefa ainda": esse texto mentiria
 * (o board tem tarefas, o filtro é que as esconde).
 */
export function VisaoDoBoard({ grupos, boardPendente, vazio, children }: Props) {
  const estado = estadoDaQuery(
    boardPendente ? { ...grupos, isPending: true } : grupos,
    grupos.ativo
      ? {
          titulo: 'Nenhuma tarefa encontrada',
          descricao: 'Nada combina com a busca e os filtros atuais.',
          acao: (
            <Button variant="secondary" onClick={grupos.limpar}>
              Limpar busca e filtros
            </Button>
          ),
        }
      : vazio,
    () => void grupos.refetch(),
  )

  return (
    <StateView estado={estado}>
      {grupos.ativo && <ResumoFiltro visiveis={grupos.visiveis} total={grupos.total} aoLimpar={grupos.limpar} />}
      {children}
    </StateView>
  )
}
