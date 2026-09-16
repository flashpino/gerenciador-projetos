import { Badge } from '@/components/ui/Badge'
import { type ItemMenu, Menu } from '@/components/ui/Menu'
import { ORDEM_STATUS, PRIORIDADE, PRIORIDADES, STATUS } from '@/lib/status'
import type { TaskPriority, TaskStatus } from '@/types/domain'

interface PropsGenerica<T extends string> {
  valor: T
  opcoes: readonly T[]
  mapa: Record<T, { rotulo: string; classe: string }>
  /** Vai para o aria-label: "Status de Refatorar arquitetura". */
  rotuloCampo: string
  nomeTarefa: string
  aoMudar: (novo: T) => void
  bleed?: boolean
}

/**
 * Celula que edita um enum do banco (status, prioridade) via menu.
 *
 * Status e prioridade eram dois componentes na primeira versao. Sao o MESMO
 * comportamento — nao apenas aparencia parecida — entao viraram um. Os wrappers
 * abaixo existem so para o call site ler como dominio, e custam 6 linhas cada.
 *
 * O rotulo em TEXTO vive dentro do badge: cor sozinha reprova em WCAG 1.4.1 e
 * nao diz nada a leitor de tela. O par fundo+texto vem do token, que e o que
 * garante os 4.5:1 validados pelo check-contrast.
 */
function EnumCell<T extends string>({
  valor, opcoes, mapa, rotuloCampo, nomeTarefa, aoMudar, bleed = false,
}: PropsGenerica<T>) {
  const items: ItemMenu[] = opcoes.map((op) => ({
    id: op,
    rotulo: <Badge tone={mapa[op].classe}>{mapa[op].rotulo}</Badge>,
    rotuloTexto: mapa[op].rotulo,
    selecionado: op === valor,
    aoEscolher: () => aoMudar(op),
  }))

  return (
    <Menu
      rotulo={`${rotuloCampo} de ${nomeTarefa}`}
      items={items}
      trigger={(p) => (
        <button
          {...p}
          type="button"
          className={
            bleed
              ? 'flex h-full min-h-touch w-full items-center justify-center hover:brightness-105 md:min-h-0'
              : 'inline-flex min-h-touch items-center md:min-h-0'
          }
        >
          <span className="sr-only">
            {rotuloCampo} de {nomeTarefa}: {mapa[valor].rotulo}. Alterar
          </span>
          <Badge tone={mapa[valor].classe} bleed={bleed} className="pointer-events-none">
            <span aria-hidden="true">{mapa[valor].rotulo}</span>
          </Badge>
        </button>
      )}
    />
  )
}

interface PropsCelula<T> {
  valor: T
  nomeTarefa: string
  aoMudar: (novo: T) => void
  bleed?: boolean
}

export const StatusCell = (p: PropsCelula<TaskStatus>) => (
  <EnumCell {...p} opcoes={ORDEM_STATUS} mapa={STATUS} rotuloCampo="Status" />
)

export const PriorityCell = (p: PropsCelula<TaskPriority>) => (
  <EnumCell {...p} opcoes={PRIORIDADES} mapa={PRIORIDADE} rotuloCampo="Prioridade" />
)
