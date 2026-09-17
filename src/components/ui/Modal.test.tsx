import { useState } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('aberto: expõe role dialog com o título como nome acessível e mostra o conteúdo', () => {
    render(
      <Modal open title="Detalhe da tarefa" onClose={vi.fn()}>
        <p>conteudo</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Detalhe da tarefa' })).toBeInTheDocument()
    expect(screen.getByText('conteudo')).toBeInTheDocument()
  })

  it('fechado: não expõe o dialog', () => {
    render(
      <Modal open={false} title="Detalhe" onClose={vi.fn()}>
        <p>conteudo</p>
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('botão "Fechar" aciona onClose e devolve o foco pra origem (F5.1)', async () => {
    const user = userEvent.setup()

    function Cenario() {
      const [aberto, setAberto] = useState(false)
      return (
        <>
          <button onClick={() => setAberto(true)}>Abrir tarefa</button>
          <Modal open={aberto} title="Detalhe" onClose={() => setAberto(false)}>
            <p>conteudo</p>
          </Modal>
        </>
      )
    }

    render(<Cenario />)

    await user.click(screen.getByRole('button', { name: 'Abrir tarefa' }))
    const dialog = await screen.findByRole('dialog')

    await user.click(within(dialog).getByRole('button', { name: 'Fechar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Abrir tarefa' })).toHaveFocus())
  })

  it('renderiza o footer quando fornecido', () => {
    render(
      <Modal open title="Detalhe" onClose={vi.fn()} footer={<button>Salvar</button>}>
        conteudo
      </Modal>,
    )
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
  })

  it('size="drawer" renderiza normalmente, ocupando a lateral', () => {
    render(
      <Modal open size="drawer" title="Menu" onClose={vi.fn()}>
        <p>conteudo do menu</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument()
    expect(screen.getByText('conteudo do menu')).toBeInTheDocument()
  })

  it('clique fora do conteúdo (no backdrop) fecha e devolve o foco à origem', async () => {
    const user = userEvent.setup()

    function Cenario() {
      const [aberto, setAberto] = useState(false)
      return (
        <>
          <button onClick={() => setAberto(true)}>Abrir menu</button>
          <Modal open={aberto} size="drawer" title="Menu" onClose={() => setAberto(false)}>
            <p>conteudo</p>
          </Modal>
        </>
      )
    }

    render(<Cenario />)
    await user.click(screen.getByRole('button', { name: 'Abrir menu' }))
    const dialog = await screen.findByRole('dialog')

    // Clicar no próprio elemento <dialog> (não em um descendente) é
    // exatamente o que acontece quando o clique cai no backdrop nativo —
    // é o padrão documentado pela MDN pra detectar clique fora.
    fireEvent.click(dialog)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveFocus())
  })
})
