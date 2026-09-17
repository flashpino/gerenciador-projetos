import type { TaskStatus } from '@/types/domain'

/**
 * Converte "YYYY-MM-DD" (tipo `date` do Postgres) em Date na meia-noite LOCAL.
 *
 * `new Date('2026-09-15')` cria meia-noite UTC. Em UTC-3 isso vira 14/09 as 21h,
 * e toda data do app aparece um dia antes. Este e o bug de fuso classico de app
 * que le `date` do Postgres — por isso a conversao e explicita e testada.
 */
export function parseDataSimples(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const [ano, mes, dia] = iso.split('-').map(Number)
  if (!ano || !mes || !dia) return null
  return new Date(ano, mes - 1, dia)
}

/** Meia-noite local da data informada — descarta a hora. */
function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Dias inteiros entre hoje e o prazo. Negativo = vencido.
 *
 * Conta por calendario, nao dividindo milissegundos por 86400000: dia de mudanca
 * de horario de verao tem 23 ou 25 horas e a divisao erra por um.
 */
export function diasAte(prazo: string | null | undefined, hoje = new Date()): number {
  const alvo = parseDataSimples(prazo)
  if (!alvo) return Number.NaN
  const a = inicioDoDia(hoje)
  const b = inicioDoDia(alvo)
  // Normaliza para meio-dia antes de subtrair: imune a offset de fuso.
  const MEIO_DIA = 12 * 60 * 60 * 1000
  const ms = (b.getTime() + MEIO_DIA) - (a.getTime() + MEIO_DIA)
  return Math.round(ms / 86_400_000)
}

/**
 * Atrasada = prazo ja passou E nao foi concluida.
 * Tarefa concluida nunca e atrasada, mesmo entregue fora do prazo.
 */
export function estaAtrasada(
  prazo: string | null | undefined,
  status: TaskStatus,
  hoje = new Date(),
): boolean {
  if (!prazo || status === 'done') return false
  return diasAte(prazo, hoje) < 0
}

const FMT = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })

/**
 * "15 set" — dia e mes, sem o "de" e sem o ponto que o pt-BR insere
 * ("15 de set."). Monta a partir das partes em vez de recortar a string:
 * recorte quebra quando a versao do ICU muda o formato.
 */
function diaMes(d: Date): string {
  const partes = FMT.formatToParts(d)
  const dia = partes.find((p) => p.type === 'day')?.value ?? ''
  const mes = (partes.find((p) => p.type === 'month')?.value ?? '').replace(/\.$/, '')
  return `${dia} ${mes}`
}

/**
 * "15 – 28 set" no mesmo mes, "28 set – 5 out" quando cruza.
 * Sem periodo devolve "Sem prazo" — a tarefa nunca some da tela (criterio F3.5).
 */
const RTF = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

/**
 * "há 20 minutos", "há 1 hora", "anteontem" — usa Intl.RelativeTimeFormat
 * nativo, sem lib de datas. `iso` e timestamptz (com timezone embutido),
 * diferente do `date` puro de parseDataSimples: `new Date()` aqui e seguro.
 */
export function tempoRelativo(iso: string, agora = new Date()): string {
  const diffMin = Math.round((new Date(iso).getTime() - agora.getTime()) / 60_000)
  if (diffMin === 0) return 'agora mesmo'
  if (Math.abs(diffMin) < 60) return RTF.format(diffMin, 'minute')

  const diffHoras = Math.round(diffMin / 60)
  if (Math.abs(diffHoras) < 24) return RTF.format(diffHoras, 'hour')

  const diffDias = Math.round(diffHoras / 24)
  return RTF.format(diffDias, 'day')
}

export function formatarIntervalo(
  inicio: string | null | undefined,
  fim: string | null | undefined,
): string {
  const i = parseDataSimples(inicio)
  const f = parseDataSimples(fim)

  if (!i && !f) return 'Sem prazo'
  if (!i && f) return diaMes(f)
  if (i && !f) return diaMes(i)
  if (!i || !f) return 'Sem prazo'

  const mesmoMes = i.getMonth() === f.getMonth() && i.getFullYear() === f.getFullYear()
  const diaDe = (d: Date) =>
    FMT.formatToParts(d).find((p) => p.type === 'day')?.value ?? ''

  return mesmoMes ? `${diaDe(i)} – ${diaMes(f)}` : `${diaMes(i)} – ${diaMes(f)}`
}
