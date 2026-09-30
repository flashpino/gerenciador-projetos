import { describe, expect, it } from 'vitest'
import { avancaStatus, parsePlano, planejar, refDe, slug, statusDeEtapas, validarSpec } from './nucleo.mjs'

const PLANO = `# PWA — Implementation Plan

> **For agentic workers:** usar subagent-driven-development.

**Goal:** app instalável.

## Arquivos

| Arquivo | Ação |
|---|---|
| x | criar |

---

### Task 1: Ícones

**Files:** Create \`scripts/gerar-icones.py\`

- [x] **Step 1: Escrever o script**
- [x] **Step 2: Rodar e conferir**
- [ ] **Step 3: Commitar**

### Task 2: Plugin e manifest

- [ ] **Step 1: Configurar**
- [ ] **Step 2: Build**

### Task 3: Sem etapas

Só texto.

### Nota que não é tarefa

- [x] **Step 1: ignorada**
`

const base = (t = {}) => ({ grupos: [{ nome: 'Fase 1', tarefas: [{ ref: 'T1', titulo: 'Fazer', ...t }] }] })
const planoValido = (tarefas, grupos = [{ nome: 'Fase 1', cor: 'azure', tarefas }]) => validarSpec({ grupos }).spec
const vazio = { grupos: [], tarefas: [] }
const tarefaDb = (extra = {}) => ({
  id: 't-1', group_id: 'g-1', title: 'Fazer', description: null, priority: 'medium', status: 'not_started',
  progress: 0, start_date: null, due_date: null, is_milestone: false, tags: ['ref:T1'], position: 0, subtasks: [], ...extra,
})
const grupoDb = { id: 'g-1', name: 'Fase 1', color: 'azure', position: 0 }

describe('slug', () => {
  it('minúsculo, sem acento, com hífen', () => {
    expect(slug('Configuração Inicial!')).toBe('configuracao-inicial')
    expect(slug('  A  B  ')).toBe('a-b')
  })
})

describe('parsePlano', () => {
  const spec = parsePlano(PLANO, '2026-09-29-pwa.md')

  it('o nome do board vem do título, sem "Implementation Plan"', () => {
    expect(spec.nomeBoard).toBe('PWA')
  })

  it('cada "### Task N:" vira uma tarefa, com ref estável pelo nome do arquivo (sem a data)', () => {
    const tarefas = spec.grupos[0].tarefas
    expect(tarefas.map((t) => t.ref)).toEqual(['pwa#T1', 'pwa#T2', 'pwa#T3'])
    expect(tarefas.map((t) => t.titulo)).toEqual(['Ícones', 'Plugin e manifest', 'Sem etapas'])
  })

  it('headings que não são "Task N:" são ignorados, e seus checkboxes não viram subtarefa', () => {
    expect(spec.grupos[0].tarefas).toHaveLength(3)
    expect(spec.grupos[0].tarefas[2].subtarefas).toEqual([])
  })

  it('as etapas viram subtarefas, sem os asteriscos, com o estado da caixa', () => {
    expect(spec.grupos[0].tarefas[0].subtarefas).toEqual([
      { titulo: 'Step 1: Escrever o script', feita: true },
      { titulo: 'Step 2: Rodar e conferir', feita: true },
      { titulo: 'Step 3: Commitar', feita: false },
    ])
  })

  it('o status sai das caixas: algumas → working, nenhuma → not_started', () => {
    const [t1, t2, t3] = spec.grupos[0].tarefas
    expect([t1.status, t1.progresso]).toEqual(['working', 67])
    expect([t2.status, t2.progresso]).toEqual(['not_started', 0])
    expect([t3.status, t3.progresso]).toEqual(['not_started', 0])
  })

  it('todas as caixas marcadas → done, 100%', () => {
    const s = parsePlano('# X\n### Task 1: A\n- [x] **Step 1: a**\n- [x] **Step 2: b**\n', 'x.md')
    expect([s.grupos[0].tarefas[0].status, s.grupos[0].tarefas[0].progresso]).toEqual(['done', 100])
  })

  it('a descrição leva o texto do bloco da tarefa (arquivos etc.), sem as etapas', () => {
    expect(spec.grupos[0].tarefas[0].descricao).toContain('scripts/gerar-icones.py')
    expect(spec.grupos[0].tarefas[0].descricao).not.toContain('Step 1')
  })

  it('código de exemplo (cerca ```) não vira tarefa nem etapa', () => {
    const md = '# P\n### Task 1: Real\n- [ ] **Step 1: real**\n\n```markdown\n### Task 9: Exemplo\n- [ ] **Step 1: exemplo**\n```\n'
    const s = parsePlano(md, 'p.md')
    expect(s.grupos[0].tarefas.map((t) => t.ref)).toEqual(['p#T1'])
    expect(s.grupos[0].tarefas[0].subtarefas).toHaveLength(1)
  })

  it('sem data no nome do arquivo, o slug do título é o prefixo', () => {
    const s = parsePlano('# Meu Plano Ótimo\n### Task 1: A\n', 'plano.md')
    expect(s.grupos[0].tarefas[0].ref).toBe('plano#T1')
    expect(parsePlano('# Meu Plano Ótimo\n### Task 1: A\n').grupos[0].tarefas[0].ref).toBe('meu-plano-otimo#T1')
  })

  it('markdown sem nenhuma tarefa devolve grupo vazio (a validação acusa depois)', () => {
    expect(parsePlano('# Nada\ntexto\n', 'n.md').grupos[0].tarefas).toEqual([])
  })
})

