// Lógica dos comandos da CLI. Recebe tudo por injeção (`ctx`): a API, a saída, a leitura de arquivo e o
// vínculo do projeto. Assim é testável com uma API em memória, sem rede e sem disco.

import { normalizar, parsePlano, planejar, refDe, STATUS, validarSpec } from './nucleo.mjs'

/** Erro de USO ou de validação (exit 2): a mensagem diz o que corrigir. Diferente de falha de rede/permissão. */
export class ErroUso extends Error {
  constructor(mensagem) {
    super(mensagem)
    this.name = 'ErroUso'
  }
}

const BOOLEANAS = new Set(['dry-run', 'json', 'sem-vincular'])
const ALIAS_STATUS = { iniciar: 'working', revisar: 'review', concluir: 'done', travar: 'stuck' }
const LIMITE_DETALHE = 40

export function parseArgs(argv) {
  const [comando = 'ajuda', ...resto] = argv
  const posicionais = []
  const flags = {}
  for (let i = 0; i < resto.length; i++) {
    const a = resto[i]
    if (!a.startsWith('--')) {
      posicionais.push(a)
      continue
    }
    const [chave, valor] = a.slice(2).split(/=(.*)/s)
    if (valor !== undefined) flags[chave] = valor
    else if (BOOLEANAS.has(chave)) flags[chave] = true
    else {
      const proximo = resto[i + 1]
      // `--criar` sem valor (ou seguido de outra flag) vale "use o nome do plano".
      flags[chave] = proximo === undefined || proximo.startsWith('--') ? true : (i++, proximo)
    }
  }
  return { comando, posicionais, flags }
}

// ---------------------------------------------------------------------------
// Resolução de workspace, board e tarefa. Nomes podem repetir (todo mundo nasce com "Meu Workspace"),
// então ambiguidade é ERRO que lista os ids, nunca escolha silenciosa.
// ---------------------------------------------------------------------------

const linhaWorkspace = (w) => `  ${w.id}  ${w.name}  (dono: ${w.dono?.full_name ?? '?'})`
const linhaBoard = (b) => `  ${b.id}  ${b.name}`

async function resolverWorkspace(api, chave) {
  const todos = await api.workspaces()
  if (todos.length === 0) throw new ErroUso('essa conta não pertence a nenhum workspace: peça ao dono para convidá-la em "Convidar integrantes"')
  if (typeof chave !== 'string') {
    if (todos.length === 1) return todos[0]
    throw new ErroUso(`a conta pertence a ${todos.length} workspaces; escolha com --workspace <id>:\n${todos.map(linhaWorkspace).join('\n')}`)
  }
  const porId = todos.find((w) => w.id === chave)
  if (porId) return porId
  const porNome = todos.filter((w) => normalizar(w.name) === normalizar(chave))
  if (porNome.length === 1) return porNome[0]
  if (porNome.length > 1) throw new ErroUso(`nome de workspace ambíguo ("${chave}"); use o id:\n${porNome.map(linhaWorkspace).join('\n')}`)
  throw new ErroUso(`workspace "${chave}" não encontrado. Disponíveis:\n${todos.map(linhaWorkspace).join('\n')}`)
}

async function resolverBoard(api, ctx, flags) {
  const chave = typeof flags.board === 'string' ? flags.board : ctx.vinculo?.board
  if (!chave) return null
  const boards = await api.boards()
  const porId = boards.find((b) => b.id === chave)
  if (porId) return porId
  const porNome = boards.filter((b) => normalizar(b.name) === normalizar(chave))
  if (porNome.length === 1) return porNome[0]
  if (porNome.length > 1) throw new ErroUso(`nome de board ambíguo ("${chave}"); use o id:\n${porNome.map(linhaBoard).join('\n')}`)
  const disponiveis = boards.length ? boards.map(linhaBoard).join('\n') : '  (nenhum)'
  throw new ErroUso(`board "${chave}" não encontrado (ou a conta não tem acesso). Disponíveis:\n${disponiveis}`)
}

async function exigirBoard(api, ctx, flags) {
  const board = await resolverBoard(api, ctx, flags)
  if (!board) throw new ErroUso('nenhum board definido: rode `gp vincular --board "<nome|id>"` neste projeto ou passe --board')
  return board
}

function acharTarefa(lista, alvo) {
  const chave = normalizar(alvo)
  const achada =
    lista.find((t) => refDe(t.tags) === alvo) ??
    lista.find((t) => t.id === alvo) ??
    lista.find((t) => normalizar(t.title) === chave)
  if (achada) return achada
  const refs = lista.map((t) => refDe(t.tags)).filter(Boolean)
  const refsTexto = refs.length ? refs.slice(0, 30).join(', ') : '(nenhuma tarefa tem ref; importe um plano primeiro)'
  throw new ErroUso(`tarefa "${alvo}" não encontrada neste board. Refs existentes: ${refsTexto}`)
}

