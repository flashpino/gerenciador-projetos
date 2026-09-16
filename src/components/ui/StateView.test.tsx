import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StateView } from './StateView'

describe('StateView', () => {
  it('anuncia carregamento para leitor de tela, nao so um spinner visual', () => {
    render(<StateView estado={{ tipo: 'carregando' }}>conteudo</StateView>)
    expect(screen.getByRole('status')).toHaveTextContent(/carregando/i)
    expect(screen.queryByText('conteudo')).not.toBeInTheDocument()
  })

  it('mostra o erro com role alert e um botao de tentar de novo', () => {
    render(
      <StateView estado={{ tipo: 'erro', mensagem: 'Deu ruim', aoTentarDeNovo: () => {} }}>
        conteudo
      </StateView>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Deu ruim')
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeVisible()
  })

  it('mostra o estado vazio com titulo e acao', () => {
    render(
      <StateView estado={{ tipo: 'vazio', titulo: 'Nenhuma tarefa', acao: <button>Criar</button> }}>
        conteudo
      </StateView>,
    )
    expect(screen.getByText('Nenhuma tarefa')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Criar' })).toBeVisible()
    expect(screen.queryByText('conteudo')).not.toBeInTheDocument()
  })

  it('so renderiza os filhos no estado de sucesso', () => {
    render(<StateView estado={{ tipo: 'pronto' }}>conteudo</StateView>)
    expect(screen.getByText('conteudo')).toBeVisible()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
