import { Link } from 'react-router-dom'

export default function NaoEncontrada() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-space-md p-margin text-center">
      <h1 className="text-headline">Pagina nao encontrada</h1>
      <p className="text-body text-ink-muted">O endereco acessado nao existe neste workspace.</p>
      <Link to="/" className="text-body font-semibold text-primary underline">
        Voltar para o quadro
      </Link>
    </main>
  )
}
