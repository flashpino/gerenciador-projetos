import { useState } from 'react'
import { Tabs, type ItemTab } from '@/components/ui/Tabs'
import { colunasPorStatus } from '@/lib/kanban'
import { STATUS } from '@/lib/status'
import type { GroupComTarefas, Profile, Task, TaskStatus } from '@/types/domain'
import { KanbanColumn } from './KanbanColumn'

interface Props {
  grupos: GroupComTarefas[]
  membros: Profile[]
  aoMover: (id: string, destino: TaskStatus) => void
  aoAbrir: (t: Task) => void
}

export function KanbanBoard({ grupos, membros, aoMover, aoAbrir }: Props) {
  const colunas = colunasPorStatus(grupos)
  const [visivel, setVisivel] = useState<TaskStatus>(colunas[0]?.status ?? 'not_started')
  const [anuncio, setAnuncio] = useState('')

  /**
   * Um só caminho de movimentação. O menu chama isto hoje; o arrastar (Task 6)
   * chamará exatamente isto. Duas rotas para o mesmo efeito seriam duas chances
   * de esquecer o anúncio.
   */
  const mover = (id: string, destino: TaskStatus) => {
    const tarefa = colunas.flatMap((c) => c.tarefas).find((t) => t.id === id)
    aoMover(id, destino)
    // Calculado no evento que causa a mudança, não num efeito derivando estado.
    if (tarefa) setAnuncio(`${tarefa.title} movida para ${STATUS[destino].rotulo}`)
  }

  const abas: ItemTab[] = colunas.map((c) => ({
    id: c.status,
    rotulo: c.rotulo,
    contagem: c.tarefas.length,
  }))

  return (
    <div>
      {/*
        Faixa de colunas. Em 375px ela é o navegador de coluna (F2.6); de 768px
        para cima as colunas aparecem lado a lado e a faixa sai de cena.
      */}
      <Tabs
        rotulo="Colunas do quadro"
        variant="pill"
        items={abas}
        value={visivel}
        onChange={(id) => setVisivel(id as TaskStatus)}
        idPainel="painel-kanban"
        className="mb-gutter md:hidden"
      />

      {/*
        A mensagem é TEXTO real numa região viva. Sem isto, acionar "Mover para
        Pronto" pelo teclado não produz retorno nenhum — o critério F2.3 exige o
        anúncio, não só a mudança.
      */}
      <output aria-live="polite" className="sr-only">
        {anuncio}
      </output>

      <div
        id="painel-kanban"
        className="grid grid-cols-1 gap-gutter md:grid-cols-2 md:overflow-x-auto lg:grid-cols-5"
      >
        {colunas.map((c) => (
          <KanbanColumn
            key={c.status}
            coluna={c}
            membros={membros}
            aoMover={mover}
            aoAbrir={aoAbrir}
            // Abaixo de 768px só a coluna escolhida aparece. `hidden` remove do
            // DOM acessível: o leitor nunca encontra 5 colunas onde o olho vê 1.
            className={c.status === visivel ? '' : 'hidden md:flex'}
          />
        ))}
      </div>
    </div>
  )
}
