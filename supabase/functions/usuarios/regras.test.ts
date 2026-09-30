import { describe, expect, it } from 'vitest'
import { ehMaster, validarCriar, validarEditar, validarExcluir } from './regras'

const ID = '0f8b2c1e-3d4a-4b5c-8d9e-0a1b2c3d4e5f'

describe('ehMaster — quem pode administrar contas', () => {
  it('só quem tem role "master" no app_metadata (gravado pelo servidor)', () => {
    expect(ehMaster({ app_metadata: { role: 'master' } })).toBe(true)
    expect(ehMaster({ app_metadata: {} })).toBe(false)
    expect(ehMaster(null)).toBe(false)
  })
  it('user_metadata NÃO conta: qualquer pessoa edita o próprio user_metadata', () => {
    expect(ehMaster({ app_metadata: {}, user_metadata: { role: 'master' } })).toBe(false)
  })
})

describe('validarCriar', () => {
  it('aceita e normaliza (e-mail em minúsculas, espaços cortados)', () => {
    expect(validarCriar({ email: '  Ana@Exemplo.dev ', nome: ' Ana Lima ', senha: 'provisoria1' })).toEqual({
      ok: true,
      dados: { email: 'ana@exemplo.dev', nome: 'Ana Lima', senha: 'provisoria1' },
    })
  })
  it.each([
    [{ email: 'sem-arroba', nome: 'Ana', senha: 'provisoria1' }, 'E-mail inválido.'],
    [{ email: 'ana@x.dev', nome: '   ', senha: 'provisoria1' }, 'O nome não pode ficar vazio.'],
    [{ email: 'ana@x.dev', nome: 'Ana', senha: 'curta' }, 'A senha precisa ter entre 8 e 72 caracteres.'],
    [{ email: 'ana@x.dev', nome: 'Ana' }, 'A senha precisa ter entre 8 e 72 caracteres.'],
    [null, 'Dados inválidos.'],
  ])('recusa %j', (entrada, erro) => {
    expect(validarCriar(entrada)).toEqual({ ok: false, erro })
  })
})

describe('validarEditar', () => {
  it('aceita só o que veio (nome, e-mail e/ou senha nova)', () => {
    expect(validarEditar({ id: ID, nome: 'Ana Souza' })).toEqual({ ok: true, dados: { id: ID, nome: 'Ana Souza' } })
  })
  it('recusa id que não é uuid', () => {
    expect(validarEditar({ id: '1; drop table', nome: 'Ana' })).toEqual({ ok: false, erro: 'Usuário inválido.' })
  })
  it('recusa quando não há nada para mudar', () => {
    expect(validarEditar({ id: ID })).toEqual({ ok: false, erro: 'Nada para alterar.' })
  })
  it('senha nova segue a mesma regra do cadastro', () => {
    expect(validarEditar({ id: ID, senha: '123' })).toEqual({ ok: false, erro: 'A senha precisa ter entre 8 e 72 caracteres.' })
  })
})

describe('validarExcluir', () => {
  const alvo = { id: ID, email: 'beto@exemplo.dev' }

  it('exige digitar o e-mail da conta (sem diferenciar maiúsculas)', () => {
    expect(validarExcluir({ id: ID, confirmacao: 'BETO@exemplo.dev' }, 'outro-id', alvo)).toEqual({ ok: true, dados: { id: ID } })
    expect(validarExcluir({ id: ID, confirmacao: 'beto' }, 'outro-id', alvo)).toEqual({
      ok: false,
      erro: 'Digite o e-mail da conta para confirmar.',
    })
  })
  it('o master não exclui a si mesmo (ficaria sem ninguém para administrar)', () => {
    expect(validarExcluir({ id: ID, confirmacao: 'beto@exemplo.dev' }, ID, alvo)).toEqual({
      ok: false,
      erro: 'Você não pode excluir a própria conta.',
    })
  })
})
