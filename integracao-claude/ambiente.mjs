// Borda com o sistema de arquivos: configuração do usuário e vínculo do projeto.
// `fs` é injetado para testar sem tocar o disco.

import path from 'node:path'
import { ErroUso } from './comandos.mjs'

export const CAMINHO_CONFIG = (home) => path.join(home, '.config', 'gerenciador-projetos', 'config.json')
const NOME_VINCULO = '.gerenciador.json'
const CAMPOS = ['url', 'chave', 'email', 'senha']
const VARIAVEL = { url: 'GP_URL', chave: 'GP_CHAVE', email: 'GP_EMAIL', senha: 'GP_SENHA' }

/**
 * Configuração da conta: as variáveis GP_* sobrepõem o arquivo, campo a campo. Serve para outra
 * máquina ou conta: basta exportar as variáveis, sem gravar nada em disco.
 */
export function lerConfig({ env, home, fs }) {
  let arquivo = {}
  try {
    arquivo = JSON.parse(fs.readFileSync(CAMINHO_CONFIG(home), 'utf8'))
  } catch (erro) {
    if (erro?.code !== 'ENOENT') throw new ErroUso(`o arquivo de configuração (${CAMINHO_CONFIG(home)}) está corrompido: rode "gp configurar" de novo`)
  }
  const cfg = Object.fromEntries(CAMPOS.map((c) => [c, env[VARIAVEL[c]] ?? arquivo[c]]))
  return { cfg, faltando: CAMPOS.filter((c) => !cfg[c]) }
}

/** Grava só para o dono do arquivo (0600). No Windows o modo é ignorado: proteja a pasta do usuário. */
export function gravarConfig(cfg, { home, fs }) {
  fs.mkdirSync(path.dirname(CAMINHO_CONFIG(home)), { recursive: true })
  fs.writeFileSync(CAMINHO_CONFIG(home), JSON.stringify(cfg, null, 2), { mode: 0o600 })
}

/** O Claude pode estar numa subpasta do projeto: sobe até achar o vínculo. */
export function acharVinculo(dir, fs) {
  let atual = dir
  for (;;) {
    const caminho = path.join(atual, NOME_VINCULO)
    if (fs.existsSync(caminho)) {
      let vinculo
      try {
        vinculo = JSON.parse(fs.readFileSync(caminho, 'utf8'))
      } catch {
        throw new ErroUso(`${caminho} não é um JSON válido: apague-o e rode "gp vincular" de novo`)
      }
      if (!vinculo?.board) throw new ErroUso(`${caminho} não tem o campo "board": apague-o e rode "gp vincular" de novo`)
      return { vinculo, raiz: atual }
    }
    const pai = path.dirname(atual)
    if (pai === atual) return null
    atual = pai
  }
}
