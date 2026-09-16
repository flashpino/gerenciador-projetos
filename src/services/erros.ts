/**
 * Formato unico de erro da camada de dados.
 *
 * Toda feature trata o mesmo tipo. Sem isto, cada tela inventa o proprio jeito
 * de ler o erro do Supabase e metade esquece de tratar algum caso.
 */
export class ErroDeDados extends Error {
  // Campo explicito: `erasableSyntaxOnly` (tsconfig) proibe parameter properties.
  readonly causa: unknown

  constructor(message: string, causa?: unknown) {
    super(message)
    this.name = 'ErroDeDados'
    this.causa = causa
  }
}

/**
 * Traduz o erro do PostgREST para algo que o usuario entende.
 *
 * NUNCA repassa a mensagem crua do banco para a tela: ela vaza nome de tabela,
 * de constraint e de coluna. Isso e reconhecimento de superficie de graca para
 * quem estiver olhando.
 */
export function traduzirErro(erro: { code?: string; message?: string } | null): ErroDeDados {
  const code = erro?.code

  // Violacoes de constraint viram mensagem de dominio (validacao do servidor).
  if (code === '23514') {
    return new ErroDeDados('Os dados informados não são válidos. Confira as datas e o título.', erro)
  }
  if (code === '23505') {
    return new ErroDeDados('Esse registro já existe.', erro)
  }
  if (code === '42501' || code === 'PGRST301') {
    return new ErroDeDados('Você não tem permissão para isso.', erro)
  }
  if (code === 'PGRST116') {
    return new ErroDeDados('Registro não encontrado.', erro)
  }
  return new ErroDeDados('Não foi possível completar a operação. Tente de novo.', erro)
}
