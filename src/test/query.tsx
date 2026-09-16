import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * Wrapper de teste para hooks de dados.
 * `retry: false` e obrigatorio: sem isso, um teste de caminho de erro espera os
 * 3 retries padrao do TanStack Query e estoura o timeout.
 */
export function criarWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return {
    client,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  }
}
