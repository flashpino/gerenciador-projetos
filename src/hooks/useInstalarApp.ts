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

export function useInstalarApp() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null)
  const [dispensado, setDispensado] = useState(jaDispensado)

  useEffect(() => {
    const guardar = (e: Event) => {
      e.preventDefault() // segura o mini-infobar; o aviso é nosso
      setEvento(e as EventoInstalar)
    }
    const descartar = () => setEvento(null)
    window.addEventListener('beforeinstallprompt', guardar)
    window.addEventListener('appinstalled', descartar)
    return () => {
      window.removeEventListener('beforeinstallprompt', guardar)
      window.removeEventListener('appinstalled', descartar)
    }
  }, [])

  const instalado = window.matchMedia('(display-mode: standalone)').matches

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

  return { podeInstalar: evento !== null && !instalado && !dispensado, instalar, dispensar }
}
