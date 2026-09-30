// Núcleo PURO da integração Claude → sistema: sem rede, sem arquivo, sem `process`.
// Tudo aqui é função de entrada → saída, testável sem banco. Spec:
// docs/superpowers/specs/2026-09-30-integracao-claude-design.md

export const STATUS = ['not_started', 'working', 'review', 'done', 'stuck']
export const PRIORIDADES = ['low', 'medium', 'high', 'critical']
export const CORES = ['azure', 'grape', 'mint', 'crimson']
export const PREFIXO_REF = 'ref:'

// Espelha as constraints do banco (0001_init): erro de spec aparece ANTES de gravar qualquer coisa.
const LIMITE_TITULO = 200
const LIMITE_NOME_GRUPO = 120
const LIMITE_DESCRICAO = 10000
const REF_VALIDO = /^[A-Za-z0-9_.#:-]{1,60}$/

/** done vale mais que review, que vale mais que working/stuck, que valem mais que not_started. */
const RANK = { not_started: 0, working: 1, stuck: 1, review: 2, done: 3 }

export const slug = (texto) =>
  String(texto)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const normalizar = (s) => String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

export const avancaStatus = (atual, novo) => RANK[novo] > RANK[atual]

export function statusDeEtapas(feitas, total) {
  if (total === 0 || feitas === 0) return { status: 'not_started', progresso: 0 }
  if (feitas >= total) return { status: 'done', progresso: 100 }
  return { status: 'working', progresso: Math.round((feitas / total) * 100) }
}

export function refDe(tags) {
  const tag = (tags ?? []).find((t) => t.startsWith(PREFIXO_REF))
  return tag ? tag.slice(PREFIXO_REF.length) : null
}

// ---------------------------------------------------------------------------
// Plano em markdown (formato do superpowers:writing-plans)
// ---------------------------------------------------------------------------

const TITULO_PLANO = /\s*[—–-]?\s*(Implementation Plan|Plano de Implementa[çc][ãa]o)\s*$/i
const CABECALHO_TAREFA = /^###\s+Task\s+(\d+)\s*:\s*(.+?)\s*$/
const ETAPA = /^\s*-\s\[( |x|X)\]\s+(.*)$/
const LIMITE_DESCRICAO_PLANO = 9000

/**
 * Lê um plano em markdown e devolve o spec. Cada `### Task N: Nome` vira uma tarefa e
 * cada `- [ ] **Step k: …**` vira uma subtarefa (feita se `[x]`). O status da tarefa sai das
 * caixas. Blocos de código (```) são ignorados: exemplo de plano dentro de um plano não conta.
 */
export function parsePlano(markdown, nomeArquivo) {
  const titulo = (markdown.match(/^#\s+(.+)$/m)?.[1] ?? 'Plano').replace(TITULO_PLANO, '').trim() || 'Plano'
  const base = nomeArquivo
    ? nomeArquivo.split(/[\\/]/).pop().replace(/\.[^.]+$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')
    : slug(titulo)
  const prefixo = slug(base) || slug(titulo) || 'plano'

  const tarefas = []
  let atual = null
  let emCodigo = false

  for (const linha of markdown.split(/\r?\n/)) {
    if (linha.trim().startsWith('```')) {
      emCodigo = !emCodigo
      continue
    }
    if (emCodigo) continue

    const cab = linha.match(CABECALHO_TAREFA)
    if (cab) {
      atual = { ref: `${prefixo}#T${cab[1]}`, titulo: cab[2], descricao: [], subtarefas: [], comecouEtapas: false }
      tarefas.push(atual)
      continue
    }
    // Qualquer outro título (#, ##, ###) encerra a tarefa: o que vem depois não é dela.
    if (/^#{1,3}\s/.test(linha)) {
      atual = null
      continue
    }
    if (!atual) continue

    const etapa = linha.match(ETAPA)
    if (etapa) {
      atual.comecouEtapas = true
      atual.subtarefas.push({ titulo: etapa[2].replace(/\*\*/g, '').trim(), feita: etapa[1] !== ' ' })
    } else if (!atual.comecouEtapas) {
      atual.descricao.push(linha)
    }
  }

  return {
    nomeBoard: titulo,
    grupos: [
      {
        nome: titulo,
        tarefas: tarefas.map((t) => {
          const { status, progresso } = statusDeEtapas(t.subtarefas.filter((s) => s.feita).length, t.subtarefas.length)
          const item = { ref: t.ref, titulo: t.titulo, subtarefas: t.subtarefas, status, progresso }
          const texto = t.descricao.join('\n').trim().slice(0, LIMITE_DESCRICAO_PLANO)
          if (texto) item.descricao = texto
          return item
        }),
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Validação do spec
// ---------------------------------------------------------------------------

function dataValida(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [a, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(a, m - 1, d))
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/** @returns {{ erros: string[], spec: object }} `erros` vazio = pode gravar. Junta TODOS os erros. */
export function validarSpec(bruto) {
  const erros = []
  const refsVistos = new Set()
  let totalTarefas = 0

  if (!bruto || !Array.isArray(bruto.grupos) || bruto.grupos.length === 0) {
    return { erros: ['o plano precisa de uma lista "grupos" com pelo menos um grupo'], spec: { nomeBoard: null, grupos: [] } }
  }

  const grupos = bruto.grupos.map((g, gi) => {
    const nome = typeof g?.nome === 'string' ? g.nome.trim() : ''
    const ondeG = `grupo ${gi + 1}${nome ? ` "${nome}"` : ''}`
    if (!nome || nome.length > LIMITE_NOME_GRUPO) erros.push(`${ondeG}: nome vazio ou com mais de ${LIMITE_NOME_GRUPO} caracteres`)
    if (g?.cor !== undefined && !CORES.includes(g.cor)) erros.push(`${ondeG}: cor "${g.cor}" inválida (use ${CORES.join(', ')})`)
    if (!Array.isArray(g?.tarefas)) erros.push(`${ondeG}: falta a lista "tarefas"`)

    const tarefas = (Array.isArray(g?.tarefas) ? g.tarefas : []).map((t, ti) => {
      totalTarefas++
      const ref = typeof t?.ref === 'string' ? t.ref.trim() : ''
      const onde = `${ondeG}, tarefa ${ref || ti + 1}`
      const titulo = typeof t?.titulo === 'string' ? t.titulo.trim() : ''

      if (!REF_VALIDO.test(ref)) erros.push(`${onde}: ref inválido ou ausente (letras, números e _ . # : -, até 60)`)
      else if (refsVistos.has(ref)) erros.push(`${onde}: ref repetido no plano`)
      else refsVistos.add(ref)

      if (!titulo || titulo.length > LIMITE_TITULO) erros.push(`${onde}: título vazio ou com mais de ${LIMITE_TITULO} caracteres`)
      if (t?.prioridade !== undefined && !PRIORIDADES.includes(t.prioridade)) erros.push(`${onde}: prioridade "${t.prioridade}" inválida (use ${PRIORIDADES.join(', ')})`)
      if (t?.status !== undefined && !STATUS.includes(t.status)) erros.push(`${onde}: status "${t.status}" inválido (use ${STATUS.join(', ')})`)
      if (t?.descricao !== undefined && String(t.descricao).length > LIMITE_DESCRICAO) erros.push(`${onde}: descrição com mais de ${LIMITE_DESCRICAO} caracteres`)
      if (t?.progresso !== undefined && !(Number.isInteger(t.progresso) && t.progresso >= 0 && t.progresso <= 100)) erros.push(`${onde}: progresso deve ser inteiro de 0 a 100`)

      const inicioInformado = t?.inicio !== undefined && t.inicio !== null
      const prazoInformado = t?.prazo !== undefined && t.prazo !== null
      if (inicioInformado && !dataValida(t.inicio)) erros.push(`${onde}: início "${t.inicio}" não é uma data AAAA-MM-DD`)
      if (prazoInformado && !dataValida(t.prazo)) erros.push(`${onde}: prazo "${t.prazo}" não é uma data AAAA-MM-DD`)
      if (inicioInformado && prazoInformado && dataValida(t.inicio) && dataValida(t.prazo) && t.prazo < t.inicio) erros.push(`${onde}: prazo antes do início`)
      if (t?.marco === true && !prazoInformado) erros.push(`${onde}: marco precisa de prazo (é uma data única)`)

      const etiquetas = Array.isArray(t?.etiquetas) ? t.etiquetas.map(String) : []
      if (etiquetas.some((e) => e.startsWith(PREFIXO_REF))) erros.push(`${onde}: etiqueta começando com "${PREFIXO_REF}" é reservada para a referência da tarefa`)

      const subtarefas = (Array.isArray(t?.subtarefas) ? t.subtarefas : []).map((s) => {
        const objeto = typeof s === 'string' ? { titulo: s, feita: false } : { titulo: s?.titulo, feita: s?.feita === true }
        const tituloSub = typeof objeto.titulo === 'string' ? objeto.titulo.trim() : ''
        if (!tituloSub || tituloSub.length > LIMITE_TITULO) erros.push(`${onde}: subtarefa vazia ou com mais de ${LIMITE_TITULO} caracteres`)
        return { titulo: tituloSub, feita: objeto.feita }
      })

      // Campo omitido continua omitido: só vale para CRIAR. Preencher um padrão aqui faria uma
      // reimportação sobrescrever o que uma pessoa já tinha ajustado (ex.: a prioridade).
      const saida = { ref, titulo, etiquetas, subtarefas }
      for (const [k, v] of [['descricao', t?.descricao], ['prioridade', t?.prioridade], ['status', t?.status], ['progresso', t?.progresso], ['marco', t?.marco], ['prazo', t?.prazo]]) {
        if (v !== undefined) saida[k] = v
      }
      if (t?.inicio !== undefined) saida.inicio = t.inicio
      if (t?.marco === true) saida.inicio = null // marco é data única
      return saida
    })

    return { nome, cor: CORES.includes(g?.cor) ? g.cor : CORES[gi % CORES.length], tarefas }
  })

  if (totalTarefas === 0) erros.push('o plano não tem nenhuma tarefa')
  return { erros, spec: { nomeBoard: bruto.nomeBoard ?? bruto.projeto ?? null, grupos } }
}

// ---------------------------------------------------------------------------
// Planejamento: spec + estado atual do board → o que fazer (sem gravar nada)
// ---------------------------------------------------------------------------

/**
 * Diferença entre o plano e o board. Idempotente: rodar duas vezes o mesmo plano não cria nada de novo.
 * Regras (spec do sub-projeto 10): descritivos atualizam; status/progresso e subtarefas só AVANÇAM;
 * a tarefa nunca muda de grupo; tarefa só é reconhecida pela tag `ref:`, nunca pelo título.
 */
export function planejar(spec, estado) {
  const gruposPorNome = new Map(estado.grupos.map((g) => [normalizar(g.name), g]))
  const tarefasPorRef = new Map()
  for (const t of estado.tarefas) {
    const ref = refDe(t.tags)
    if (ref) tarefasPorRef.set(ref, t)
  }

  // Próxima posição por grupo (chave = nome normalizado), começando depois da última existente.
  const proxima = new Map()
  const posicaoMaxima = (idGrupo) => Math.max(-1, ...estado.tarefas.filter((t) => t.group_id === idGrupo).map((t) => t.position))
  let proximaPosicaoGrupo = Math.max(-1, ...estado.grupos.map((g) => g.position)) + 1

  const plano = { gruposNovos: [], tarefasNovas: [], tarefasAtualizadas: [], subtarefasNovas: [], subtarefasMarcadas: [], iguais: 0 }

  for (const g of spec.grupos) {
    const chave = normalizar(g.nome)
    const existente = gruposPorNome.get(chave)
    if (!existente) {
      plano.gruposNovos.push({ nome: g.nome, cor: g.cor, position: proximaPosicaoGrupo++ })
      proxima.set(chave, 0)
    } else if (!proxima.has(chave)) {
      proxima.set(chave, posicaoMaxima(existente.id) + 1)
    }

    for (const t of g.tarefas) {
      const atual = tarefasPorRef.get(t.ref)

      if (!atual) {
        const status = t.status ?? 'not_started'
        const posicao = proxima.get(chave)
        proxima.set(chave, posicao + 1)
        plano.tarefasNovas.push({
          ref: t.ref,
          // Nome CANÔNICO do grupo (o existente, se houver): quem aplica resolve o id por ele.
          grupo: existente?.name ?? g.nome,
          titulo: t.titulo,
          descricao: t.descricao,
          prioridade: t.prioridade ?? 'medium',
          status,
          progresso: t.progresso ?? (status === 'done' ? 100 : 0),
          inicio: t.inicio ?? null,
          prazo: t.prazo ?? null,
          marco: t.marco ?? false,
          tags: [`${PREFIXO_REF}${t.ref}`, ...t.etiquetas],
          position: posicao,
          subtarefas: t.subtarefas.map((s, position) => ({ titulo: s.titulo, feita: s.feita, position })),
        })
        continue
      }

      const campos = {}
      if (t.titulo !== atual.title.trim()) campos.title = t.titulo
      if (t.descricao !== undefined && t.descricao !== (atual.description ?? '')) campos.description = t.descricao
      if (t.prioridade !== undefined && t.prioridade !== atual.priority) campos.priority = t.prioridade
      if (t.inicio !== undefined && t.inicio !== atual.start_date) campos.start_date = t.inicio
      if (t.prazo !== undefined && t.prazo !== atual.due_date) campos.due_date = t.prazo
      if (t.marco !== undefined && t.marco !== atual.is_milestone) campos.is_milestone = t.marco

      if (t.status !== undefined && avancaStatus(atual.status, t.status)) {
        campos.status = t.status
        campos.progress = t.status === 'done' ? 100 : Math.max(atual.progress, t.progresso ?? 0)
      } else if (t.progresso !== undefined && (t.status === undefined || t.status === atual.status) && t.progresso > atual.progress) {
        campos.progress = t.progresso
      }

      const faltam = t.etiquetas.filter((e) => !atual.tags.includes(e))
      if (faltam.length) campos.tags = [...atual.tags, ...faltam]

      // Subtarefas: casadas pelo título. Criar as que faltam; marcar como feitas, nunca desmarcar.
      const subsAtuais = new Map((atual.subtasks ?? []).map((s) => [normalizar(s.title), s]))
      let proximaSub = Math.max(-1, ...(atual.subtasks ?? []).map((s) => s.position)) + 1
      let mexeuNasSubtarefas = false
      for (const s of t.subtarefas) {
        const sub = subsAtuais.get(normalizar(s.titulo))
        if (!sub) {
          plano.subtarefasNovas.push({ taskId: atual.id, tarefaRef: t.ref, titulo: s.titulo, feita: s.feita, position: proximaSub++ })
          mexeuNasSubtarefas = true
        } else if (s.feita && !sub.done) {
          plano.subtarefasMarcadas.push({ id: sub.id, tarefaRef: t.ref, titulo: s.titulo })
          mexeuNasSubtarefas = true
        }
      }

      if (Object.keys(campos).length > 0) plano.tarefasAtualizadas.push({ id: atual.id, ref: t.ref, campos })
      else if (!mexeuNasSubtarefas) plano.iguais++
    }
  }

  return {
    ...plano,
    resumo: {
      gruposNovos: plano.gruposNovos.length,
      tarefasNovas: plano.tarefasNovas.length,
      tarefasAtualizadas: plano.tarefasAtualizadas.length,
      subtarefasNovas: plano.subtarefasNovas.length + plano.tarefasNovas.reduce((n, t) => n + t.subtarefas.length, 0),
      subtarefasMarcadas: plano.subtarefasMarcadas.length,
      iguais: plano.iguais,
    },
  }
}