describe('validarSpec', () => {
  it('aceita o mínimo; campo omitido continua omitido (só vale para criar, nunca sobrescreve o que já existe)', () => {
    const { erros, spec } = validarSpec(base())
    expect(erros).toEqual([])
    const t = spec.grupos[0].tarefas[0]
    expect(t).toMatchObject({ ref: 'T1', titulo: 'Fazer', etiquetas: [], subtarefas: [] })
    for (const campo of ['prioridade', 'status', 'marco', 'inicio', 'prazo', 'descricao']) expect(t[campo]).toBeUndefined()
    expect(spec.grupos[0].cor).toBe('azure')
  })

  it('subtarefas podem ser texto ou objeto', () => {
    const { spec } = validarSpec(base({ subtarefas: ['a', { titulo: 'b', feita: true }] }))
    expect(spec.grupos[0].tarefas[0].subtarefas).toEqual([
      { titulo: 'a', feita: false },
      { titulo: 'b', feita: true },
    ])
  })

  it('aponta TODOS os erros de uma vez, não só o primeiro', () => {
    const { erros } = validarSpec({
      grupos: [{ nome: '', tarefas: [{ ref: 'T 1', titulo: '' }, { ref: 'T2', titulo: 'ok', prioridade: 'urgente' }] }],
    })
    expect(erros.length).toBeGreaterThanOrEqual(3)
  })

  it.each([
    ['sem ref', { ref: undefined }, /ref/],
    ['ref com espaço', { ref: 'T 1' }, /ref/],
    ['título vazio', { titulo: '   ' }, /título/],
    ['título com 201 caracteres', { titulo: 'x'.repeat(201) }, /título/],
    ['prioridade inválida', { prioridade: 'urgente' }, /prioridade/],
    ['status inválido', { status: 'quase' }, /status/],
    ['data inválida', { prazo: '2026-02-30' }, /prazo/],
    ['data em outro formato', { inicio: '30/09/2026' }, /início/],
    ['prazo antes do início', { inicio: '2026-10-10', prazo: '2026-10-01' }, /prazo/],
    ['marco sem data', { marco: true }, /marco/],
    ['etiqueta reservada', { etiquetas: ['ref:X'] }, /etiqueta/],
    ['subtarefa vazia', { subtarefas: [''] }, /subtarefa/],
    ['descrição gigante', { descricao: 'x'.repeat(10001) }, /descrição/],
  ])('rejeita: %s', (_nome, campos, padrao) => {
    const { erros } = validarSpec(base(campos))
    expect(erros.join('\n')).toMatch(padrao)
  })

  it('ref repetido no mesmo plano é erro', () => {
    const { erros } = validarSpec({ grupos: [{ nome: 'G', tarefas: [{ ref: 'T1', titulo: 'a' }, { ref: 'T1', titulo: 'b' }] }] })
    expect(erros.join('\n')).toMatch(/repetido/)
  })

  it('spec sem grupos ou sem tarefas é erro', () => {
    expect(validarSpec({}).erros.length).toBeGreaterThan(0)
    expect(validarSpec({ grupos: [{ nome: 'G', tarefas: [] }] }).erros.join('\n')).toMatch(/nenhuma tarefa/)
  })

  it('marco válido zera o início (é data única)', () => {
    const { erros, spec } = validarSpec(base({ marco: true, prazo: '2026-10-08', inicio: '2026-10-01' }))
    expect(erros).toEqual([])
    expect(spec.grupos[0].tarefas[0].inicio).toBeNull()
  })

  it('cores dos grupos: respeita a informada, alterna nas demais', () => {
    const { spec } = validarSpec({
      grupos: [
        { nome: 'A', cor: 'mint', tarefas: [{ ref: 'a', titulo: 'a' }] },
        { nome: 'B', tarefas: [{ ref: 'b', titulo: 'b' }] },
        { nome: 'C', tarefas: [{ ref: 'c', titulo: 'c' }] },
      ],
    })
    expect(spec.grupos.map((g) => g.cor)).toEqual(['mint', 'grape', 'mint'])
  })

  it('cor inválida é erro', () => {
    expect(validarSpec({ grupos: [{ nome: 'A', cor: 'rosa', tarefas: [{ ref: 'a', titulo: 'a' }] }] }).erros.join('\n')).toMatch(/cor/)
  })
})

