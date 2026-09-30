/**
 * Regras PURAS da função `usuarios`: quem pode, e validação de entrada. Sem Deno, sem rede —
 * testadas pelo Vitest do app (regras.test.ts); o index.ts só faz o I/O.
 *
 * ZONA VERMELHA (autorização + validação no servidor): escrito pelo agente, revisado por humano.
 */

type Resultado<T> = { ok: true; dados: T } | { ok: false; erro: string }

export interface NovoUsuario {
  email: string
  nome: string
  senha: string
}

export interface EdicaoUsuario {
  id: string
  nome?: string
  email?: string
  senha?: string
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Master = `app_metadata.role === 'master'`. `app_metadata` só o servidor grava; `user_metadata` a própria
 * pessoa edita pela API pública — por isso NUNCA serve para autorização.
 */
export function ehMaster(usuario: { app_metadata?: Record<string, unknown> } | null | undefined): boolean {
  return usuario?.app_metadata?.role === 'master'
}

const objeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

function email(v: unknown): Resultado<string> {
  const limpo = typeof v === 'string' ? v.trim().toLowerCase() : ''
  return EMAIL.test(limpo) && limpo.length <= 254 ? { ok: true, dados: limpo } : { ok: false, erro: 'E-mail inválido.' }
}

function nome(v: unknown): Resultado<string> {
  const limpo = typeof v === 'string' ? v.trim() : ''
  if (!limpo) return { ok: false, erro: 'O nome não pode ficar vazio.' }
  return limpo.length <= 120 ? { ok: true, dados: limpo } : { ok: false, erro: 'O nome pode ter no máximo 120 caracteres.' }
}

/** 8+ (mais que o mínimo de 6 do Supabase) e ≤ 72: o bcrypt ignora o que passa disso. */
function senha(v: unknown): Resultado<string> {
  return typeof v === 'string' && v.length >= 8 && v.length <= 72
    ? { ok: true, dados: v }
    : { ok: false, erro: 'A senha precisa ter entre 8 e 72 caracteres.' }
}

export function validarCriar(entrada: unknown): Resultado<NovoUsuario> {
  if (!objeto(entrada)) return { ok: false, erro: 'Dados inválidos.' }
  const e = email(entrada.email)
  if (!e.ok) return e
  const n = nome(entrada.nome)
  if (!n.ok) return n
  const s = senha(entrada.senha)
  if (!s.ok) return s
  return { ok: true, dados: { email: e.dados, nome: n.dados, senha: s.dados } }
}

export function validarEditar(entrada: unknown): Resultado<EdicaoUsuario> {
  if (!objeto(entrada)) return { ok: false, erro: 'Dados inválidos.' }
  if (typeof entrada.id !== 'string' || !UUID.test(entrada.id)) return { ok: false, erro: 'Usuário inválido.' }

  const dados: EdicaoUsuario = { id: entrada.id }
  if (entrada.nome !== undefined) {
    const n = nome(entrada.nome)
    if (!n.ok) return n
    dados.nome = n.dados
  }
  if (entrada.email !== undefined) {
    const e = email(entrada.email)
    if (!e.ok) return e
    dados.email = e.dados
  }
  if (entrada.senha !== undefined && entrada.senha !== '') {
    const s = senha(entrada.senha)
    if (!s.ok) return s
    dados.senha = s.dados
  }
  if (Object.keys(dados).length === 1) return { ok: false, erro: 'Nada para alterar.' }
  return { ok: true, dados }
}

/** `alvo` vem do banco (auth.admin.getUserById), não do corpo da requisição. */
export function validarExcluir(
  entrada: unknown,
  chamadorId: string,
  alvo: { id: string; email: string | null | undefined },
): Resultado<{ id: string }> {
  if (!objeto(entrada) || typeof entrada.id !== 'string' || !UUID.test(entrada.id)) {
    return { ok: false, erro: 'Usuário inválido.' }
  }
  if (entrada.id === chamadorId) return { ok: false, erro: 'Você não pode excluir a própria conta.' }
  const digitado = typeof entrada.confirmacao === 'string' ? entrada.confirmacao.trim().toLowerCase() : ''
  if (!alvo.email || digitado !== alvo.email.toLowerCase()) {
    return { ok: false, erro: 'Digite o e-mail da conta para confirmar.' }
  }
  return { ok: true, dados: { id: entrada.id } }
}
