/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // O caminho do projeto contem um espaco ("gerenciador projetos"). O pool
    // padrao (forks) serializa esse caminho como URL e o worker nao sobe no
    // Windows. O pool de threads nao tem esse problema.
    pool: 'threads',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/types/**',
        'src/main.tsx',
        'src/**/*.d.ts',
      ],
      // Portao de cobertura do caminho critico (CLAUDE.md), nao global:
      // logica pura e os hooks de dados. Componentes de apresentacao e
      // bootstrap ficam de fora — sao cobertos por teste de role, nao por %.
      // services/ entra quando tiver teste: hoje esta em 0%.
      // branches fica de fora de proposito: src/lib esta em 65% e src/hooks em
      // 62%. Subir exige teste novo; baixar o numero seria consertar o portao
      // em vez do codigo.
      thresholds: {
        'src/lib/**': { statements: 80, functions: 80, lines: 80 },
        'src/hooks/**': { statements: 80, functions: 80, lines: 80 },
      },
    },
  },
})
