import { diasAte, parseDataSimples } from './date'

export type EscalaGantt = 'dia' | 'semana' | 'mes'

const PX_POR_DIA: Record<EscalaGantt, number> = { dia: 40, semana: 12, mes: 4 }

export interface IntervaloVisivel {
  inicio: Date
  fim: Date
}

interface TarefaComPeriodo {
  start_date: string | null
  due_date: string | null
}

function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Intervalo minimo que cobre todas as tarefas com data + hoje, com folga de
 * 3 dias em cada ponta. Sem essa folga o timeline comecaria/terminaria
 * exatamente em cima da primeira/ultima barra, cortando a borda visual.
 */
export function calcularIntervaloVisivel(tarefas: TarefaComPeriodo[], hojeBruto = new Date()): IntervaloVisivel {
  const hoje = inicioDoDia(hojeBruto)
  const datas = tarefas
    .flatMap((t) => [parseDataSimples(t.start_date), parseDataSimples(t.due_date)])
    .filter((d): d is Date => d !== null)
  datas.push(hoje)

  const tempos = datas.map((d) => d.getTime())
  const inicio = new Date(Math.min(...tempos))
  const fim = new Date(Math.max(...tempos))
  inicio.setDate(inicio.getDate() - 3)
  fim.setDate(fim.getDate() + 3)
  return { inicio, fim }
}

export interface PosicaoBarra {
  esquerda: number
  largura: number
}

/** Posicao/largura em px de uma barra — ambas as datas ja resolvidas (nunca null). */
export function posicaoBarra(
  inicioTimeline: Date,
  startDate: string,
  dueDate: string,
  escala: EscalaGantt,
): PosicaoBarra {
  const px = PX_POR_DIA[escala]
  const inicioTarefa = parseDataSimples(startDate) as Date
  const duracaoDias = diasAte(dueDate, inicioTarefa) + 1
  const esquerda = diasAte(startDate, inicioTimeline) * px
  return { esquerda, largura: Math.max(duracaoDias, 1) * px }
}

/** Posicao em px de uma data unica — usada pelo marco (F3.4) e pelo marcador "hoje" (F3.3). */
export function posicaoData(inicioTimeline: Date, iso: string, escala: EscalaGantt): number {
  return diasAte(iso, inicioTimeline) * PX_POR_DIA[escala]
}

export function isoDeData(d: Date): string {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export interface TickCabecalho {
  label: string
  esquerda: number
  largura: number
}

const FMT_DIA = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })
const FMT_MES = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })

function rotuloDia(d: Date): string {
  return FMT_DIA.format(d).replace('.', '')
}

/** Ticks do cabecalho — um por dia, semana (segunda a domingo) ou mes, conforme a escala. */
export function gerarTicks(intervalo: IntervaloVisivel, escala: EscalaGantt): TickCabecalho[] {
  const px = PX_POR_DIA[escala]
  const ticks: TickCabecalho[] = []

  if (escala === 'dia') {
    const d = new Date(intervalo.inicio)
    while (d <= intervalo.fim) {
      ticks.push({ label: rotuloDia(d), esquerda: ticks.length * px, largura: px })
      d.setDate(d.getDate() + 1)
    }
    return ticks
  }

  if (escala === 'semana') {
    const d = new Date(intervalo.inicio)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // volta para a segunda-feira da semana
    while (d <= intervalo.fim) {
      const fimSemana = new Date(d)
      fimSemana.setDate(fimSemana.getDate() + 6)
      const esquerda = diasAte(isoDeData(d), intervalo.inicio) * px
      ticks.push({ label: `${rotuloDia(d)} – ${rotuloDia(fimSemana)}`, esquerda, largura: 7 * px })
      d.setDate(d.getDate() + 7)
    }
    return ticks
  }

  const d = new Date(intervalo.inicio.getFullYear(), intervalo.inicio.getMonth(), 1)
  while (d <= intervalo.fim) {
    const diasNoMes = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    const esquerda = diasAte(isoDeData(d), intervalo.inicio) * px
    ticks.push({ label: FMT_MES.format(d), esquerda, largura: diasNoMes * px })
    d.setMonth(d.getMonth() + 1)
  }
  return ticks
}
