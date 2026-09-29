import { StateView, type Estado } from '@/components/ui/StateView'

interface Props {
  titulo: string
  descricao: string
}

/**
 * Uma página, montada nas rotas que ainda não têm conteúdo (Notificações,
 * Ajuda, Configurações). Cada sub-projeto futuro substitui a sua própria
 * rota por conteúdo real.
 */
export function EmConstrucaoPage({ titulo, descricao }: Props) {
  const estado: Estado = { tipo: 'vazio', titulo, descricao }

  return (
    <div className="mx-auto max-w-canvas p-gutter md:p-margin">
      <StateView estado={estado}>{null}</StateView>
    </div>
  )
}
