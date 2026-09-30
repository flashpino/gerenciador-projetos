import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ehComando, ErroUso, executar, parseArgs } from './comandos.mjs'
import { refDe } from './nucleo.mjs'

/** API em memória com o mesmo contrato de api.mjs: deixa provar idempotência sem banco. */
function criarApiFalsa({ workspaces, boards = [] } = {}) {
  let seq = 0
  const id = (p) => `${p}-${++seq}`
  const db = { boards: [...boards], grupos: [], tarefas: [], subtarefas: [], comentarios: [] }
  const chamadas = []
  const reg = (nome, fn) => (...a) => { chamadas.push(nome); return fn(...a) }
  const nova = (prefixo, lista, l) => { const linha = Object.assign({ id: id(prefixo) }, l); lista.push(linha); return linha }

  return {
    db,
    chamadas,
    usuarioId: 'u-bot',
    perfil: async () => ({ id: 'u-bot', full_name: 'Claude (bot)' }),
    workspaces: async () => workspaces ?? [{ id: 'w-1', name: 'Meu Workspace', owner_id: 'u-dono', dono: { full_name: 'Ana' } }],
    boards: async () => db.boards,
    estadoDoBoard: async (boardId) => ({
      grupos: db.grupos.filter((g) => g.board_id === boardId),
      tarefas: db.tarefas
        .filter((t) => t.board_id === boardId)
        .map((t) => Object.assign({}, t, { subtasks: db.subtarefas.filter((s) => s.task_id === t.id) })),
    }),
    criarBoard: reg('criarBoard', async (workspace_id, name) => {
      const b = { id: id('b'), name, workspace_id, created_at: '' }
      db.boards.push(b)
      return b
    }),
    inserirGrupos: reg('inserirGrupos', async (linhas) => linhas.map((l) => nova('g', db.grupos, l))),
    inserirTarefas: reg('inserirTarefas', async (linhas) => linhas.map((l) => nova('t', db.tarefas, l))),
    inserirSubtarefas: reg('inserirSubtarefas', async (linhas) => linhas.map((l) => nova('s', db.subtarefas, l))),
    atualizarTarefa: reg('atualizarTarefa', async (tid, campos) => Object.assign(db.tarefas.find((t) => t.id === tid), campos)),
    marcarSubtarefa: reg('marcarSubtarefa', async (sid) => Object.assign(db.subtarefas.find((s) => s.id === sid), { done: true })),
    comentar: reg('comentar', async (task_id, body) => { db.comentarios.push({ task_id, body }); return { id: id('c') } }),
  }
}

const PLANO_V1 = `# Sistema Novo — Implementation Plan

### Task 1: Modelar dados

- [ ] **Step 1: Escrever tabelas**
- [ ] **Step 2: Testar RLS**

### Task 2: Criar telas

- [ ] **Step 1: Tabela**
`
const PLANO_V2 = PLANO_V1.replace('- [ ] **Step 1: Escrever tabelas**', '- [x] **Step 1: Escrever tabelas**').replace('- [ ] **Step 2: Testar RLS**', '- [x] **Step 2: Testar RLS**')

const tarefaA = (api) => api.db.tarefas.find((t) => refDe(t.tags) === 'A')

let saida
let vinculo
let arquivos
const ctxDe = (api) => ({
  api,
  saida: (l) => saida.push(l),
  lerArquivo: (caminho) => {
    if (!(caminho in arquivos)) throw new Error(`arquivo não existe: ${caminho}`)
    return arquivos[caminho]
  },
  vinculo,
  gravarVinculo: vi.fn((v) => { vinculo = v }),
})
const texto = () => saida.join('\n')

beforeEach(() => {
  saida = []
  vinculo = null
  arquivos = { '2026-09-30-sistema-novo.md': PLANO_V1, 'plano.json': JSON.stringify({ grupos: [{ nome: 'G', tarefas: [{ ref: 'A', titulo: 'Tarefa A', subtarefas: ['x'] }] }] }) }
})

