import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { contarFiltros, SEM_RESPONSAVEL, type FiltroTarefas } from '@/lib/filtro'
import { ORDEM_STATUS, PRIORIDADE, PRIORIDADES, STATUS } from '@/lib/status'
import type { Profile } from '@/types/domain'

interface Props {
  aberto: boolean
  aoFechar: () => void
  filtro: FiltroTarefas
  /** Aplica na hora (o estado é a URL); não há botão "Aplicar". */
  aoMudar: (parcial: Partial<FiltroTarefas>) => void
  membros: Profile[]
}

/** Liga/desliga `valor` numa lista, sem repetir e sem mexer na original. */
const alternar = <T,>(lista: T[], valor: T, ligado: boolean): T[] =>
  ligado ? [...lista, valor] : lista.filter((v) => v !== valor)

export function FiltroTarefasModal({ aberto, aoFechar, filtro, aoMudar, membros }: Props) {
  const opcoesResponsavel = [
    { value: '', label: 'Qualquer pessoa' },
    { value: SEM_RESPONSAVEL, label: 'Sem responsável' },
    ...membros.map((m) => ({ value: m.id, label: m.full_name })),
  ]

  return (
    <Modal
      open={aberto}
      onClose={aoFechar}
      title="Filtrar tarefas"
      footer={
        <>
          <Button
            variant="secondary"
            disabled={contarFiltros(filtro) === 0}
            onClick={() => aoMudar({ status: [], prioridade: [], responsavel: null, atrasadas: false })}
          >
            Limpar filtros
          </Button>
          <Button variant="primary" onClick={aoFechar}>
            Concluir
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-space-lg">
        <fieldset className="flex flex-col gap-space-sm">
          <legend className="mb-space-sm text-label text-ink-muted">Status</legend>
          {ORDEM_STATUS.map((s) => (
            <Checkbox
              key={s}
              label={STATUS[s].rotulo}
              checked={filtro.status.includes(s)}
              onChange={(v) => aoMudar({ status: alternar(filtro.status, s, v) })}
            />
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-space-sm">
          <legend className="mb-space-sm text-label text-ink-muted">Prioridade</legend>
          {PRIORIDADES.map((p) => (
            <Checkbox
              key={p}
              label={PRIORIDADE[p].rotulo}
              checked={filtro.prioridade.includes(p)}
              onChange={(v) => aoMudar({ prioridade: alternar(filtro.prioridade, p, v) })}
            />
          ))}
        </fieldset>

        <Field label="Responsável">
          <Select
            options={opcoesResponsavel}
            value={filtro.responsavel ?? ''}
            onChange={(e) => aoMudar({ responsavel: e.target.value || null })}
          />
        </Field>

        <Checkbox
          label="Somente atrasadas"
          checked={filtro.atrasadas}
          onChange={(v) => aoMudar({ atrasadas: v })}
        />
      </div>
    </Modal>
  )
}
