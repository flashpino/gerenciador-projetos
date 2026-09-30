import { useEffect, useState } from 'react'

const CHAVE = 'pwa-instalar-dispensado'

// Só o Chromium dispara; o TypeScript não traz o tipo no lib.dom.
interface EventoInstalar extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// localStorage lança em modo privado / storage bloqueado: aí o aviso só volta
// na próxima visita, e nada quebra (mesma decisão de src/lib/ultimoBoard.ts).
function jaDispensado(): boolean {
  try {
    return localStorage.getItem(CHAVE) !== null
  } catch {
    return false
  }
}

/**
 * Como oferecer a instalação:
 * - `botao`: o navegador deu o evento (Chrome/Edge no Android) → nosso botão abre a janela nativa.
 * - `ios`: iPhone/iPad — o Safari não tem o evento; só dá pelo Compartilhar → Tela de Início.
 * - `manual`: outro celular sem o evento → instrução pelo menu do navegador.
 * - `nenhum`: computador (o app é para o celular), já instalado, ou a pessoa dispensou.
 */
type ModoInstalar = 'nenhum' | 'botao' | 'ios' | 'manual'

// iPadOS se apresenta como Mac: o toque (maxTouchPoints) desfaz o disfarce.
const ehIos = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

export function useInstalarApp() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null)
  const [dispensado, setDispensado] = useState(jaDispensado)
  const [acabouDeInstalar, setAcabouDeInstalar] = useState(false)

  useEffect(() => {
    const guardar = (e: Event) => {
      e.preventDefault() // segura o mini-infobar; o aviso é nosso
      setEvento(e as EventoInstalar)
    }
    const descartar = () => {
      setEvento(null)
      setAcabouDeInstalar(true)
    }
    window.addEventListener('beforeinstallprompt', guardar)
    window.addEventListener('appinstalled', descartar)
    return () => {
      window.removeEventListener('beforeinstallprompt', guardar)
      window.removeEventListener('appinstalled', descartar)
    }
  }, [])

  const instalado =
    acabouDeInstalar ||
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  // Toque como ponteiro principal = celular/tablet. O computador não recebe o aviso.
  const celular = window.matchMedia('(pointer: coarse)').matches

  async function instalar() {
    if (!evento) return
    await evento.prompt()
    await evento.userChoice
    setEvento(null) // o navegador não deixa reusar, aceito ou recusado
  }

  function dispensar() {
    try {
      localStorage.setItem(CHAVE, '1')
    } catch {
      // idem jaDispensado
    }
    setDispensado(true)
  }

  const modo: ModoInstalar =
    instalado || dispensado || !celular ? 'nenhum' : evento ? 'botao' : ehIos() ? 'ios' : 'manual'

  return { modo, instalar, dispensar }
}
