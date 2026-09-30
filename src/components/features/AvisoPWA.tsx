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
  const { modo, instalar, dispensar } = useInstalarApp()
  const [adiado, setAdiado] = useState(false)

  const aviso =
    temVersaoNova && !adiado
      ? {
          texto: 'Nova versão disponível',
          secundario: { rotulo: 'Depois', acao: () => setAdiado(true) },
          principal: { rotulo: 'Recarregar', acao: () => void updateServiceWorker(true) },
        }
      : modo === 'botao'
        ? {
            texto: 'Instalar o app no seu dispositivo',
            secundario: { rotulo: 'Agora não', acao: dispensar },
            principal: { rotulo: 'Instalar', acao: () => void instalar() },
          }
        : // Sem o evento do navegador não há botão possível: o jeito é ensinar o caminho.
          modo === 'ios' || modo === 'manual'
          ? {
              texto:
                modo === 'ios'
                  ? 'Para instalar: toque em Compartilhar e depois em "Adicionar à Tela de Início".'
                  : 'Para instalar: abra o menu ⋮ do navegador e toque em "Instalar app".',
              secundario: null,
              principal: { rotulo: 'Entendi', acao: dispensar },
            }
          : null

  if (!aviso) return null

  return (
    <output
      className="fixed inset-x-gutter bottom-gutter z-40 flex animate-entrar flex-wrap items-center gap-space-sm glass-strong rounded-card p-space-md pl-space-lg shadow-overlay md:left-auto md:right-margin md:bottom-margin"
    >
      <p className="flex-1 text-body text-ink">{aviso.texto}</p>
      {aviso.secundario && (
        <Button size="sm" variant="ghost" onClick={aviso.secundario.acao}>
          {aviso.secundario.rotulo}
        </Button>
      )}
      <Button size="sm" variant="primary" onClick={aviso.principal.acao}>
        {aviso.principal.rotulo}
      </Button>
    </output>
  )
}