describe('parseArgs', () => {
  it('comando, posicionais e flags (--k v, --k=v, booleanas)', () => {
    expect(parseArgs(['importar', 'p.md', '--board', 'Sprint Alpha', '--dry-run', '--criar=Novo'])).toEqual({
      comando: 'importar',
      posicionais: ['p.md'],
      flags: { board: 'Sprint Alpha', 'dry-run': true, criar: 'Novo' },
    })
  })

  it('texto solto depois do alvo fica como posicional (comentários)', () => {
    expect(parseArgs(['comentar', 'T1', 'feito', 'com', 'sucesso']).posicionais).toEqual(['T1', 'feito', 'com', 'sucesso'])
  })

  it('sem nada, o comando é "ajuda"', () => {
    expect(parseArgs([]).comando).toBe('ajuda')
  })
})

describe('importar — projeto novo', () => {
  it('--criar cria o board, os grupos, as tarefas com ref e as subtarefas, e vincula o projeto', async () => {
    const api = criarApiFalsa()
    await executar('importar', { posicionais: ['2026-09-30-sistema-novo.md'], flags: { criar: 'Sistema Novo' } }, ctxDe(api))

    expect(api.db.boards.map((b) => b.name)).toEqual(['Sistema Novo'])
    expect(api.db.grupos.map((g) => g.name)).toEqual(['Sistema Novo'])
    expect(api.db.tarefas.map((t) => [refDe(t.tags), t.title, t.status])).toEqual([
      ['sistema-novo#T1', 'Modelar dados', 'not_started'],
      ['sistema-novo#T2', 'Criar telas', 'not_started'],
    ])
    expect(api.db.subtarefas).toHaveLength(3)
    expect(vinculo).toMatchObject({ nome: 'Sistema Novo', workspace: 'w-1' })
    expect(texto()).toContain('sistema-novo#T1')
  })

  it('sem board e sem --criar, explica as duas saídas em vez de escolher sozinho', async () => {
    await expect(executar('importar', { posicionais: ['plano.json'], flags: {} }, ctxDe(criarApiFalsa()))).rejects.toThrow(/--criar|vincular/)
  })

  it('dry-run não grava nem cria board, e diz o que faria', async () => {
    const api = criarApiFalsa()
    await executar('importar', { posicionais: ['plano.json'], flags: { criar: 'X', 'dry-run': true } }, ctxDe(api))
    expect(api.chamadas).toEqual([])
    expect(texto()).toMatch(/dry-run|simula/i)
    expect(texto()).toContain('A')
  })

  it('spec inválido lista TODOS os erros e não toca o banco', async () => {
    arquivos['ruim.json'] = JSON.stringify({ grupos: [{ nome: '', tarefas: [{ ref: 'a b', titulo: '' }] }] })
    const api = criarApiFalsa()
    const erro = await executar('importar', { posicionais: ['ruim.json'], flags: { criar: 'X' } }, ctxDe(api)).catch((e) => e)
    expect(erro).toBeInstanceOf(ErroUso)
    expect(erro.message.split('\n').length).toBeGreaterThan(2)
    expect(api.chamadas).toEqual([])
  })

  it('arquivo que não é JSON nem markdown de plano dá erro claro', async () => {
    arquivos['lixo.json'] = '{ isso não é json'
    await expect(executar('importar', { posicionais: ['lixo.json'], flags: { criar: 'X' } }, ctxDe(criarApiFalsa()))).rejects.toThrow(/JSON/)
  })
})

