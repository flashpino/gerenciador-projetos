import { useEffect, useRef, useState } from 'react'
import { useFiltroTarefas } from './useFiltroTarefas'

/** Pausa depois da última tecla antes de escrever na URL. */
const ESPERA_MS = 250

/**
 * Campo de busca do board.
 *
 * O texto vive em estado LOCAL enquanto se digita e só depois de uma pausa vai
 * para a URL. Ligar o campo direto à URL perde teclas no navegador: cada tecla
 * dispara uma navegação assíncrona do roteador e a seguinte chega antes de a
 * anterior voltar ("tarefa" virava "trefa"). No jsdom isso não aparece, porque
 * tudo é síncrono — só o navegador real mostrou.
 *
 * Mudança da URL por fora (limpar filtros, botão voltar) é refletida no campo.
 */
export function useBuscaDoBoard() {
  const { filtro, definir } = useFiltroTarefas()
  const [texto, setTexto] = useState(filtro.q)
  // Último valor que ESTE hook escreveu na URL: distingue "eu escrevi" de "mudou por fora".
  const escrito = useRef(filtro.q)

  useEffect(() => {
    if (filtro.q !== escrito.current) {
      escrito.current = filtro.q
      setTexto(filtro.q)
    }
  }, [filtro.q])

  useEffect(() => {
    if (texto === escrito.current) return
    const id = setTimeout(() => {
      escrito.current = texto
      definir({ q: texto })
    }, ESPERA_MS)
    return () => clearTimeout(id)
  }, [texto, definir])

  return { texto, setTexto }
}
