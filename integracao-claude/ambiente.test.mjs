import { describe, expect, it } from 'vitest'
import { acharVinculo, CAMINHO_CONFIG, gravarConfig, lerConfig } from './ambiente.mjs'
import { ErroUso } from './comandos.mjs'

// path.join usa "\\" no Windows: o fs falso e as asserções comparam com separador normalizado.
const norm = (caminho) => caminho.replaceAll('\\', '/')

/** fs falso em memória: só o que ambiente.mjs usa. */
function fsFalso(arquivos = {}) {
  const gravados = []
  return {
    gravados,
    readFileSync: (caminho) => {
      if (!(norm(caminho) in arquivos)) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      return arquivos[norm(caminho)]
    },
    existsSync: (caminho) => norm(caminho) in arquivos,
    mkdirSync: (caminho) => gravados.push({ mkdir: caminho }),
    writeFileSync: (caminho, dados, opcoes) => gravados.push({ caminho, dados, opcoes }),
  }
}

const HOME = '/home/ana'
const cfgArquivo = { url: 'https://a.supabase.co', chave: 'k', email: 'bot@x.com', senha: 's' }

describe('lerConfig', () => {
  it('lê o arquivo de configuração do usuário', () => {
    const fs = fsFalso({ [norm(CAMINHO_CONFIG(HOME))]: JSON.stringify(cfgArquivo) })
    const { cfg, faltando } = lerConfig({ env: {}, home: HOME, fs })
    expect(cfg).toEqual(cfgArquivo)
    expect(faltando).toEqual([])
  })

  it('as variáveis GP_* sobrepõem o arquivo, campo a campo', () => {
    const fs = fsFalso({ [norm(CAMINHO_CONFIG(HOME))]: JSON.stringify(cfgArquivo) })
    const { cfg } = lerConfig({ env: { GP_EMAIL: 'outro@x.com', GP_SENHA: 'nova' }, home: HOME, fs })
    expect(cfg).toMatchObject({ email: 'outro@x.com', senha: 'nova', url: cfgArquivo.url })
  })

  it('funciona só com variáveis de ambiente (sem arquivo), útil em outra máquina/CI', () => {
    const { cfg, faltando } = lerConfig({ env: { GP_URL: 'u', GP_CHAVE: 'k', GP_EMAIL: 'e', GP_SENHA: 's' }, home: HOME, fs: fsFalso() })
    expect(cfg.url).toBe('u')
    expect(faltando).toEqual([])
  })

  it('diz exatamente o que falta', () => {
    const { faltando } = lerConfig({ env: { GP_URL: 'u' }, home: HOME, fs: fsFalso() })
    expect(faltando).toEqual(['chave', 'email', 'senha'])
  })

  it('arquivo de configuração corrompido é erro claro, não um "undefined" adiante', () => {
    const fs = fsFalso({ [norm(CAMINHO_CONFIG(HOME))]: '{ quebrado' })
    expect(() => lerConfig({ env: {}, home: HOME, fs })).toThrow(ErroUso)
  })
})

describe('gravarConfig', () => {
  it('cria a pasta e grava com permissão só do dono (0600)', () => {
    const fs = fsFalso()
    gravarConfig(cfgArquivo, { home: HOME, fs })
    expect(norm(fs.gravados[0].mkdir)).toContain('gerenciador-projetos')
    const gravacao = fs.gravados[1]
    expect(norm(gravacao.caminho)).toBe(norm(CAMINHO_CONFIG(HOME)))
    expect(gravacao.opcoes).toMatchObject({ mode: 0o600 })
    expect(JSON.parse(gravacao.dados)).toEqual(cfgArquivo)
  })
})

describe('acharVinculo', () => {
  const vinculo = { board: 'b-1', nome: 'Sprint', workspace: 'w-1' }

  it('acha o .gerenciador.json na própria pasta', () => {
    const fs = fsFalso({ '/proj/.gerenciador.json': JSON.stringify(vinculo) })
    const r = acharVinculo('/proj', fs)
    expect(r.vinculo).toEqual(vinculo)
    expect(norm(r.raiz)).toBe('/proj')
  })

  it('sobe pastas até achar (o Claude pode estar numa subpasta do projeto)', () => {
    const fs = fsFalso({ '/proj/.gerenciador.json': JSON.stringify(vinculo) })
    const r = acharVinculo('/proj/src/componentes', fs)
    expect(r.vinculo).toEqual(vinculo)
    expect(norm(r.raiz)).toBe('/proj')
  })

  it('sem vínculo em lugar nenhum devolve null', () => {
    expect(acharVinculo('/proj/src', fsFalso())).toBeNull()
  })

  it('vínculo corrompido é erro claro (não some em silêncio e cai em outro board)', () => {
    const fs = fsFalso({ '/proj/.gerenciador.json': '{ x' })
    expect(() => acharVinculo('/proj', fs)).toThrow(/gerenciador\.json/)
  })

  it('vínculo sem o campo board é erro', () => {
    const fs = fsFalso({ '/proj/.gerenciador.json': JSON.stringify({ nome: 'x' }) })
    expect(() => acharVinculo('/proj', fs)).toThrow(/board/)
  })
})
