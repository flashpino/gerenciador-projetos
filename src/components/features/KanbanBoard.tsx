import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useState } from 'react'
import { Tabs, type ItemTab } from '@/components/ui/Tabs'
import { colunasPorStatus } from '@/lib/kanban'
import { ORDEM_STATUS, STATUS } from '@/lib/status'
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

  /**
   * O arrastar não tem lógica própria: resolve id + destino e delega para
   * `mover`, o mesmo caminho do menu. Um caminho, um anúncio, um rollback.
   */
  const aoSoltar = ({ active, over }: DragEndEvent) => {
    if (!over) return
    const destino = over.id as TaskStatus
    if (!ORDEM_STATUS.includes(destino)) return // droppable desconhecido: nada a fazer
    const origem = colunas.find((c) => c.tarefas.some((t) => t.id === active.id))
    if (origem?.status === destino) return // soltou na própria coluna: nada a fazer
    mover(String(active.id), destino)
  }

  const abas: ItemTab[] = colunas.map((c) => ({
    id: c.status,
    rotulo: c.rotulo,
    contagem: c.tarefas.length,
  }))

  // Sem constraint de distância, o dnd-kit arma o arrastar já no pointerdown —
  // inclusive o pointerdown que faz parte de um clique comum — e engole o clique
  // que abriria "Ações de…". 8px é a folga padrão da própria documentação do
  // dnd-kit para isto: clique continua clique, só vira arrastar quem move de fato.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={aoSoltar}
      accessibility={{
        // O dnd-kit anuncia o arrastar sozinho, em inglês, numa região viva
        // própria (role="status"). Isso duplicaria o anúncio — e em outro
        // idioma — do mesmo evento que `mover` já anuncia em `<output>`
        // abaixo. "Um caminho, um anúncio": aqui os anúncios da própria lib
        // são silenciados (retornam undefined, nada é escrito na região dela)
        // em vez de desviar o container dela para um nó fora do documento —
        // isso deixaria o aria-describedby que ela injeta apontando para um
        // id que não resolve a nada (IDREF pendurado).
        announcements: {
          onDragStart: () => undefined,
          onDragMove: () => undefined,
          onDragOver: () => undefined,
          onDragEnd: () => undefined,
          onDragCancel: () => undefined,
        },
        screenReaderInstructions: {
          draggable: 'Use o menu "Ações de…" no card para mover esta tarefa entre colunas.',
        },
      }}
    >
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
          role="tabpanel"
          aria-labelledby={`aba-${visivel}`}
          // Sem overflow-x-auto: liberar a rolagem horizontal libera também a vertical (regra do CSS), e o menu
          // ⋮ de um cartão, que desce além da coluna, virava barra de rolagem e ficava cortado. As colunas têm
          // min-w-0 e cabem na grade: não há o que rolar na horizontal.
          className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-5"
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
    </DndContext>
  )
}
