/**
 * Função `usuarios` (Supabase Edge Function, Deno) — administração de contas pelo master.
 * Ações (POST { acao, ... }): listar · criar · editar · excluir.
 *
 * ZONA VERMELHA (autenticação/autorização + validação no servidor): escrito pelo agente,
 * revisado e publicado por humano.
 *
 * Autorização: o JWT de quem chama é validado aqui (auth.getUser) e só `app_metadata.role === 'master'`
 * passa. Usa a SERVICE ROLE, que existe só no servidor — nunca no app.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { ehMaster, validarCriar, validarEditar, validarExcluir } from './regras.ts'

const ambiente = (nome: string): string => {
  const valor = Deno.env.get(nome)
  if (!valor) throw new Error(`Variável ${nome} ausente`)
  return valor
}

const admin = createClient(ambiente('SUPABASE_URL'), ambiente('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Autenticação é por token (Authorization: Bearer), não por cookie — liberar a origem não abre nada.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const resposta = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'content-type': 'application/json' } })

const erro = (status: number, mensagem: string) => resposta(status, { erro: mensagem })

/** Erro do Auth → mensagem de domínio. O resto vira genérico (sem vazar detalhe interno). */
function traduzir(e: { message?: string } | null): Response {
  const msg = e?.message ?? ''
  if (/already (been )?registered|already exists/i.test(msg)) return erro(409, 'Este e-mail já está cadastrado.')
  if (/password/i.test(msg)) return erro(400, 'Senha recusada pelo servidor. Use de 8 a 72 caracteres.')
  console.error('usuarios:', msg)
  return erro(500, 'Não foi possível concluir. Tente de novo.')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return erro(405, 'Método não permitido.')

  // --- Quem está chamando? -------------------------------------------------
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const { data: sessao, error: erroSessao } = await admin.auth.getUser(token)
  if (erroSessao || !sessao.user) return erro(401, 'Sessão inválida. Entre de novo.')
  if (!ehMaster(sessao.user)) return erro(403, 'Só o administrador pode fazer isso.')
  const chamador = sessao.user

  let corpo: Record<string, unknown>
  try {
    corpo = await req.json()
  } catch {
    return erro(400, 'Dados inválidos.')
  }

  switch (corpo?.acao) {
    case 'listar': {
      // ponytail: uma página de até 1000 contas; paginar quando o sistema passar disso.
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (error) return traduzir(error)
      const ids = data.users.map((u) => u.id)
      const { data: perfis } = await admin.from('profiles').select('id, full_name').in('id', ids)
      const nomes = new Map((perfis ?? []).map((p) => [p.id as string, p.full_name as string]))
      const usuarios = data.users
        .map((u) => ({
          id: u.id,
          email: u.email ?? '',
          nome: nomes.get(u.id) ?? u.email ?? '',
          criadoEm: u.created_at,
          ultimoAcesso: u.last_sign_in_at ?? null,
          master: ehMaster(u),
        }))
        .toSorted((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      return resposta(200, { usuarios })
    }

    case 'criar': {
      const v = validarCriar(corpo)
      if (!v.ok) return erro(400, v.erro)
      // email_confirm: o master entrega a senha provisória; não há e-mail de confirmação a esperar.
      // full_name no user_metadata alimenta o gatilho handle_new_user (perfil + workspace + board).
      const { error } = await admin.auth.admin.createUser({
        email: v.dados.email,
        password: v.dados.senha,
        email_confirm: true,
        user_metadata: { full_name: v.dados.nome },
      })
      return error ? traduzir(error) : resposta(201, { ok: true })
    }

    case 'editar': {
      const v = validarEditar(corpo)
      if (!v.ok) return erro(400, v.erro)
      const { id, nome, email, senha } = v.dados
      const { error } = await admin.auth.admin.updateUserById(id, {
        ...(email && { email, email_confirm: true }),
        ...(senha && { password: senha }),
        ...(nome && { user_metadata: { full_name: nome } }),
      })
      if (error) return traduzir(error)
      // O app lê o nome de profiles (Sidebar, responsáveis, feed), não do user_metadata.
      if (nome) {
        const { error: erroPerfil } = await admin.from('profiles').update({ full_name: nome }).eq('id', id)
        if (erroPerfil) return traduzir(erroPerfil)
      }
      return resposta(200, { ok: true })
    }

    case 'excluir': {
      const id = typeof corpo.id === 'string' ? corpo.id : ''
      // O e-mail de confirmação é conferido contra o do BANCO, nunca contra algo que veio no corpo.
      const { data: alvo, error: erroAlvo } = await admin.auth.admin.getUserById(id)
      if (erroAlvo || !alvo.user) return erro(404, 'Usuário não encontrado.')
      const v = validarExcluir(corpo, chamador.id, { id: alvo.user.id, email: alvo.user.email })
      if (!v.ok) return erro(400, v.erro)
      // Cascades (0001): perfil → workspace → boards/tarefas; comentários da pessoa em qualquer board.
      const { error } = await admin.auth.admin.deleteUser(v.dados.id)
      return error ? traduzir(error) : resposta(200, { ok: true })
    }

    default:
      return erro(400, 'Ação desconhecida.')
  }
})
