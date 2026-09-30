// Camada HTTP da integração: GoTrue (login) + PostgREST, só com `fetch` (Node ≥ 18, zero dependências).
// É a ÚNICA parte que fala com a rede. Nunca imprime nem devolve token, senha ou e-mail em erro.

export class ErroApi extends Error {
  constructor(mensagem, { status, codigo } = {}) {
    super(mensagem)
    this.name = 'ErroApi'
    this.status = status
    this.codigo = codigo
  }
}

const COLUNAS_TAREFA =
  'id,group_id,title,description,priority,status,progress,start_date,due_date,is_milestone,tags,position,subtasks(id,title,done,position)'

/** Traduz o erro cru do PostgREST para algo que quem chama consegue agir em cima. */
function traduzir(status, corpo) {
  const codigo = corpo?.code
  const msg = corpo?.message ?? ''
  if (codigo === '42501' || status === 403) {
    return new ErroApi('sem permissão: a conta precisa ser membro do workspace deste board (o dono convida em "Convidar integrantes")', { status, codigo })
  }
  if (codigo === 'PGRST301' || /jwt/i.test(msg) || status === 401) {
    return new ErroApi('sessão recusada ou expirada: rode o comando de novo (cada execução entra de novo)', { status, codigo })
  }
  if (codigo === '23514') return new ErroApi(`regra do banco violada: ${msg}`, { status, codigo })
  if (codigo === '23505') return new ErroApi('esse registro já existe', { status, codigo })
  return new ErroApi(`falha no servidor (${status})${msg ? `: ${msg}` : ''}`, { status, codigo })
}

export function criarApi({ url, chave, fetchImpl = fetch }) {
  const base = url.replace(/\/+$/, '')
  let token = null
  const api = { usuarioId: null }

  async function chamar(caminho, { metodo = 'GET', corpo, autenticado = true } = {}) {
    const headers = { apikey: chave, 'Content-Type': 'application/json' }
    if (autenticado) headers.Authorization = `Bearer ${token}`
    if (metodo !== 'GET') headers.Prefer = 'return=representation'

    let resposta
    try {
      resposta = await fetchImpl(`${base}${caminho}`, { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo) })
    } catch {
      throw new ErroApi('não foi possível conectar ao servidor (rede ou URL incorreta)')
    }

    let json = null
    try {
      json = await resposta.json()
    } catch {
      // resposta vazia (204) não é erro
    }
    if (!resposta.ok) throw traduzir(resposta.status, json)
    return json
  }

  const rest = (caminho, opcoes) => chamar(`/rest/v1/${caminho}`, opcoes)

  return Object.assign(api, {
    async entrar(email, senha) {
      let resposta
      try {
        resposta = await fetchImpl(`${base}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: { apikey: chave, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: senha }),
        })
      } catch {
        throw new ErroApi('não foi possível conectar ao servidor (rede ou URL incorreta)')
      }
      // Mensagem genérica de propósito: não repete e-mail/senha nem revela qual dos dois errou.
      if (!resposta.ok) throw new ErroApi('login recusado: confira e-mail, senha e a chave/URL do projeto', { status: resposta.status })
      const dados = await resposta.json()
      token = dados.access_token
      api.usuarioId = dados.user.id
      return api.usuarioId
    },

    async perfil() {
      const linhas = await rest(`profiles?select=id,full_name&id=eq.${api.usuarioId}`)
      return linhas[0] ?? null
    },

    workspaces: () => rest('workspaces?select=id,name,owner_id,dono:profiles(full_name)&order=created_at.asc'),
    boards: () => rest('boards?select=id,name,workspace_id,created_at&order=created_at.asc'),

    async estadoDoBoard(boardId) {
      const id = encodeURIComponent(boardId)
      const [grupos, tarefas] = await Promise.all([
        rest(`groups?select=id,name,color,position&board_id=eq.${id}&order=position.asc`),
        rest(`tasks?select=${encodeURIComponent(COLUNAS_TAREFA)}&board_id=eq.${id}&order=position.asc`),
      ])
      return { grupos, tarefas }
    },

    async criarBoard(workspaceId, nome) {
      const linhas = await rest('boards', { metodo: 'POST', corpo: { workspace_id: workspaceId, name: nome } })
      return linhas[0]
    },

    inserirGrupos: (linhas) => rest('groups', { metodo: 'POST', corpo: linhas }),
    inserirTarefas: (linhas) => rest('tasks', { metodo: 'POST', corpo: linhas }),
    inserirSubtarefas: (linhas) => rest('subtasks', { metodo: 'POST', corpo: linhas }),

    async atualizarTarefa(id, campos) {
      const linhas = await rest(`tasks?id=eq.${encodeURIComponent(id)}`, { metodo: 'PATCH', corpo: campos })
      // O RLS não devolve erro quando esconde a linha: só devolve vazio. Vazio = não deu certo.
      if (!linhas || linhas.length === 0) throw new ErroApi('tarefa não encontrada ou sem permissão para alterá-la')
      return linhas[0]
    },

    async marcarSubtarefa(id) {
      const linhas = await rest(`subtasks?id=eq.${encodeURIComponent(id)}`, { metodo: 'PATCH', corpo: { done: true } })
      if (!linhas || linhas.length === 0) throw new ErroApi('subtarefa não encontrada ou sem permissão para alterá-la')
      return linhas[0]
    },

    async comentar(taskId, texto) {
      const linhas = await rest('comments', { metodo: 'POST', corpo: { task_id: taskId, author_id: api.usuarioId, body: texto } })
      return linhas[0]
    },
  })
}
