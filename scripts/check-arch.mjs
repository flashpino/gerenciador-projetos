/**
 * Guarda de arquitetura — deterministico, roda em ms, custa zero token.
 * Torna executaveis as regras que o manual (Fases 4.1, 6.4 e Anexo C) manda auditar.
 *
 * Verifica 3 fronteiras:
 *  1. Supabase so e importado dentro de src/services/ (+ o modulo que cria o client)
 *  2. src/components/ui/ nao conhece dominio (nao importa features/services/hooks)
 *  3. Nenhuma cor hardcoded fora de src/styles/ (erro n.2 do Anexo C)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const SRC = 'src'
const CLIENT_MODULE = join('src', 'lib', 'supabase.ts')

/** @returns {string[]} todos os .ts/.tsx sob dir */
function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return /\.tsx?$/.test(full) ? [full] : []
  })
}

const violations = []
const add = (file, line, rule, msg) => violations.push({ file, line, rule, msg })

for (const file of walk(SRC)) {
  const rel = relative('.', file)
  const posix = rel.split(sep).join('/')
  const isTest = /\.test\.tsx?$/.test(posix) || posix.startsWith('src/test/')
  const lines = readFileSync(file, 'utf8').split('\n')

  lines.forEach((text, i) => {
    const line = i + 1

    // 1. Supabase fora da camada de servicos
    const importsSupabase =
      /from\s+['"]@supabase\/supabase-js['"]/.test(text) ||
      /from\s+['"].*lib\/supabase['"]/.test(text) ||
      /from\s+['"]@\/lib\/supabase['"]/.test(text)
    const allowedSupabase =
      posix.startsWith('src/services/') || rel === CLIENT_MODULE || isTest
    if (importsSupabase && !allowedSupabase) {
      add(rel, line, 'supabase-fora-de-services',
        'Supabase so pode ser importado em src/services/. A UI fala com hooks, hooks falam com services.')
    }

    // 2. Primitivo de UI conhecendo dominio
    if (posix.startsWith('src/components/ui/') && !isTest) {
      const m = text.match(/from\s+['"](.*?)['"]/)
      const spec = m?.[1] ?? ''
      if (/(^|\/)(features|services|hooks)\//.test(spec)) {
        add(rel, line, 'ui-conhece-dominio',
          `Primitivo importa "${spec}". src/components/ui/ e generico: sem regra de negocio, sem dados.`)
      }
    }

    // 3. Cor hardcoded fora dos tokens
    if (!posix.startsWith('src/styles/') && !isTest) {
      const hex = text.match(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}(?:[0-9a-fA-F]{2})?)?\b/)
      if (hex && !/\/\/|\/\*|\*/.test(text.trimStart().slice(0, 2))) {
        add(rel, line, 'cor-hardcoded',
          `Cor "${hex[0]}" fora de src/styles/. Use um token de tokens.css.`)
      }
    }
  })
}

if (violations.length === 0) {
  console.log('check-arch: ok — 3 fronteiras respeitadas')
  process.exit(0)
}

console.error(`check-arch: ${violations.length} violacao(oes)\n`)
for (const v of violations) console.error(`  ${v.file}:${v.line}  [${v.rule}]\n    ${v.msg}`)
process.exit(1)
