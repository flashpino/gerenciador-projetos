#!/usr/bin/env node
// gp — CLI que alimenta o Gerenciador de Projetos a partir de um plano.
// Zero dependências, Node >= 18. Guia: docs/integracao-claude.md · Spec: docs/superpowers/specs/2026-09-30-integracao-claude-design.md

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { Writable } from 'node:stream'
import { acharVinculo, CAMINHO_CONFIG, gravarConfig, lerConfig } from './ambiente.mjs'
import { criarApi, ErroApi } from './api.mjs'
import { ehComando, ErroUso, executar, parseArgs } from './comandos.mjs'

const NOME_VINCULO = '.gerenciador.json'

// CLI: escrever no terminal É o trabalho dela (stdout para resultado, stderr para erro).
const saida = (linha) => process.stdout.write(`${linha}\n`)
const erroNaTela = (linha) => process.stderr.write(`${linha}\n`)

/** Pergunta no terminal. `oculto` não ecoa o que se digita (senha). */
function perguntar(texto, { oculto = false } = {}) {
  return new Promise((resolver) => {
    let mudo = false
    const silenciavel = new Writable({
      write(pedaco, codificacao, pronto) {
        if (!mudo) process.stdout.write(pedaco, codificacao)
        pronto()
      },
    })
    const rl = readline.createInterface({ input: process.stdin, output: silenciavel, terminal: Boolean(process.stdin.isTTY) })
    process.stdout.write(texto)
    mudo = oculto
    rl.question('', (resposta) => {
      rl.close()
      if (oculto) process.stdout.write('\n')
      resolver(resposta.trim())
    })
  })
}

/** Roda uma vez por máquina, feito pelo HUMANO (o Claude não deve receber a senha). Só grava se o login funcionar. */
async function configurar() {
  const home = os.homedir()
  const atual = lerConfig({ env: {}, home, fs }).cfg
  saida('Configuração da conta que o Claude usa para alimentar o sistema (use uma conta DEDICADA, convidada no workspace).')
  saida(`O arquivo será gravado em ${CAMINHO_CONFIG(home)}, só legível por você.\n`)

  const url = (await perguntar(`URL do projeto Supabase${atual.url ? ` [${atual.url}]` : ''}: `)) || atual.url
  const chave = (await perguntar('Chave pública (publishable/anon) do projeto: ')) || atual.chave
  const email = (await perguntar(`E-mail da conta${atual.email ? ` [${atual.email}]` : ''}: `)) || atual.email
  const senha = await perguntar('Senha da conta (não aparece na tela): ', { oculto: true })
  if (!url || !chave || !email || !senha) throw new ErroUso('todos os campos são obrigatórios; nada foi gravado')

  const api = criarApi({ url, chave })
  await api.entrar(email, senha) // só grava se o login funcionar
  const perfil = await api.perfil()
  gravarConfig({ url, chave, email, senha }, { home, fs })
  saida(`\nOk: entrou como "${perfil?.full_name ?? email}". Configuração gravada.`)
  saida('Teste com: node gp.mjs eu')
}

async function principal() {
  if (typeof fetch !== 'function') throw new ErroUso('precisa de Node 18 ou mais novo (fetch nativo)')
  const args = parseArgs(process.argv.slice(2))

  if (args.comando === 'configurar') return configurar()
  if (!ehComando(args.comando)) throw new ErroUso(`comando desconhecido: "${args.comando}". Rode "gp ajuda".`)

  const cwd = process.cwd()
  const achado = args.comando === 'ajuda' ? null : acharVinculo(cwd, fs)
  const ctx = {
    saida,
    vinculo: achado?.vinculo ?? null,
    lerArquivo: (caminho) => fs.readFileSync(path.resolve(cwd, caminho), 'utf8'),
    gravarVinculo: (vinculo) => {
      const destino = path.join(achado?.raiz ?? cwd, NOME_VINCULO)
      fs.writeFileSync(destino, JSON.stringify(vinculo, null, 2) + '\n')
    },
  }

  if (args.comando !== 'ajuda') {
    const { cfg, faltando } = lerConfig({ env: process.env, home: os.homedir(), fs })
    if (faltando.length > 0) {
      throw new ErroUso(`configuração incompleta (falta: ${faltando.join(', ')}). Peça a quem administra o sistema para rodar "gp configurar" nesta máquina.`)
    }
    ctx.api = criarApi({ url: cfg.url, chave: cfg.chave })
    await ctx.api.entrar(cfg.email, cfg.senha)
  }
  await executar(args.comando, args, ctx)
}

principal().catch((erro) => {
  // Nunca imprime stack nem objeto cru: poderia carregar cabeçalhos de requisição. GP_DEBUG=1 mostra a mensagem original.
  if (erro instanceof ErroUso) {
    erroNaTela(erro.message)
    process.exit(2)
  }
  erroNaTela(`erro: ${erro instanceof ErroApi ? erro.message : `inesperado (${erro?.message ?? erro})`}`)
  process.exit(1)
})
