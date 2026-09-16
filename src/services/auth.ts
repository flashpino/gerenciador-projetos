import { supabase } from '@/lib/supabase'
import { ErroDeDados } from './erros'

/** Formato de usuario que a UI consome — nunca o `User`/`Session` cru do Supabase. */
export interface Usuario {
  id: string
  email: string | null
}

/**
 * CAMADA DE SERVICO — autenticacao. Unico modulo, alem de lib/supabase.ts,
 * que fala com supabase.auth. ZONA VERMELHA (docs/specs.md secao 6).
 *
 * F0.2: uma credencial invalida nunca pode revelar se o e-mail existe. O
 * Supabase ja unifica "e-mail nao existe" e "senha errada" na mesma
 * mensagem (`Invalid login credentials`) — aqui so garantimos que a
 * traducao nao reintroduz a diferenca.
 */
function traduzirErroAuth(erro: { message?: string } | null): ErroDeDados {
  const msg = erro?.message ?? ''

  if (msg === 'Invalid login credentials') {
    return new ErroDeDados('E-mail ou senha inválidos.', erro)
  }
  if (msg === 'User already registered') {
    return new ErroDeDados('Este e-mail já está cadastrado.', erro)
  }
  if (msg.startsWith('Password should be at least')) {
    return new ErroDeDados('A senha precisa ter pelo menos 6 caracteres.', erro)
  }
  return new ErroDeDados('Não foi possível completar a operação. Tente de novo.', erro)
}

export async function entrar(email: string, senha: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (error) throw traduzirErroAuth(error)
}

/** `full_name` em `options.data` alimenta o trigger `handle_new_user` (0001_init.up.sql). */
export async function cadastrar(email: string, senha: string, nome: string): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { full_name: nome } },
  })
  if (error) throw traduzirErroAuth(error)
}

export async function sair(): Promise<void> {
  await supabase.auth.signOut()
}

function paraUsuario(user: { id: string; email?: string | null } | null | undefined): Usuario | null {
  return user ? { id: user.id, email: user.email ?? null } : null
}

export async function obterSessaoAtual(): Promise<Usuario | null> {
  const { data } = await supabase.auth.getSession()
  return paraUsuario(data.session?.user)
}

/** Devolve a funcao que cancela a inscricao — chamar no cleanup do efeito. */
export function escutarSessao(callback: (usuario: Usuario | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => callback(paraUsuario(sessao?.user)))
  return () => data.subscription.unsubscribe()
}
