/**
 * Portao de contraste WCAG 2.2 AA.
 *
 * Le os pares fundo/texto DIRETO de src/styles/tokens.css. Nao existe lista
 * duplicada aqui: se um token mudar, este script ve a mudanca. E o que impede
 * "acessibilidade" de virar um comentario que envelheceu.
 *
 * Convencao que o script explora: todo token --color-X que tem um par
 * --color-X-fg e um fundo com texto por cima, e o par precisa bater 4.5:1.
 */
import { readFileSync } from 'node:fs'

const AA_TEXTO = 4.5
const AA_COMPONENTE = 3.0
const TOKENS = 'src/styles/tokens.css'

function rgb(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16) / 255)
}

function luminance(hex) {
  const [r, g, b] = rgb(hex).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Razao de contraste WCAG entre duas cores hex. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** @returns {Record<string,string>} todos os --color-* do tokens.css */
function lerTokens() {
  const css = readFileSync(TOKENS, 'utf8')
  const out = {}
  for (const m of css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    out[m[1]] = m[2]
  }
  return out
}

// Relatorio so roda quando o arquivo e executado direto (permite importar contrast()).
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('check-contrast.mjs')) {
  const t = lerTokens()
  const checagens = []

  // 1. Pares fundo/-fg, descobertos automaticamente
  for (const nome of Object.keys(t)) {
    if (!nome.endsWith('-fg')) continue
    const base = nome.slice(0, -3)
    if (t[base]) checagens.push([`${base} + ${nome}`, t[nome], t[base], AA_TEXTO])
  }

  // 2. Texto sobre as superficies do app
  for (const [sup, supNome] of [[t.surface, 'surface'], [t.canvas, 'canvas'], [t['surface-2'], 'surface-2']]) {
    checagens.push([`ink sobre ${supNome}`, t.ink, sup, AA_TEXTO])
    checagens.push([`ink-muted sobre ${supNome}`, t['ink-muted'], sup, AA_TEXTO])
  }
  checagens.push(['danger-ink sobre danger-soft', t['danger-ink'], t['danger-soft'], AA_TEXTO])
  checagens.push(['sidebar-fg sobre sidebar', t['sidebar-fg'], t.sidebar, AA_TEXTO])
  checagens.push(['sidebar-fg-muted sobre sidebar', t['sidebar-fg-muted'], t.sidebar, AA_TEXTO])

  // 3. Limites de componente e foco: 3:1 (WCAG 1.4.11)
  // Limites e anel de foco precisam passar em TODAS as superficies onde aparecem,
  // nao so na mais clara. Foi assim que #b9bfd0 passou despercebido na primeira versao.
  for (const [nome, bg] of [['surface', t.surface], ['canvas', t.canvas], ['surface-2', t['surface-2']]]) {
    checagens.push([`border-strong sobre ${nome}`, t['border-strong'], bg, AA_COMPONENTE])
    checagens.push([`anel de foco (primary) sobre ${nome}`, t.primary, bg, AA_COMPONENTE])
  }

  const falhas = []
  for (const [label, fg, bg, min] of checagens) {
    if (!fg || !bg) { falhas.push(`token ausente em "${label}"`); continue }
    const r = contrast(fg, bg)
    if (r < min) falhas.push(`${label}: ${r.toFixed(2)}:1 (minimo ${min}:1)  ${fg} sobre ${bg}`)
  }

  if (falhas.length === 0) {
    console.log(`check-contrast: ok — ${checagens.length} pares em WCAG 2.2 AA`)
    process.exit(0)
  }
  console.error(`check-contrast: ${falhas.length} par(es) abaixo do minimo\n`)
  for (const f of falhas) console.error(`  ${f}`)
  console.error('\nCorrija em src/styles/tokens.css. Acessibilidade nao e negociavel (CLAUDE.md).')
  process.exit(1)
}
