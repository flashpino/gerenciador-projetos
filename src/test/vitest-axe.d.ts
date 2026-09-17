import 'vitest'
import type { AxeMatchers } from 'vitest-axe'

/**
 * vitest-axe@0.1.0 tipa seu matcher pela convenção antiga
 * (`declare global { namespace Vi { interface Assertion } }`), mas esta
 * versão do Vitest usa `declare module 'vitest'` (mesma convenção que
 * @testing-library/jest-dom/types/vitest.d.ts já usa neste projeto, e que
 * FUNCIONA — prova de que o problema é só do pacote vitest-axe). Sem isto,
 * `expect(...).toHaveNoViolations()` não tipa em lugar nenhum do projeto,
 * mesmo com `vitest-axe/extend-expect` importado.
 */
declare module 'vitest' {
  interface Assertion<T = unknown> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
