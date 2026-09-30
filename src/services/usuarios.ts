import { supabase } from '@/lib/supabase'
import { ErroDeDados } from './erros'

/**
 * Administração de contas (tela Usuários, só master). Tudo passa pela função `usuarios` no servidor:
 * criar/editar/excluir conta exige a service role, que nunca entra no app. A função confere se quem
 * chama é master — esconder a tela é só conveniência.
 */
export interface UsuarioAdmin {
  id: string
  email: string
  nome: string
  criadoEm: string
  ultimoAcesso: string | null
  master: boolean
}

export interface NovoUsuario {
  email: string
  nome: string
  /** Provisória: o master passa para a pessoa. */
  senha: string
}

export interface EdicaoUsuario {
  id: string
  nome?: string
  email?: string
  /** Vazia/ausente = não troca. */
  senha?: string
}

async function chamar<T>(corpo: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('usuarios', { body: corpo })
  if (!error) return data as T

  // Erro HTTP da função: a mensagem de domínio ("E-mail inválido.") vem no corpo como { erro }.
  const resposta = (error as { context?: unknown }).context
  if (resposta instanceof Response) {
    const corpoErro = (await resposta.json().catch(() => null)) as { erro?: unknown } | null
    if (typeof corpoErro?.erro === 'string') throw new ErroDeDados(corpoErro.erro, error)
  }
  throw new ErroDeDados('Não foi possível falar com o servidor. Tente de novo.', error)
}

export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  const { usuarios } = await chamar<{ usuarios: UsuarioAdmin[] }>({ acao: 'listar' })
  return usuarios
}

export async function criarUsuario(novo: NovoUsuario): Promise<void> {
  await chamar({ acao: 'criar', ...novo })
}

export async function atualizarUsuario(edicao: EdicaoUsuario): Promise<void> {
  await chamar({ acao: 'editar', ...edicao })
}

/** `confirmacao` = o e-mail digitado; o servidor confere contra o e-mail real da conta. */
export async function excluirUsuario(id: string, confirmacao: string): Promise<void> {
  await chamar({ acao: 'excluir', id, confirmacao })
}
