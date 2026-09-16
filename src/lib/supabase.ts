import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase. UNICO modulo do app que instancia isso.
 *
 * A anon key vai embutida no bundle e e VISIVEL para qualquer usuario. Isso e
 * por design e e seguro *desde que* o RLS esteja ativo em todas as tabelas
 * (docs/data-model.md). A SERVICE_ROLE_KEY jamais entra aqui: ela ignora RLS.
 *
 * `npm run arch` falha o build se este modulo for importado fora de src/services/.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Falha alto e cedo. Sem isto, a primeira query devolve "Invalid API key" e
  // o erro aparece a tres camadas de distancia da causa.
  throw new Error(
    'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nao estao definidas. ' +
      'Copie .env.example para .env.local e preencha. ' +
      'Lembre: variavel do Vite e resolvida em BUILD TIME — reinicie o dev server.',
  )
}

export const supabase = createClient(url, anonKey)
