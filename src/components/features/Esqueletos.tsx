import { useLocation } from 'react-router-dom'
import { BlocoEsqueleto as B, StateView } from '@/components/ui/StateView'
import { tipoDeEsqueleto, type TipoEsqueleto } from '@/lib/esqueleto'

/*
 * Skeletons com a FORMA de cada tela: mesmos grids, larguras e cartões de vidro do componente real, para a
 * troca da página para o conteúdo não pular. Só decoração — o StateView os põe dentro de `aria-hidden` e
 * anuncia "Carregando…". Larguras variam de linha a linha (lista fixa, não aleatória: sem pular entre renders).
 */

const LARGURAS = ['w-3/5', 'w-2/5', 'w-4/5', 'w-1/2', 'w-2/3', 'w-1/3']
const largura = (i: number) => LARGURAS[i % LARGURAS.length]

/** `n` ids fixos para as listas de decoração (índice de array como key reprova no lint). */
const ids = (n: number): string[] => Array.from({ length: n }, (_, i) => `e${i}`)

/** Título do board + barra de busca + abas: o BoardShell, enquanto a página inteira ainda não chegou. */
function CabecalhoBoard() {
  return (
    <>
      <div className="mb-gutter flex flex-wrap items-center justify-between gap-space-md">
        <B sobreFundo className="h-10 w-64 max-w-full" />
        <B sobreFundo redondo className="h-11 w-72 max-w-full" />
      </div>
      <B sobreFundo redondo className="mb-margin h-12 w-96 max-w-full" />
    </>
  )
}

