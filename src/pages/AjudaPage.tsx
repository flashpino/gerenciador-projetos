import { PERGUNTAS } from '@/lib/ajuda'

/**
 * Estática: não há consulta, logo não há os quatro estados nem StateView
 * (mesmo caso de ModelosPage). <details> nativo dá teclado e leitor de tela
 * sem estado nem componente novo.
 */
export default function AjudaPage() {
  return (
    <div className="mx-auto max-w-3xl p-gutter md:p-margin">
      <h1 className="mb-gutter text-display">Ajuda</h1>
      <div className="flex flex-col gap-space-sm">
        {PERGUNTAS.map((p) => (
          <details key={p.pergunta} className="glass group rounded-card px-space-lg">
            <summary className="min-h-touch cursor-pointer list-none py-space-sm text-title text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              {p.pergunta}
            </summary>
            <p className="pb-space-md text-body text-ink-muted">{p.resposta}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
