import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

interface Props { children: ReactNode }
interface State { erro: Error | null }

/**
 * Captura erro de render em qualquer ponto da arvore.
 *
 * Sem isto, um erro em qualquer componente apaga a tela inteira e o usuario ve
 * branco. O fallback NAO recarrega a pagina: recarregar perde o que a pessoa
 * estava fazendo. Ele so limpa o erro e tenta renderizar de novo.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { erro: null }

  static getDerivedStateFromError(erro: Error): State {
    return { erro }
  }

  override componentDidCatch(erro: Error, info: ErrorInfo) {
    // Sem sistema de logging na v1 (docs/specs.md, fora de escopo).
    console.error('Erro nao tratado na arvore React:', erro, info.componentStack)
  }

  override render() {
    if (!this.state.erro) return this.props.children

    return (
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-space-md p-margin text-center">
        <h1 className="text-headline">Algo deu errado nesta tela</h1>
        <p className="text-body text-ink-muted">
          O resto do aplicativo continua funcionando. Voce pode tentar renderizar de novo.
        </p>
        <Button variant="primary" onClick={() => this.setState({ erro: null })}>
          Tentar de novo
        </Button>
      </div>
    )
  }
}
