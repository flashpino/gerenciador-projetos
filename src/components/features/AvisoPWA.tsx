import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/Button'
import { useInstalarApp } from '@/hooks/useInstalarApp'

/**
 * Barra do rodapé com no máximo um aviso: versão nova (prioridade) ou instalar.
 * Montada uma vez em App.tsx, fora das rotas. Spec: 2026-09-29-pwa-design.md.
 */
export function AvisoPWA() {
  const {
    needRefresh: [temVersaoNova],
    updateServiceWorker,
  } = useRegisterSW()
  const { podeInstalar, instalar, dispensar } = useInstalarApp()
  const [adiado, setAdiado] = useState(false)

  const aviso =
    temVersaoNova && !adiado
      ? {
          texto: 'Nova versão disponível',
          secundario: { rotulo: 'Depois', acao: () => setAdiado(true) },
          principal: { rotulo: 'Recarregar', acao: () => void updateServiceWorker(true) },
        }
      : podeInstalar
        ? {
            texto: 'Instalar o app no seu dispositivo',
            secundario: { rotulo: 'Agora não', acao: dispensar },
            principal: { rotulo: 'Instalar', acao: () => void instalar() },
          }
        : null

  if (!aviso) return null

  return (
    <output
      className="fixed inset-x-gutter bottom-gutter z-40 flex flex-wrap items-center gap-space-sm glass-strong rounded-card p-space-md pl-space-lg shadow-overlay md:left-auto md:right-margin md:bottom-margin"
    >
      <p className="flex-1 text-body text-ink">{aviso.texto}</p>
      <Button size="sm" variant="ghost" onClick={aviso.secundario.acao}>
        {aviso.secundario.rotulo}
      </Button>
      <Button size="sm" variant="primary" onClick={aviso.principal.acao}>
        {aviso.principal.rotulo}
      </Button>
    </output>
  )
}
