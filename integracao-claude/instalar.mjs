#!/usr/bin/env node
// Copia a CLI e a skill para ~/.claude/skills/gerenciador-projetos/ — assim TODO projeto desta máquina
// (e qualquer sessão do Claude que use este ~/.claude) enxerga a skill. Rodar UMA vez por máquina/conta:
//   node integracao-claude/instalar.mjs            (instala em ~/.claude/skills)
//   node integracao-claude/instalar.mjs --destino <pasta>   (outro lugar, ex.: para copiar para outra máquina)
// Depois: node <destino>/gp.mjs configurar   (feito pelo humano, uma vez).

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const origem = path.dirname(fileURLToPath(import.meta.url))
const ARQUIVOS = ['gp.mjs', 'api.mjs', 'comandos.mjs', 'nucleo.mjs', 'ambiente.mjs', 'SKILL.md']

const i = process.argv.indexOf('--destino')
const destino = i > -1 && process.argv[i + 1] ? path.resolve(process.argv[i + 1]) : path.join(os.homedir(), '.claude', 'skills', 'gerenciador-projetos')

fs.mkdirSync(destino, { recursive: true })
for (const arquivo of ARQUIVOS) fs.copyFileSync(path.join(origem, arquivo), path.join(destino, arquivo))

process.stdout.write(`Instalado em ${destino}\n`)
process.stdout.write(`Próximo passo (uma vez, feito por você): node "${path.join(destino, 'gp.mjs')}" configurar\n`)