describe('importar — idempotência e sincronização (projeto existente)', () => {
  it('rodar duas vezes o mesmo plano não cria nada de novo', async () => {
    const api = criarApiFalsa()
    await executar('importar', { posicionais: ['2026-09-30-sistema-novo.md'], flags: { criar: 'Sistema Novo' } }, ctxDe(api))
    const antes = { t: api.db.tarefas.length, s: api.db.subtarefas.length, g: api.db.grupos.length }
    saida = []

    await executar('importar', { posicionais: ['2026-09-30-sistema-novo.md'], flags: {} }, ctxDe(api))
    expect({ t: api.db.tarefas.length, s: api.db.subtarefas.length, g: api.db.grupos.length }).toEqual(antes)
    expect(texto()).toMatch(/nada a fazer|sem mudança/i)
  })

  it('marcar as caixas no plano e reimportar avança o status e marca as subtarefas', async () => {
    const api = criarApiFalsa()
    await executar('importar', { posicionais: ['2026-09-30-sistema-novo.md'], flags: { criar: 'Sistema Novo' } }, ctxDe(api))
    arquivos['2026-09-30-sistema-novo.md'] = PLANO_V2

    await executar('importar', { posicionais: ['2026-09-30-sistema-novo.md'], flags: {} }, ctxDe(api))

    const t1 = api.db.tarefas.find((t) => refDe(t.tags) === 'sistema-novo#T1')
    expect([t1.status, t1.progress]).toEqual(['done', 100])
    expect(api.db.subtarefas.filter((s) => s.task_id === t1.id).every((s) => s.done)).toBe(true)
    expect(api.db.tarefas.find((t) => refDe(t.tags) === 'sistema-novo#T2').status).toBe('not_started')
  })

  it('reimportar um plano ANTIGO (caixas desmarcadas) não desfaz o que já foi concluído', async () => {
    const api = criarApiFalsa()
    arquivos['2026-09-30-sistema-novo.md'] = PLANO_V2
    await executar('importar', { posicionais: ['2026-09-30-sistema-novo.md'], flags: { criar: 'Sistema Novo' } }, ctxDe(api))
    arquivos['2026-09-30-sistema-novo.md'] = PLANO_V1

    await executar('importar', { posicionais: ['2026-09-30-sistema-novo.md'], flags: {} }, ctxDe(api))
    expect(api.db.tarefas.find((t) => refDe(t.tags) === 'sistema-novo#T1').status).toBe('done')
  })

  it('projeto já existente: --board por nome importa nele, sem criar board', async () => {
    const api = criarApiFalsa({ boards: [{ id: 'b-9', name: 'Legado', workspace_id: 'w-1', created_at: '' }] })
    await executar('importar', { posicionais: ['plano.json'], flags: { board: 'legado' } }, ctxDe(api))
    expect(api.chamadas).not.toContain('criarBoard')
    expect(api.db.tarefas[0].board_id).toBe('b-9')
  })

  it('o vínculo do projeto vale quando não há --board', async () => {
    const api = criarApiFalsa({ boards: [{ id: 'b-9', name: 'Legado', workspace_id: 'w-1', created_at: '' }] })
    vinculo = { board: 'b-9', nome: 'Legado', workspace: 'w-1' }
    await executar('importar', { posicionais: ['plano.json'], flags: {} }, ctxDe(api))
    expect(api.db.tarefas[0].board_id).toBe('b-9')
  })
})

