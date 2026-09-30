import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarApi, ErroApi } from './api.mjs'

const URL_BASE = 'https://exemplo.supabase.co'
const CHAVE = 'sb_publishable_publica'

const resposta = (status, corpo) => ({ ok: status >= 200 && status < 300, status, json: async () => corpo, text: async () => JSON.stringify(corpo) })

let chamadas
let fila
const fetchFalso = vi.fn(async (url, init) => {
  chamadas.push({ url: String(url), init })
  const proxima = fila.shift()
  if (!proxima) throw new Error(`fetch inesperado: ${url}`)
  return proxima
})

const novaApi = () => criarApi({ url: `${URL_BASE}/`, chave: CHAVE, fetchImpl: fetchFalso })
const login = { access_token: 'TOKEN-SECRETO', user: { id: 'u-bot' } }

beforeEach(() => {
  chamadas = []
  fila = []
  fetchFalso.mockClear()
})

describe('entrar', () => {
  it('faz o login por senha com a chave pública e guarda o token', async () => {
    fila.push(resposta(200, login))
    const api = novaApi()
    await api.entrar('bot@x.com', 'senha-do-bot')

    expect(chamadas[0].url).toBe(`${URL_BASE}/auth/v1/token?grant_type=password`)
    expect(chamadas[0].init.method).toBe('POST')
    expect(chamadas[0].init.headers.apikey).toBe(CHAVE)
    expect(JSON.parse(chamadas[0].init.body)).toEqual({ email: 'bot@x.com', password: 'senha-do-bot' })
    expect(api.usuarioId).toBe('u-bot')
  })

  it('login recusado dá uma mensagem genérica que NÃO repete e-mail nem senha', async () => {
    fila.push(resposta(400, { error_description: 'Invalid login credentials' }))
    const erro = await novaApi().entrar('bot@x.com', 'senha-do-bot').catch((e) => e)
    expect(erro).toBeInstanceOf(ErroApi)
    expect(erro.message).toMatch(/login recusado/i)
    expect(erro.message).not.toContain('senha-do-bot')
    expect(erro.message).not.toContain('bot@x.com')
  })
})

describe('requisições autenticadas', () => {
  async function logada() {
    fila.push(resposta(200, login))
    const api = novaApi()
    await api.entrar('b@x.com', 's')
    chamadas.length = 0
    return api
  }

  it('mandam a chave e o token do usuário (não a chave como token)', async () => {
    const api = await logada()
    fila.push(resposta(200, []))
    await api.boards()
    expect(chamadas[0].init.headers.apikey).toBe(CHAVE)
    expect(chamadas[0].init.headers.Authorization).toBe('Bearer TOKEN-SECRETO')
  })

  it('a URL base perde a barra final', async () => {
    const api = await logada()
    fila.push(resposta(200, []))
    await api.boards()
    expect(chamadas[0].url.startsWith(`${URL_BASE}/rest/v1/boards?`)).toBe(true)
  })

  it('estadoDoBoard busca grupos e tarefas com subtarefas, só daquele board', async () => {
    const api = await logada()
    fila.push(resposta(200, [{ id: 'g1', name: 'Fase 1', color: 'azure', position: 0 }]))
    fila.push(resposta(200, [{ id: 't1', tags: ['ref:T1'], subtasks: [] }]))
    const estado = await api.estadoDoBoard('b-1')

    expect(chamadas[0].url).toContain('/rest/v1/groups?')
    expect(chamadas[0].url).toContain('board_id=eq.b-1')
    expect(chamadas[1].url).toContain('/rest/v1/tasks?')
    expect(chamadas[1].url).toContain('board_id=eq.b-1')
    expect(decodeURIComponent(chamadas[1].url)).toContain('subtasks(')
    expect(estado.grupos).toHaveLength(1)
    expect(estado.tarefas[0].id).toBe('t1')
  })

  it('inserir manda o corpo em JSON e pede o registro de volta', async () => {
    const api = await logada()
    fila.push(resposta(201, [{ id: 'g-novo', name: 'Fase 1' }]))
    const linhas = await api.inserirGrupos([{ board_id: 'b-1', name: 'Fase 1', color: 'azure', position: 0 }])
    expect(chamadas[0].init.method).toBe('POST')
    expect(chamadas[0].init.headers.Prefer).toBe('return=representation')
    expect(JSON.parse(chamadas[0].init.body)).toEqual([{ board_id: 'b-1', name: 'Fase 1', color: 'azure', position: 0 }])
    expect(linhas[0].id).toBe('g-novo')
  })

  it('atualizarTarefa faz PATCH só naquele id', async () => {
    const api = await logada()
    fila.push(resposta(200, [{ id: 't-9' }]))
    await api.atualizarTarefa('t-9', { status: 'done', progress: 100 })
    expect(chamadas[0].init.method).toBe('PATCH')
    expect(chamadas[0].url).toContain('tasks?id=eq.t-9')
    expect(JSON.parse(chamadas[0].init.body)).toEqual({ status: 'done', progress: 100 })
  })

  it('comentar usa o id do usuário logado como autor', async () => {
    const api = await logada()
    fila.push(resposta(201, [{ id: 'c1' }]))
    await api.comentar('t-9', 'concluído')
    expect(JSON.parse(chamadas[0].init.body)).toEqual({ task_id: 't-9', author_id: 'u-bot', body: 'concluído' })
  })

  it('tarefa que não veio de volta (RLS escondeu) vira erro claro, não sucesso silencioso', async () => {
    const api = await logada()
    fila.push(resposta(200, []))
    await expect(api.atualizarTarefa('t-9', { status: 'done' })).rejects.toThrow(/não encontrada|sem permissão/i)
  })
})

describe('erros do banco viram mensagem útil', () => {
  async function logada() {
    fila.push(resposta(200, login))
    const api = novaApi()
    await api.entrar('b@x.com', 's')
    return api
  }

  it('42501 (RLS): explica que o bot precisa ser membro do workspace', async () => {
    const api = await logada()
    fila.push(resposta(403, { code: '42501', message: 'new row violates row-level security policy' }))
    const erro = await api.inserirGrupos([{}]).catch((e) => e)
    expect(erro.message).toMatch(/membro do workspace/i)
  })

  it('23514 (constraint): mostra a regra violada', async () => {
    const api = await logada()
    fila.push(resposta(400, { code: '23514', message: 'violates check constraint "periodo_coerente"' }))
    const erro = await api.inserirTarefas([{}]).catch((e) => e)
    expect(erro.message).toContain('periodo_coerente')
  })

  it('JWT expirado sugere rodar de novo (cada execução loga de novo)', async () => {
    const api = await logada()
    fila.push(resposta(401, { code: 'PGRST301', message: 'JWT expired' }))
    const erro = await api.boards().catch((e) => e)
    expect(erro.message).toMatch(/sessão|token/i)
  })

  it('o erro nunca carrega o token', async () => {
    const api = await logada()
    fila.push(resposta(500, { message: 'boom' }))
    const erro = await api.boards().catch((e) => e)
    expect(JSON.stringify(erro.message)).not.toContain('TOKEN')
    expect(String(erro.stack)).not.toContain('TOKEN-SECRETO')
  })

  it('falha de rede vira ErroApi legível', async () => {
    fetchFalso.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'))
    const erro = await novaApi().entrar('a', 'b').catch((e) => e)
    expect(erro).toBeInstanceOf(ErroApi)
    expect(erro.message).toMatch(/rede|conectar/i)
  })
})
