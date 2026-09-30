import { Button } from './Button'

interface Props {
  /** Erro da mutação: vira alerta acima dos botões. */
  erro: Error | null
  rotuloEnviar: string
  variante?: 'primary' | 'danger'
  enviando: boolean
  desabilitado?: boolean
  aoCancelar: () => void
}

/**
 * Rodapé comum dos formulários em modal: erro em `role="alert"` + Cancelar + enviar (submit).
 * Extraído na 5ª ocorrência (BoardForm, GrupoForm, UsuarioForm, ExcluirBoard, ExcluirUsuario) —
 * regra dos três, sinalizada pelo jscpd.
 */
export function AcoesDoFormulario({ erro, rotuloEnviar, variante = 'primary', enviando, desabilitado, aoCancelar }: Props) {
  return (
    <>
      {erro && (
        <p role="alert" className="rounded bg-danger-soft px-space-md py-space-sm text-body text-danger-ink">
          {erro.message}
        </p>
      )}

      <div className="flex justify-end gap-space-sm">
        <Button variant="secondary" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit" variant={variante} loading={enviando} disabled={desabilitado}>
          {rotuloEnviar}
        </Button>
      </div>
    </>
  )
}