describe('resolução de board e workspace', () => {
  const dois = [
    { id: 'w-1', name: 'Meu Workspace', owner_id: 'u-bot', dono: { full_name: 'Claude (bot)' } },
    { id: 'w-2', name: 'Meu Workspace', owner_id: 'u-ana', dono: { full_name: 'Ana' } },
  ]

  it('com mais de um workspace e sem --workspace, lista as opções com o dono (nomes iguais!)', async () => {
    const erro = await executar('importar', { posicionais: ['plano.json'], flags: { criar: 'X' } }, ctxDe(criarApiFalsa({ workspaces: dois }))).catch((e) => e)
    expect(erro).toBeInstanceOf(ErroUso)
    expect(erro.message).toContain('w-1')
    expect(erro.message).toContain('w-2')
    expect(erro.message).toContain('Ana')
  })

  it('--workspace por id resolve mesmo com nomes iguais', async () => {
    const api = criarApiFalsa({ workspaces: dois })
    await executar('importar', { posicionais: ['plano.json'], flags: { criar: 'X', workspace: 'w-2' } }, ctxDe(api))
    expect(api.db.boards[0].workspace_id).toBe('w-2')
  })

  it('--workspace por nome ambíguo é erro que pede o id', async () => {
    await expect(executar('importar', { posicionais: ['plano.json'], flags: { criar: 'X', workspace: 'Meu Workspace' } }, ctxDe(criarApiFalsa({ workspaces: dois })))).rejects.toThrow(/ambíguo|id/i)
  })

  it('board com nome repetido em workspaces diferentes pede o id', async () => {
    const api = criarApiFalsa({ boards: [{ id: 'b-1', name: 'Sprint', workspace_id: 'w-1' }, { id: 'b-2', name: 'Sprint', workspace_id: 'w-2' }] })
    const erro = await executar('vincular', { posicionais: [], flags: { board: 'Sprint' } }, ctxDe(api)).catch((e) => e)
    expect(erro.message).toContain('b-1')
    expect(erro.message).toContain('b-2')
  })

  it('board inexistente lista os que existem', async () => {
    const api = criarApiFalsa({ boards: [{ id: 'b-1', name: 'Sprint', workspace_id: 'w-1' }] })
    const erro = await executar('vincular', { posicionais: [], flags: { board: 'Nada' } }, ctxDe(api)).catch((e) => e)
    expect(erro.message).toContain('Sprint')
  })
})

describe('status, aliases e comentários', () => {
  async function comTarefa() {
    const api = criarApiFalsa()
    await executar('importar', { posicionais: ['plano.json'], flags: { criar: 'X' } }, ctxDe(api))
    saida = []
    return api
  }

  it('status pelo ref', async () => {
    const api = await comTarefa()
    await executar('status', { posicionais: ['A', 'working'], flags: {} }, ctxDe(api))
    expect(tarefaA(api).status).toBe('working')
    expect(texto()).toContain('not_started')
  })

  it('concluir põe status done e progresso 100', async () => {
    const api = await comTarefa()
    await executar('concluir', { posicionais: ['A'], flags: {} }, ctxDe(api))
    expect([tarefaA(api).status, tarefaA(api).progress]).toEqual(['done', 100])
  })

  it('iniciar = working; revisar = review', async () => {
    const api = await comTarefa()
    await executar('iniciar', { posicionais: ['A'], flags: {} }, ctxDe(api))
    expect(tarefaA(api).status).toBe('working')
    await executar('revisar', { posicionais: ['A'], flags: {} }, ctxDe(api))
    expect(tarefaA(api).status).toBe('review')
  })

  it('--comentario registra o porquê', async () => {
    const api = await comTarefa()
    await executar('concluir', { posicionais: ['A'], flags: { comentario: 'commit abc123' } }, ctxDe(api))
    expect(api.db.comentarios).toEqual([{ task_id: tarefaA(api).id, body: 'commit abc123' }])
  })

  it('travar EXIGE o motivo (bloqueio sem explicação não ajuda ninguém)', async () => {
    const api = await comTarefa()
    await expect(executar('travar', { posicionais: ['A'], flags: {} }, ctxDe(api))).rejects.toThrow(/motivo/i)
    await executar('travar', { posicionais: ['A'], flags: { comentario: 'sem acesso ao banco' } }, ctxDe(api))
    expect(tarefaA(api).status).toBe('stuck')
    expect(api.db.comentarios[0].body).toBe('sem acesso ao banco')
  })

  it('--progresso explícito vale', async () => {
    const api = await comTarefa()
    await executar('status', { posicionais: ['A', 'working'], flags: { progresso: '40' } }, ctxDe(api))
    expect(tarefaA(api).progress).toBe(40)
  })

  it('status inválido e progresso inválido são erro de uso, sem tocar a tarefa', async () => {
    const api = await comTarefa()
    await expect(executar('status', { posicionais: ['A', 'quase'], flags: {} }, ctxDe(api))).rejects.toThrow(/status/)
    await expect(executar('status', { posicionais: ['A', 'working'], flags: { progresso: '150' } }, ctxDe(api))).rejects.toThrow(/progresso/)
    expect(tarefaA(api).status).toBe('not_started')
  })

  it('tarefa por título exato, e ref desconhecido lista os refs existentes', async () => {
    const api = await comTarefa()
    await executar('concluir', { posicionais: ['Tarefa A'], flags: {} }, ctxDe(api))
    expect(tarefaA(api).status).toBe('done')
    const erro = await executar('concluir', { posicionais: ['ZZZ'], flags: {} }, ctxDe(api)).catch((e) => e)
    expect(erro).toBeInstanceOf(ErroUso)
    expect(erro.message).toContain('A')
  })

  it('comentar registra o texto inteiro', async () => {
    const api = await comTarefa()
    await executar('comentar', { posicionais: ['A', 'feito', 'com', 'testes'], flags: {} }, ctxDe(api))
    expect(api.db.comentarios[0].body).toBe('feito com testes')
  })

  it('comentar sem texto é erro', async () => {
    const api = await comTarefa()
    await expect(executar('comentar', { posicionais: ['A'], flags: {} }, ctxDe(api))).rejects.toThrow(/texto/i)
  })

  it('status sem board vinculado explica como vincular', async () => {
    await expect(executar('status', { posicionais: ['A', 'done'], flags: {} }, ctxDe(criarApiFalsa()))).rejects.toThrow(/vincular|--board/)
  })
})