// ---------------------------------------------------------------------------
// Aplicação do plano (planejar() decide; aqui só se grava, na ordem certa)
// ---------------------------------------------------------------------------

/** Não é transacional: se cair no meio, rodar de novo completa o que faltou (a importação é idempotente). */
async function aplicar(api, boardId, estado, plano) {
  const idsGrupo = new Map(estado.grupos.map((g) => [normalizar(g.name), g.id]))
  if (plano.gruposNovos.length) {
    const criados = await api.inserirGrupos(plano.gruposNovos.map((g) => ({ board_id: boardId, name: g.nome, color: g.cor, position: g.position })))
    for (const g of criados) idsGrupo.set(normalizar(g.name), g.id)
  }

  const subtarefas = plano.subtarefasNovas.map((s) => ({ task_id: s.taskId, title: s.titulo, done: s.feita, position: s.position }))

  if (plano.tarefasNovas.length) {
    const criadas = await api.inserirTarefas(
      plano.tarefasNovas.map((t) => ({
        board_id: boardId,
        group_id: idsGrupo.get(normalizar(t.grupo)),
        title: t.titulo,
        description: t.descricao ?? null,
        priority: t.prioridade,
        status: t.status,
        progress: t.progresso,
        start_date: t.inicio,
        due_date: t.prazo,
        is_milestone: t.marco,
        tags: t.tags,
        position: t.position,
      })),
    )
    const idPorRef = new Map(criadas.map((t) => [refDe(t.tags), t.id]))
    for (const t of plano.tarefasNovas) {
      for (const s of t.subtarefas) subtarefas.push({ task_id: idPorRef.get(t.ref), title: s.titulo, done: s.feita, position: s.position })
    }
  }

  if (subtarefas.length) await api.inserirSubtarefas(subtarefas)
  // Linhas independentes entre si: em paralelo.
  await Promise.all([
    ...plano.tarefasAtualizadas.map((u) => api.atualizarTarefa(u.id, u.campos)),
    ...plano.subtarefasMarcadas.map((m) => api.marcarSubtarefa(m.id)),
  ])
}

function imprimirPlano(saida, plano, nomeBoard, dry) {
  const r = plano.resumo
  saida(`${dry ? '[dry-run] ' : ''}Board "${nomeBoard}"`)
  saida(
    `  grupos novos: ${r.gruposNovos} · tarefas novas: ${r.tarefasNovas} · atualizadas: ${r.tarefasAtualizadas} · ` +
      `subtarefas novas: ${r.subtarefasNovas} · subtarefas marcadas: ${r.subtarefasMarcadas} · sem mudança: ${r.iguais}`,
  )
  const linhas = [
    ...plano.tarefasNovas.map((t) => `  + ${t.ref}  ${t.titulo}  [${t.status}]`),
    ...plano.tarefasAtualizadas.map((u) => `  ~ ${u.ref}  ${Object.keys(u.campos).join(', ')}`),
  ]
  for (const l of linhas.slice(0, LIMITE_DETALHE)) saida(l)
  if (linhas.length > LIMITE_DETALHE) saida(`  … e mais ${linhas.length - LIMITE_DETALHE}`)
}

// ---------------------------------------------------------------------------
// Comandos
// ---------------------------------------------------------------------------

