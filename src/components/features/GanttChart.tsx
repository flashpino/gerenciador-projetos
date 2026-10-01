import { useState } from 'react'
import { Tabs } from '@/components/ui/Tabs'
import { ajustarAEscala, calcularIntervaloVisivel, gerarTicks, isoDeData, posicaoData, type EscalaGantt } from '@/lib/gantt'
import type { GroupComTarefas } from '@/types/domain'
import { GanttRow } from './GanttRow'

interface Props {
  grupos: GroupComTarefas[]
}

/**
 * Sem grafico de terceiro (docs/components.md): barras sao divs posicionados
 * por px sobre uma grade de ticks. Coluna de nomes fica `sticky left-0`
 * (140px no celular, 240px de md em diante — docs/responsive.md, F3)
 * dentro do MESMO container com scroll — visualmente fixa, tecnicamente um
 * so scroll horizontal (critério F3.6), sem duplicar a lista em duas arvores
 * de DOM que teriam que ficar alinhadas na vertical à mão.
 */
export function GanttChart({ grupos }: Props) {
  const [escala, setEscala] = useState<EscalaGantt>('semana')

  const tarefas = grupos.flatMap((g) => g.tasks)
  const intervalo = ajustarAEscala(calcularIntervaloVisivel(tarefas), escala)
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

      {/* overflow-y-hidden explícito: só overflow-x-auto libera a rolagem vertical também (regra do CSS). */}
      <div className="glass overflow-x-auto overflow-y-hidden rounded-card">
        {/* w-max: a largura é a soma das linhas (coluna de nomes + timeline), qualquer que seja a coluna. */}
        <div className="w-max min-w-full">
          <div className="flex border-b border-border bg-surface-2">
            <div
              className="sticky left-0 z-10 w-35 shrink-0 border-r md:w-60 border-border bg-surface-2 px-space-md py-space-sm text-label text-ink-muted"
            >
              Tarefas
            </div>
            {/* Rótulos em cima, selo "Hoje" embaixo: no mesmo nível, o selo cobria o rótulo da semana. */}
            <div className="relative shrink-0" style={{ width: larguraTimeline, height: 48 }}>
              {ticks.map((t) => (
                <div
                  key={t.esquerda}
                  style={{ left: t.esquerda, width: t.largura }}
                  className="absolute inset-y-0 overflow-hidden whitespace-nowrap border-r border-border px-space-xs pt-space-xs text-label text-ink-muted"
                >
                  {t.label}
                </div>
              ))}
              <div style={{ left: hojeEsquerda }} className="absolute bottom-space-xs -translate-x-1/2">
                <span className="rounded-full bg-primary px-space-sm text-micro font-semibold text-primary-fg">
                  Hoje
                </span>
              </div>
            </div>
          </div>

          {grupos.map((g) => (
            <div key={g.id}>
              <div className="flex bg-surface-2">
                <div
                  className="sticky left-0 z-10 flex w-35 shrink-0 items-center truncate md:w-60 border-r border-border bg-surface-2 px-space-md py-space-xs"
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
                    className="sticky left-0 z-10 flex min-h-row w-35 shrink-0 md:w-60 items-center truncate border-r border-border bg-surface-2 px-space-md text-cell text-ink"
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
