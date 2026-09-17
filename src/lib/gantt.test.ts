import { describe, expect, it } from 'vitest'
import { calcularIntervaloVisivel, gerarTicks, posicaoBarra, posicaoData } from './gantt'

describe('calcularIntervaloVisivel', () => {
  it('cobre da tarefa mais cedo à mais tarde, com folga de 3 dias', () => {
    const hoje = new Date(2026, 8, 15)
    const tarefas = [
      { start_date: '2026-09-10', due_date: '2026-09-12' },
      { start_date: '2026-09-20', due_date: '2026-09-25' },
    ]
    const { inicio, fim } = calcularIntervaloVisivel(tarefas, hoje)

    expect(inicio.toDateString()).toBe(new Date(2026, 8, 7).toDateString())
    expect(fim.toDateString()).toBe(new Date(2026, 8, 28).toDateString())
  })

  it('inclui hoje mesmo se nenhuma tarefa cobrir essa data', () => {
    const hoje = new Date(2026, 9, 1)
    const tarefas = [{ start_date: '2026-09-10', due_date: '2026-09-12' }]
    const { fim } = calcularIntervaloVisivel(tarefas, hoje)

    // hoje (1 out) é depois do prazo da tarefa (12 set) — o intervalo se estende pra cobrir hoje.
    expect(fim.getTime()).toBeGreaterThan(new Date(2026, 9, 1).getTime())
  })

  it('tarefas sem data não quebram o cálculo — só hoje define o intervalo', () => {
    const hoje = new Date(2026, 8, 15)
    const { inicio, fim } = calcularIntervaloVisivel([{ start_date: null, due_date: null }], hoje)

    expect(inicio.toDateString()).toBe(new Date(2026, 8, 12).toDateString())
    expect(fim.toDateString()).toBe(new Date(2026, 8, 18).toDateString())
  })
})

describe('posicaoBarra', () => {
  const inicioTimeline = new Date(2026, 8, 1)

  it('tarefa de 1 dia (início == fim) tem largura de 1 dia', () => {
    const { largura } = posicaoBarra(inicioTimeline, '2026-09-05', '2026-09-05', 'dia')
    expect(largura).toBe(40) // PX_POR_DIA.dia
  })

  it('tarefa de 3 dias tem largura de 3 dias — inclusive nas duas pontas', () => {
    const { largura } = posicaoBarra(inicioTimeline, '2026-09-05', '2026-09-07', 'dia')
    expect(largura).toBe(3 * 40)
  })

  it('posiciona a partir da distância em dias até o início do timeline', () => {
    const { esquerda } = posicaoBarra(inicioTimeline, '2026-09-05', '2026-09-07', 'dia')
    expect(esquerda).toBe(4 * 40) // 1 set -> 5 set = 4 dias
  })

  it('a escala muda a largura em px sem mudar a duração em dias', () => {
    const dia = posicaoBarra(inicioTimeline, '2026-09-05', '2026-09-07', 'dia')
    const semana = posicaoBarra(inicioTimeline, '2026-09-05', '2026-09-07', 'semana')
    expect(dia.largura / 40).toBe(semana.largura / 12) // mesma duração em dias
  })
})

describe('posicaoData', () => {
  const inicioTimeline = new Date(2026, 8, 1)

  it('posicaoData usa a mesma régua de posicaoBarra (marco na mesma data que uma barra começa)', () => {
    expect(posicaoData(inicioTimeline, '2026-09-05', 'dia')).toBe(4 * 40)
  })
})

describe('gerarTicks', () => {
  it('escala dia: um tick por dia do intervalo', () => {
    const intervalo = { inicio: new Date(2026, 8, 1), fim: new Date(2026, 8, 3) }
    const ticks = gerarTicks(intervalo, 'dia')
    expect(ticks).toHaveLength(3)
    expect(ticks[0]?.esquerda).toBe(0)
    expect(ticks[1]?.esquerda).toBe(40)
  })

  it('escala semana: ticks começam na segunda-feira e cobrem 7 dias', () => {
    // 2026-09-01 é uma terça. A semana deve comecar em 2026-08-31 (segunda).
    const intervalo = { inicio: new Date(2026, 8, 1), fim: new Date(2026, 8, 8) }
    const ticks = gerarTicks(intervalo, 'semana')
    expect(ticks[0]?.largura).toBe(7 * 12)
    expect(ticks[0]?.esquerda).toBeLessThan(0) // a semana comecou antes do intervalo.inicio
  })

  it('escala mês: um tick por mês, largura proporcional aos dias do mês', () => {
    const intervalo = { inicio: new Date(2026, 8, 25), fim: new Date(2026, 9, 5) }
    const ticks = gerarTicks(intervalo, 'mes')
    expect(ticks).toHaveLength(2)
    expect(ticks[0]?.largura).toBe(30 * 4) // setembro tem 30 dias, PX_POR_DIA.mes = 4
  })
})