describe('leitura: eu, boards, tarefas', () => {
  it('eu mostra quem entrou, os workspaces (com dono) e os boards', async () => {
    const api = criarApiFalsa({ boards: [{ id: 'b-1', name: 'Sprint', workspace_id: 'w-1' }] })
    await executar('eu', { posicionais: [], flags: {} }, ctxDe(api))
    expect(texto()).toContain('Claude (bot)')
    expect(texto()).toContain('Ana')
    expect(texto()).toContain('Sprint')
  })

  it('tarefas lista ref, status e título; --status filtra; --json é parseável', async () => {
    const api = criarApiFalsa()
    await executar('importar', { posicionais: ['2026-09-30-sistema-novo.md'], flags: { criar: 'Sistema Novo' } }, ctxDe(api))
    await executar('concluir', { posicionais: ['sistema-novo#T1'], flags: {} }, ctxDe(api))

    saida = []
    await executar('tarefas', { posicionais: [], flags: { status: 'done' } }, ctxDe(api))
    expect(texto()).toContain('sistema-novo#T1')
    expect(texto()).not.toContain('sistema-novo#T2')

    saida = []
    await executar('tarefas', { posicionais: [], flags: { json: true } }, ctxDe(api))
    const lista = JSON.parse(saida.join('\n'))
    expect(lista.map((t) => t.ref)).toEqual(['sistema-novo#T1', 'sistema-novo#T2'])
    expect(lista[0]).toMatchObject({ status: 'done', progresso: 100, titulo: 'Modelar dados' })
  })

  it('ehComando reconhece os comandos, os apelidos de status e a ajuda; rejeita o resto', () => {
    for (const c of ['importar', 'vincular', 'eu', 'boards', 'tarefas', 'comentar', 'status', 'concluir', 'iniciar', 'revisar', 'travar', 'ajuda']) expect(ehComando(c)).toBe(true)
    for (const c of ['xyz', 'toString', 'constructor', '']) expect(ehComando(c)).toBe(false)
  })

  it('comando desconhecido é erro de uso', async () => {
    await expect(executar('xyz', { posicionais: [], flags: {} }, ctxDe(criarApiFalsa()))).rejects.toThrow(/comando/i)
  })
})