describe('statusDeEtapas / avancaStatus / refDe', () => {
  it('etapas → status e progresso', () => {
    expect(statusDeEtapas(0, 0)).toEqual({ status: 'not_started', progresso: 0 })
    expect(statusDeEtapas(0, 4)).toEqual({ status: 'not_started', progresso: 0 })
    expect(statusDeEtapas(1, 4)).toEqual({ status: 'working', progresso: 25 })
    expect(statusDeEtapas(4, 4)).toEqual({ status: 'done', progresso: 100 })
  })

  it('status só avança: not_started < working = stuck < review < done', () => {
    expect(avancaStatus('not_started', 'working')).toBe(true)
    expect(avancaStatus('working', 'done')).toBe(true)
    expect(avancaStatus('stuck', 'review')).toBe(true)
    expect(avancaStatus('done', 'working')).toBe(false)
    expect(avancaStatus('working', 'working')).toBe(false)
    expect(avancaStatus('working', 'stuck')).toBe(false)
    expect(avancaStatus('review', 'not_started')).toBe(false)
  })

  it('refDe acha a tag ref: e ignora as outras', () => {
    expect(refDe(['backend', 'ref:pwa#T1'])).toBe('pwa#T1')
    expect(refDe(['backend'])).toBeNull()
    expect(refDe(null)).toBeNull()
  })
})

