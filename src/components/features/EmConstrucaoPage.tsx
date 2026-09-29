import { StateView, type Estado } from '@/components/ui/StateView'

interface Props {
  titulo: string
  descricao: string
}

/**
 * Uma página, montada em 7 rotas (Meus Painéis, Favoritos, Atividades,
 * Notificações, Ajuda, Configurações — docs/superpowers/specs/
 * 2026-09-17-casca-sidebar-design.md). Cada sub-projeto futuro substitui a
 * sua própria rota por conteúdo real, sem tocar nas outras 6.
 */
export function EmConstrucaoPage({ titulo, descricao }: Props) {
  const estado: Estado = { tipo: 'vazio', titulo, descricao }

  return (
    <div className="mx-auto max-w-canvas p-gutter md:p-margin">
      <StateView estado={estado}>{null}</StateView>
    </div>
  )
}
