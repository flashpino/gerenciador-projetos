import { describe, expect, it } from 'vitest'
import { diasAte, estaAtrasada, formatarIntervalo, parseDataSimples, tempoRelativo } from './date'

describe('parseDataSimples', () => {
  it('interpreta YYYY-MM-DD como meia-noite LOCAL, nao UTC', () => {
    // O Postgres devolve `date` como "2026-09-15". new Date("2026-09-15") cria
    // meia-noite UTC, que em UTC-3 vira dia 14 as 21h — a tarefa aparece um dia
    // antes do que e. Este teste existe por causa desse bug.
    const d = parseDataSimples('2026-09-15')
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(8)
    expect(d?.getDate()).toBe(15)
  })

  it('devolve null para entrada nula ou vazia', () => {
    expect(parseDataSimples(null)).toBeNull()
    expect(parseDataSimples('')).toBeNull()
  })
})

describe('estaAtrasada', () => {
  const hoje = new Date(2026, 8, 15)

  it('e atrasada quando o prazo passou e nao esta concluida', () => {
    expect(estaAtrasada('2026-09-14', 'working', hoje)).toBe(true)
  })

  it('NAO e atrasada quando esta concluida, mesmo com prazo vencido', () => {
    expect(estaAtrasada('2026-09-01', 'done', hoje)).toBe(false)
  })

  it('NAO e atrasada quando o prazo e hoje', () => {
    expect(estaAtrasada('2026-09-15', 'working', hoje)).toBe(false)
  })

  it('NAO e atrasada sem prazo definido', () => {
    expect(estaAtrasada(null, 'working', hoje)).toBe(false)
  })
})

describe('diasAte', () => {
  const hoje = new Date(2026, 8, 15)

  it('conta dias inteiros ate o prazo', () => {
    expect(diasAte('2026-09-18', hoje)).toBe(3)
  })

  it('devolve negativo para prazo vencido', () => {
    expect(diasAte('2026-09-13', hoje)).toBe(-2)
  })

  it('atravessa o horario de verao sem erro de arredondamento', () => {
    // Somar 24h em ms erra quando o dia tem 23 ou 25 horas. Contar por data local nao.
    expect(diasAte('2026-11-20', new Date(2026, 9, 20))).toBe(31)
  })
})

describe('formatarIntervalo', () => {
  it('formata inicio e fim no mesmo mes sem repetir o mes', () => {
    expect(formatarIntervalo('2026-09-15', '2026-09-28')).toBe('15 – 28 set')
  })

  it('repete o mes quando o intervalo cruza meses', () => {
    expect(formatarIntervalo('2026-09-28', '2026-10-05')).toBe('28 set – 5 out')
  })

  it('mostra so uma data quando nao ha inicio', () => {
    expect(formatarIntervalo(null, '2026-10-05')).toBe('5 out')
  })

  it('devolve texto explicito quando nao ha periodo — a tarefa nao some', () => {
    expect(formatarIntervalo(null, null)).toBe('Sem prazo')
  })
})

describe('tempoRelativo', () => {
  const agora = new Date(2026, 8, 15, 12, 0, 0)

  it('minutos atras', () => {
    expect(tempoRelativo(new Date(2026, 8, 15, 11, 40, 0).toISOString(), agora)).toBe('há 20 minutos')
  })

  it('horas atras', () => {
    expect(tempoRelativo(new Date(2026, 8, 15, 11, 0, 0).toISOString(), agora)).toBe('há 1 hora')
  })

  it('dias atras', () => {
    expect(tempoRelativo(new Date(2026, 8, 13, 12, 0, 0).toISOString(), agora)).toBe('anteontem')
  })

  it('agora mesmo', () => {
    expect(tempoRelativo(agora.toISOString(), agora)).toBe('agora mesmo')
  })
})
