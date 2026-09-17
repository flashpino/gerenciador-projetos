import { useState } from 'react'
import { Tabs } from '@/components/ui/Tabs'
import { calcularIntervaloVisivel, gerarTicks, isoDeData, posicaoData, type EscalaGantt } from '@/lib/gantt'
import type { GroupComTarefas } from '@/types/domain'
import { GanttRow } from './GanttRow'

interface Props {
  grupos: GroupComTarefas[]
}

const LARGURA_NOMES = 208

/**
 * Sem grafico de terceiro (docs/components.md): barras sao divs posicionados
 * por px sobre uma grade de ticks. Coluna de nomes fica `sticky left-0`
 * dentro do MESMO container com scroll — visualmente fixa, tecnicamente um
 * so scroll horizontal (critério F3.6), sem duplicar a lista em duas arvores
 * de DOM que teriam que ficar alinhadas na vertical à mão.
 */
export function GanttChart({ grupos }: Props) {
  const [escala, setEscala] = useState<EscalaGantt>('semana')

  const tarefas = grupos.flatMap((g) => g.tasks)
  const intervalo = calcularIntervaloVisivel(tarefas)
  const ticks = gerarTicks(intervalo, escala)
  const larguraTimeline = ticks.reduce((max, t) => Math.max(max, t.esquerda + t.largura), 0)
  // calcularIntervaloVisivel sempre inclui hoje no min/max antes da folga de
  // 3 dias — "hoje" cai dentro do intervalo por construcao, sem excecao.
  const hojeEsquerda = posicaoData(intervalo.inicio, isoDeData(new Date()), escala)

  return (
    <div>
      <Tabs
        rotulo="Escala do cronograma"
        variant="pill"
        items={[
          { id: 'dia', rotulo: 'Dias' },
          { id: 'semana', rotulo: 'Semanas' },
          { id: 'mes', rotulo: 'Meses' },
        ]}
        value={escala}
        onChange={(id) => setEscala(id as EscalaGantt)}
        className="mb-margin"
      />

      <div className="overflow-x-auto rounded-md border border-border">
        <div style={{ width: LARGURA_NOMES + larguraTimeline }}>
          <div className="flex border-b border-border bg-surface-2">
            <div
              className="sticky left-0 z-10 shrink-0 border-r border-border bg-surface-2 px-space-md py-space-sm text-label text-ink-muted"
              style={{ width: LARGURA_NOMES }}
            >
              Tarefas
            </div>
            <div className="relative shrink-0" style={{ width: larguraTimeline, height: 36 }}>
              {ticks.map((t) => (
                <div
                  key={t.esquerda}
                  style={{ left: t.esquerda, width: t.largura }}
                  className="absolute inset-y-0 flex items-center border-r border-border px-space-xs text-label text-ink-muted"
                >
                  {t.label}
                </div>
              ))}
              <div style={{ left: hojeEsquerda }} className="absolute inset-y-0 flex items-center">
                <span className="rounded bg-primary px-space-xs text-micro font-semibold text-primary-fg">
                  Hoje
                </span>
              </div>
            </div>
          </div>

          {grupos.map((g) => (
            <div key={g.id}>
              <div className="flex bg-surface-2">
                <div
                  className="sticky left-0 z-10 flex shrink-0 items-center truncate border-r border-border bg-surface-2 px-space-md py-space-xs"
                  style={{ width: LARGURA_NOMES }}
                >
                  {/* h2, não h3: a página (BoardShell) já usa h1 para o título do
                      board; TaskGroup (Tabela Principal) usa h2 para o mesmo nível
                      de grupo — pular para h3 aqui quebrava a ordem de headings
                      (achado do axe em src/test/a11y.test.tsx, regra heading-order). */}
                  <h2 className="truncate text-label font-semibold text-ink">{g.name}</h2>
                </div>
                <div style={{ width: larguraTimeline }} />
              </div>

              {g.tasks.map((t) => (
                <div key={t.id} className="flex border-b border-border last:border-0">
                  <div
                    className="sticky left-0 z-10 flex shrink-0 items-center truncate border-r border-border bg-surface px-space-md text-cell text-ink"
                    style={{ width: LARGURA_NOMES }}
                  >
                    <span className="truncate">{t.title}</span>
                  </div>
                  <div className="relative shrink-0" style={{ width: larguraTimeline }}>
                    <div
                      aria-hidden="true"
                      style={{ left: hojeEsquerda }}
                      className="absolute inset-y-0 w-px bg-primary/40"
                    />
                    <GanttRow task={t} inicioTimeline={intervalo.inicio} escala={escala} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