/** Tabela Principal: seletor "Agrupar por" + grupos com cabeçalho e linhas (lista de cards no celular). */
export function EsqueletoTabela() {
  return (
    <div>
      <B sobreFundo className="mb-space-xs h-4 w-24" />
      <B sobreFundo className="mb-margin h-9 w-full md:w-56" />
      {[
        { id: 'g1', linhas: 4 },
        { id: 'g2', linhas: 2 },
      ].map(({ id: grupo, linhas }, g) => (
        <div key={grupo} className="glass mb-margin rounded-card">
          <div className="flex items-center gap-space-sm border-b border-border px-space-md py-space-sm">
            <B className="h-6 w-1.5" />
            <B className={`h-6 ${g === 0 ? 'w-40' : 'w-28'}`} />
            <B redondo className="h-5 w-14" />
            <B className="ml-auto h-4 w-24" />
          </div>
          <div className="hidden gap-space-md border-b border-border bg-surface-2 px-space-md py-space-sm md:flex">
            {['w-6', 'w-1/4', 'w-1/6', 'w-40', 'w-24'].map((w) => (
              <B key={w} className={`h-3 ${w}`} />
            ))}
          </div>
          {ids(linhas).map((id) => (
            <div
              key={id}
              className="flex flex-wrap items-center gap-space-md border-b border-border px-space-md py-space-md last:border-0"
            >
              <B className="size-4" />
              <B className="h-4 flex-1 md:w-1/4 md:flex-none" />
              <B redondo className="hidden h-6 w-28 md:block" />
              <B redondo className="h-6 w-24" />
              <B className="h-4 w-20" />
              <B redondo className="hidden h-6 w-16 lg:block" />
              <B className="hidden h-2 w-20 lg:block" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** Kanban: as 5 colunas de status (cartão de vidro, status em pílula), com cartões opacos dentro. */
export function EsqueletoKanban() {
  return (
    <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-5">
      {[
        { id: 'c1', cartoes: 1, pilula: 'w-24' },
        { id: 'c2', cartoes: 2, pilula: 'w-28' },
        { id: 'c3', cartoes: 1, pilula: 'w-24' },
        { id: 'c4', cartoes: 2, pilula: 'w-16' },
        { id: 'c5', cartoes: 0, pilula: 'w-20' },
      ].map(({ id: coluna, cartoes, pilula }, c) => (
        <div key={coluna} className="glass flex min-w-0 flex-col rounded-card p-space-sm">
          <div className="mb-space-sm flex items-center gap-space-sm px-space-xs">
            <B redondo className={`h-7 ${pilula}`} />
            <B redondo className="h-5 w-6" />
          </div>
          <div className="flex flex-col gap-space-sm">
            {cartoes === 0 ? (
              <B className="h-12 w-full" />
            ) : (
              ids(cartoes).map((id, i) => (
                <div key={id} className="glass-strong flex flex-col gap-space-sm rounded-md p-space-md">
                  <B className={`h-4 ${largura(i + c)}`} />
                  <B className="h-4 w-1/3" />
                  <B redondo className="mt-space-xs h-6 w-14" />
                  <div className="flex items-center gap-space-sm">
                    <B className="h-4 w-20" />
                    <B className="ml-auto h-2 w-1/2" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Gantt: régua do tempo + coluna de nomes fixa (208px, como no GanttChart) e barras em degraus. */
export function EsqueletoGantt() {
  const barras = [
    [2, 30],
    [18, 22],
    [34, 40],
    [50, 18],
    [8, 55],
    [62, 26],
  ]
  return (
    <div>
      <B sobreFundo redondo className="mb-margin h-10 w-64 max-w-full" />
      <div className="glass overflow-hidden rounded-card">
        <div className="flex border-b border-border bg-surface-2">
          <div className="w-52 shrink-0 border-r border-border px-space-md py-space-sm">
            <B className="h-3 w-16" />
          </div>
          <div className="flex flex-1 items-center gap-space-lg px-space-md">
            {ids(8).map((id) => (
              <B key={id} className="h-3 w-10" />
            ))}
          </div>
        </div>
        {barras.map(([inicio, tamanho], i) => (
          <div key={`${inicio}-${tamanho}`} className="flex border-b border-border last:border-0">
            <div className="w-52 shrink-0 border-r border-border px-space-md py-space-md">
              <B className={`h-4 ${largura(i)}`} />
            </div>
            <div className="relative flex-1">
              <B redondo className="absolute top-1/2 h-6 -translate-y-1/2" style={{ left: `${inicio}%`, width: `${tamanho}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Linhas do feed de atividades: ícone redondo + frase + data. */
export function EsqueletoFeed({ linhas = 5 }: { linhas?: number }) {
  return (
    <div className="flex flex-col gap-space-md">
      {ids(linhas).map((id, i) => (
        <div key={id} className="flex items-start gap-space-sm">
          <B redondo className="size-8 shrink-0" />
          <div className="flex flex-1 flex-col gap-space-xs">
            <B className={`h-4 ${largura(i + 2)}`} />
            <B className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Dashboard: 2 métricas, rosca de status, progresso por grupo e o card de atividades recentes. */
export function EsqueletoDashboard({ semAtividades = false }: { semAtividades?: boolean }) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
        {['conclusao', 'atrasadas'].map((metrica, i) => (
          <div key={metrica} className="glass flex flex-col gap-space-sm rounded-card p-space-md">
            <B className="h-4 w-32" />
            <B className="h-9 w-20" />
            {i === 0 && <B className="h-2 w-full" />}
          </div>
        ))}
      </div>
      <div className="mt-margin grid grid-cols-1 gap-space-md md:grid-cols-2">
        <div className="glass rounded-card p-space-md">
          <B className="mb-space-md h-6 w-48" />
          <div className="flex flex-wrap items-center gap-margin">
            <B redondo className="size-40" />
            <div className="flex flex-col gap-space-sm">
              {['w-24', 'w-20', 'w-28', 'w-16'].map((w) => (
                <div key={w} className="flex items-center gap-space-sm">
                  <B className="size-3" />
                  <B className={`h-4 ${w}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="glass rounded-card p-space-md">
          <B className="mb-space-md h-6 w-44" />
          <div className="flex flex-col gap-space-md">
            {ids(4).map((id, i) => (
              <div key={id} className="flex flex-col gap-space-xs">
                <B className={`h-4 ${largura(i)}`} />
                <B className="h-2 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
      {!semAtividades && (
        <div className="mt-margin glass rounded-card p-space-md">
          <B className="mb-space-md h-6 w-44" />
          <EsqueletoFeed linhas={3} />
        </div>
      )}
    </div>
  )
}

/** Meus Painéis / Favoritos / Modelos: grade de cartões de board. */
export function EsqueletoPaineis() {
  return (
    <div className="grid grid-cols-1 gap-space-md md:grid-cols-2 lg:grid-cols-3">
      {ids(6).map((id, i) => (
        <div key={id} className="glass flex items-start gap-space-sm rounded-card p-space-md">
          <div className="flex flex-1 flex-col gap-space-sm">
            <B className={`h-5 ${largura(i)}`} />
            <B className="h-3 w-24" />
          </div>
          <B redondo className="size-6" />
        </div>
      ))}
    </div>
  )
}

const CORPO: Record<Exclude<TipoEsqueleto, 'pagina'>, () => React.JSX.Element> = {
  tabela: EsqueletoTabela,
  kanban: EsqueletoKanban,
  gantt: EsqueletoGantt,
  dashboard: () => <EsqueletoDashboard />,
  paineis: EsqueletoPaineis,
  feed: () => (
    <div className="glass rounded-card p-space-lg">
      <EsqueletoFeed />
    </div>
  ),
}

/**
 * A página inteira (cabeçalho + corpo) na forma da rota de destino — fallback do <Suspense> do AppShell na troca
 * de página, e da abertura enquanto descobre o primeiro board.
 */
export function EsqueletoDaRota() {
  const tipo = tipoDeEsqueleto(useLocation().pathname)
  const ehBoard = tipo === 'tabela' || tipo === 'kanban' || tipo === 'gantt' || tipo === 'dashboard'
  const Corpo = tipo === 'pagina' ? null : CORPO[tipo]

  return (
    <StateView
      estado={{ tipo: 'carregando' }}
      esqueleto={
        <div className="mx-auto max-w-canvas p-gutter md:p-margin">
          {ehBoard ? (
            <CabecalhoBoard />
          ) : (
            <div className="mb-gutter flex items-center justify-between gap-space-md">
              <B sobreFundo className="h-10 w-56 max-w-full" />
              {tipo === 'paineis' && <B sobreFundo redondo className="h-9 w-32" />}
            </div>
          )}
          {Corpo ? (
            <Corpo />
          ) : (
            <div className="glass flex flex-col gap-space-sm rounded-card p-space-lg">
              {ids(4).map((id, i) => (
                <B key={id} className={`h-4 ${largura(i)}`} />
              ))}
            </div>
          )}
        </div>
      }
    >
      {null}
    </StateView>
  )
}