describe('planejar (a reimportação nunca duplica nem desfaz)', () => {

  it('board vazio: cria grupo, tarefa (com a tag ref) e subtarefas', () => {
    const p = planejar(planoValido([{ ref: 'T1', titulo: 'Fazer', etiquetas: ['api'], subtarefas: ['a', 'b'] }]), vazio)
    expect(p.gruposNovos).toEqual([{ nome: 'Fase 1', cor: 'azure', position: 0 }])
    expect(p.tarefasNovas).toHaveLength(1)
    expect(p.tarefasNovas[0]).toMatchObject({ grupo: 'Fase 1', titulo: 'Fazer', tags: ['ref:T1', 'api'], status: 'not_started', position: 0 })
    expect(p.tarefasNovas[0].subtarefas).toEqual([{ titulo: 'a', feita: false, position: 0 }, { titulo: 'b', feita: false, position: 1 }])
  })

  it('grupo que já existe (mesmo nome, sem diferenciar caixa) não é recriado', () => {
    const p = planejar(planoValido([{ ref: 'T1', titulo: 'Fazer' }], [{ nome: '  fase 1 ', tarefas: [{ ref: 'T1', titulo: 'Fazer' }] }]), { grupos: [grupoDb], tarefas: [] })
    expect(p.gruposNovos).toEqual([])
    expect(p.tarefasNovas[0].grupo).toBe('Fase 1')
  })

  it('a posição da tarefa nova continua depois da última do grupo', () => {
    const p = planejar(planoValido([{ ref: 'T2', titulo: 'Outra' }]), { grupos: [grupoDb], tarefas: [tarefaDb({ position: 4 })] })
    expect(p.tarefasNovas[0].position).toBe(5)
  })

  it('tarefa já importada (mesmo ref) não é duplicada; sem mudança = igual', () => {
    const p = planejar(planoValido([{ ref: 'T1', titulo: 'Fazer' }]), { grupos: [grupoDb], tarefas: [tarefaDb()] })
    expect(p.tarefasNovas).toEqual([])
    expect(p.tarefasAtualizadas).toEqual([])
    expect(p.iguais).toBe(1)
  })

  it('mudou o título ou a prioridade no plano: atualiza só o que mudou', () => {
    const p = planejar(planoValido([{ ref: 'T1', titulo: 'Fazer melhor', prioridade: 'high' }]), { grupos: [grupoDb], tarefas: [tarefaDb()] })
    expect(p.tarefasAtualizadas).toEqual([{ id: 't-1', ref: 'T1', campos: { title: 'Fazer melhor', priority: 'high' } }])
  })

  it('status avança: working → done põe progresso 100', () => {
    const p = planejar(planoValido([{ ref: 'T1', titulo: 'Fazer', status: 'done' }]), { grupos: [grupoDb], tarefas: [tarefaDb({ status: 'working' })] })
    expect(p.tarefasAtualizadas[0].campos).toEqual({ status: 'done', progress: 100 })
  })

  it('status NUNCA recua: o plano diz working mas a tarefa já está done', () => {
    const p = planejar(planoValido([{ ref: 'T1', titulo: 'Fazer', status: 'working' }]), { grupos: [grupoDb], tarefas: [tarefaDb({ status: 'done', progress: 100 })] })
    expect(p.tarefasAtualizadas).toEqual([])
    expect(p.iguais).toBe(1)
  })

  it('spec sem status não mexe no status existente', () => {
    const p = planejar(planoValido([{ ref: 'T1', titulo: 'Fazer' }]), { grupos: [grupoDb], tarefas: [tarefaDb({ status: 'review' })] })
    expect(p.tarefasAtualizadas).toEqual([])
  })

  it('progresso derivado só sobe', () => {
    const avanca = planejar(planoValido([{ ref: 'T1', titulo: 'Fazer', status: 'working', progresso: 60 }]), { grupos: [grupoDb], tarefas: [tarefaDb({ status: 'working', progress: 30 })] })
    expect(avanca.tarefasAtualizadas[0].campos).toEqual({ progress: 60 })
    const recua = planejar(planoValido([{ ref: 'T1', titulo: 'Fazer', status: 'working', progresso: 20 }]), { grupos: [grupoDb], tarefas: [tarefaDb({ status: 'working', progress: 30 })] })
    expect(recua.tarefasAtualizadas).toEqual([])
  })

  it('a tarefa nunca muda de grupo por reimportação', () => {
    const outro = { id: 'g-2', name: 'Outra fase', color: 'mint', position: 1 }
    const p = planejar(planoValido([{ ref: 'T1', titulo: 'Fazer' }]), { grupos: [grupoDb, outro], tarefas: [tarefaDb({ group_id: 'g-2' })] })
    expect(p.tarefasAtualizadas).toEqual([])
  })

  it('subtarefa nova é criada; a existente só vai de "não feita" para "feita"', () => {
    const existente = tarefaDb({ subtasks: [{ id: 's-1', title: 'a', done: false, position: 0 }, { id: 's-2', title: 'b', done: true, position: 1 }] })
    const p = planejar(planoValido([{ ref: 'T1', titulo: 'Fazer', subtarefas: [{ titulo: 'a', feita: true }, { titulo: 'b', feita: false }, 'c'] }]), { grupos: [grupoDb], tarefas: [existente] })
    expect(p.subtarefasMarcadas).toEqual([{ id: 's-1', tarefaRef: 'T1', titulo: 'a' }])
    expect(p.subtarefasNovas).toEqual([{ taskId: 't-1', tarefaRef: 'T1', titulo: 'c', feita: false, position: 2 }])
  })

  it('tarefa com o mesmo título mas sem a tag ref NÃO é confundida (é outra coisa)', () => {
    const solta = tarefaDb({ tags: [] })
    const p = planejar(planoValido([{ ref: 'T1', titulo: 'Fazer' }]), { grupos: [grupoDb], tarefas: [solta] })
    expect(p.tarefasNovas).toHaveLength(1)
  })

  it('o resumo conta o que vai acontecer', () => {
    const p = planejar(planoValido([{ ref: 'T1', titulo: 'Fazer' }, { ref: 'T2', titulo: 'Nova' }]), { grupos: [grupoDb], tarefas: [tarefaDb()] })
    expect(p.resumo).toEqual({ gruposNovos: 0, tarefasNovas: 1, tarefasAtualizadas: 0, subtarefasNovas: 0, subtarefasMarcadas: 0, iguais: 1 })
  })
})