async function importar({ posicionais, flags }, ctx) {
  const { api, saida } = ctx
  const arquivo = posicionais[0]
  if (!arquivo) throw new ErroUso('informe o arquivo do plano: gp importar <plano.md|spec.json>')

  const texto = ctx.lerArquivo(arquivo)
  let bruto
  if (/\.md$/i.test(arquivo)) bruto = parsePlano(texto, arquivo)
  else {
    try {
      bruto = JSON.parse(texto)
    } catch {
      throw new ErroUso('o arquivo não é um JSON válido (plano em markdown precisa da extensão .md)')
    }
  }

  const { erros, spec } = validarSpec(bruto)
  if (erros.length) throw new ErroUso(`o plano tem ${erros.length} problema(s); nada foi gravado:\n${erros.map((e) => `  - ${e}`).join('\n')}`)

  const dry = flags['dry-run'] === true
  if (flags.criar && typeof flags.board === 'string') throw new ErroUso('use --board (projeto existente) OU --criar (projeto novo), não os dois')

  let board = null
  let criar = null // { nome, workspace }
  if (flags.criar) {
    const nome = typeof flags.criar === 'string' ? flags.criar : spec.nomeBoard
    if (!nome) throw new ErroUso('--criar precisa de um nome: --criar "<nome do board>"')
    const workspace = await resolverWorkspace(api, flags.workspace)
    // Repetir o mesmo comando por engano não pode duplicar o board: reaproveita o de mesmo nome no workspace.
    board = (await api.boards()).find((b) => b.workspace_id === workspace.id && normalizar(b.name) === normalizar(nome)) ?? null
    if (!board) criar = { nome, workspace }
  } else {
    board = await resolverBoard(api, ctx, flags)
    if (!board) throw new ErroUso('nenhum board definido: use --board "<nome|id>" (projeto existente) ou --criar "<nome>" (projeto novo); ou rode `gp vincular` neste projeto')
  }

  const estado = board ? await api.estadoDoBoard(board.id) : { grupos: [], tarefas: [] }
  const plano = planejar(spec, estado)
  imprimirPlano(saida, plano, board?.name ?? criar.nome, dry)

  if (dry) {
    saida('(dry-run: nada foi gravado' + (criar ? `; o board "${criar.nome}" seria criado` : '') + ')')
    return
  }
  const r = plano.resumo
  if (!criar && r.gruposNovos + r.tarefasNovas + r.tarefasAtualizadas + r.subtarefasNovas + r.subtarefasMarcadas === 0) {
    saida('Nada a fazer: o board já está em dia com o plano.')
    return
  }

  if (criar) {
    board = await api.criarBoard(criar.workspace.id, criar.nome)
    saida(`Board "${board.name}" criado no workspace ${criar.workspace.id}.`)
  }
  await aplicar(api, board.id, estado, plano)
  saida('Feito.')

  if (flags.criar && flags['sem-vincular'] !== true) {
    ctx.gravarVinculo({ board: board.id, nome: board.name, workspace: board.workspace_id })
    saida('Projeto vinculado ao board (.gerenciador.json): os próximos comandos não precisam de --board.')
  }
}

async function vincular({ flags }, ctx) {
  const { api, saida } = ctx
  let board
  if (flags.criar) {
    const nome = typeof flags.criar === 'string' ? flags.criar : null
    if (!nome) throw new ErroUso('--criar precisa de um nome: --criar "<nome do board>"')
    const workspace = await resolverWorkspace(api, flags.workspace)
    board = (await api.boards()).find((b) => b.workspace_id === workspace.id && normalizar(b.name) === normalizar(nome)) ?? (await api.criarBoard(workspace.id, nome))
  } else {
    board = await resolverBoard(api, { vinculo: null }, flags)
    if (!board) throw new ErroUso('diga qual board: gp vincular --board "<nome|id>" (ou --criar "<nome>" --workspace <id> para um novo)')
  }
  ctx.gravarVinculo({ board: board.id, nome: board.name, workspace: board.workspace_id })
  saida(`Vinculado ao board "${board.name}" (${board.id}).`)
}

async function eu(_args, { api, saida }) {
  const [perfil, workspaces, boards] = await Promise.all([api.perfil(), api.workspaces(), api.boards()])
  saida(`Conta: ${perfil?.full_name ?? '(sem perfil)'}`)
  saida('Workspaces:')
  for (const w of workspaces) saida(linhaWorkspace(w))
  saida('Boards:')
  if (boards.length === 0) saida('  (nenhum)')
  for (const b of boards) saida(`${linhaBoard(b)}  [workspace ${b.workspace_id}]`)
}

async function listarBoards(_args, { api, saida }) {
  const boards = await api.boards()
  if (boards.length === 0) saida('Nenhum board acessível a esta conta.')
  for (const b of boards) saida(`${linhaBoard(b)}  [workspace ${b.workspace_id}]`)
}

async function tarefas({ flags }, ctx) {
  const board = await exigirBoard(ctx.api, ctx, flags)
  if (typeof flags.status === 'string' && !STATUS.includes(flags.status)) throw new ErroUso(`status "${flags.status}" inválido (use ${STATUS.join(', ')})`)
  const estado = await ctx.api.estadoDoBoard(board.id)
  const grupos = new Map(estado.grupos.map((g) => [g.id, g]))
  const ordem = (t) => (grupos.get(t.group_id)?.position ?? 0) * 100000 + t.position
  const lista = estado.tarefas
    .filter((t) => typeof flags.status !== 'string' || t.status === flags.status)
    .toSorted((a, b) => ordem(a) - ordem(b))
    .map((t) => ({ ref: refDe(t.tags), id: t.id, titulo: t.title, status: t.status, progresso: t.progress, grupo: grupos.get(t.group_id)?.name ?? null }))

  if (flags.json === true) {
    ctx.saida(JSON.stringify(lista, null, 2))
    return
  }
  if (lista.length === 0) ctx.saida('Nenhuma tarefa.')
  for (const t of lista) ctx.saida(`${t.ref ?? '(sem ref)'}  ${t.status}  ${t.progresso}%  ${t.titulo}  [${t.grupo}]`)
}

async function mudarStatus(comando, { posicionais, flags }, ctx) {
  const [alvo, ...resto] = posicionais
  if (!alvo) throw new ErroUso('diga a tarefa (ref, id ou título): gp status <ref> <status>')
  const novo = ALIAS_STATUS[comando] ?? resto[0]
  if (!STATUS.includes(novo)) throw new ErroUso(`status ${novo === undefined ? 'ausente' : `"${novo}" inválido`} (use ${STATUS.join(', ')})`)
  if (comando === 'travar' && typeof flags.comentario !== 'string') throw new ErroUso('travar exige o motivo: gp travar <ref> --comentario "por que travou"')

  let progresso
  if (flags.progresso !== undefined) {
    progresso = Number(flags.progresso)
    if (!Number.isInteger(progresso) || progresso < 0 || progresso > 100) throw new ErroUso('progresso deve ser um inteiro de 0 a 100')
  } else if (novo === 'done') progresso = 100

  const board = await exigirBoard(ctx.api, ctx, flags)
  const { tarefas: todas } = await ctx.api.estadoDoBoard(board.id)
  const tarefa = acharTarefa(todas, alvo)

  await ctx.api.atualizarTarefa(tarefa.id, { status: novo, ...(progresso === undefined ? {} : { progress: progresso }) })
  if (typeof flags.comentario === 'string') await ctx.api.comentar(tarefa.id, flags.comentario)
  ctx.saida(`${refDe(tarefa.tags) ?? tarefa.id}: ${tarefa.status} → ${novo}${progresso === undefined ? '' : ` (${progresso}%)`}`)
}

async function comentar({ posicionais, flags }, ctx) {
  const [alvo, ...palavras] = posicionais
  const texto = palavras.join(' ').trim()
  if (!alvo || !texto) throw new ErroUso('uso: gp comentar <ref> "texto do comentário"')
  const board = await exigirBoard(ctx.api, ctx, flags)
  const { tarefas: todas } = await ctx.api.estadoDoBoard(board.id)
  const tarefa = acharTarefa(todas, alvo)
  await ctx.api.comentar(tarefa.id, texto)
  ctx.saida(`Comentário registrado em ${refDe(tarefa.tags) ?? tarefa.id}.`)
}

export const AJUDA = `gp — alimenta o Gerenciador de Projetos a partir de um plano

Projeto novo:        gp importar plano.md --criar "Nome do sistema" [--workspace <id>]
Projeto existente:   gp boards            (descobrir)   →   gp vincular --board "<nome|id>"
                     gp importar plano.md                (usa o vínculo; --board também serve)
Sincronizar:         marque as caixas do plano (- [x]) e rode  gp importar plano.md  de novo
Acompanhar:          gp iniciar <ref> · gp concluir <ref> --comentario "…" · gp revisar <ref>
                     gp travar <ref> --comentario "motivo" · gp status <ref> <status> [--progresso N]
Ler:                 gp tarefas [--status done] [--json] · gp eu · gp boards
Outros:              gp comentar <ref> "texto" · gp configurar (uma vez por máquina, feito pelo humano)
Flags úteis:         --dry-run (simula) · --board · --workspace · --sem-vincular

Status: not_started, working, review, done, stuck. Reimportar nunca desfaz progresso.`

const TRATAMENTO = { importar, vincular, eu, boards: listarBoards, tarefas, comentar }

const COMANDOS_DE_AJUDA = new Set(['ajuda', '--help', '-h'])

/** Comando existe? Checado ANTES de entrar no sistema: erro de digitação não deve gastar um login. */
export const ehComando = (comando) =>
  COMANDOS_DE_AJUDA.has(comando) || comando === 'status' || Object.hasOwn(ALIAS_STATUS, comando) || Object.hasOwn(TRATAMENTO, comando)

export async function executar(comando, args, ctx) {
  if (COMANDOS_DE_AJUDA.has(comando)) {
    ctx.saida(AJUDA)
    return
  }
  if (comando === 'status' || Object.hasOwn(ALIAS_STATUS, comando)) return mudarStatus(comando, args, ctx)
  const tratar = Object.hasOwn(TRATAMENTO, comando) ? TRATAMENTO[comando] : null
  if (!tratar) throw new ErroUso(`comando desconhecido: "${comando}". Rode "gp ajuda".`)
  return tratar(args, ctx)
}
