import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FILTRO_VAZIO, type FiltroTarefas } from '@/lib/filtro'
import { FiltroTarefasModal } from './FiltroTarefasModal'

const MEMBROS = [
  { id: 'u1', full_name: 'Ana Lima', avatar_url: null },
  { id: 'u2', full_name: 'Beto Souza', avatar_url: null },
]

const aoMudar = vi.fn()
const aoFechar = vi.fn()

function abrir(filtro: FiltroTarefas = FILTRO_VAZIO) {
  render(<FiltroTarefasModal aberto aoFechar={aoFechar} filtro={filtro} aoMudar={aoMudar} membros={MEMBROS} />)
  return within(screen.getByRole('dialog', { name: 'Filtrar tarefas' }))
}

describe('FiltroTarefasModal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('marcar um status aplica na hora', async () => {
    const modal = abrir()
    await userEvent.click(modal.getByRole('checkbox', { name: 'Em andamento' }))
    expect(aoMudar).toHaveBeenCalledWith({ status: ['working'] })
  })

  it('marcar outro status soma ao que já estava marcado', async () => {
    const modal = abrir({ ...FILTRO_VAZIO, status: ['working'] })
    expect(modal.getByRole('checkbox', { name: 'Em andamento' })).toBeChecked()
    await userEvent.click(modal.getByRole('checkbox', { name: 'Travado' }))
    expect(aoMudar).toHaveBeenCalledWith({ status: ['working', 'stuck'] })
  })

  it('desmarcar tira só aquele status', async () => {
    const modal = abrir({ ...FILTRO_VAZIO, status: ['working', 'stuck'] })
    await userEvent.click(modal.getByRole('checkbox', { name: 'Em andamento' }))
    expect(aoMudar).toHaveBeenCalledWith({ status: ['stuck'] })
  })

  it('prioridade funciona do mesmo jeito', async () => {
    const modal = abrir()
    await userEvent.click(modal.getByRole('checkbox', { name: 'Crítica' }))
    expect(aoMudar).toHaveBeenCalledWith({ prioridade: ['critical'] })
  })

  it('responsável: uma pessoa, "sem responsável" e de volta a qualquer um', async () => {
    const modal = abrir({ ...FILTRO_VAZIO, responsavel: 'u1' })
    const seletor = modal.getByRole('combobox', { name: 'Responsável' })
    expect(seletor).toHaveValue('u1')
    await userEvent.selectOptions(seletor, 'Beto Souza')
    expect(aoMudar).toHaveBeenLastCalledWith({ responsavel: 'u2' })
    await userEvent.selectOptions(seletor, 'Sem responsável')
    expect(aoMudar).toHaveBeenLastCalledWith({ responsavel: 'sem' })
    await userEvent.selectOptions(seletor, 'Qualquer pessoa')
    expect(aoMudar).toHaveBeenLastCalledWith({ responsavel: null })
  })

  it('somente atrasadas', async () => {
    const modal = abrir()
    await userEvent.click(modal.getByRole('checkbox', { name: 'Somente atrasadas' }))
    expect(aoMudar).toHaveBeenCalledWith({ atrasadas: true })
  })

  it('"Limpar filtros" zera as categorias, mas fica desabilitado quando não há nada a limpar', async () => {
    const vazio = abrir()
    expect(vazio.getByRole('button', { name: 'Limpar filtros' })).toBeDisabled()
  })

  it('"Limpar filtros" zera todas as categorias de uma vez (a busca é outro campo)', async () => {
    const modal = abrir({ ...FILTRO_VAZIO, q: 'x', status: ['done'], atrasadas: true })
    await userEvent.click(modal.getByRole('button', { name: 'Limpar filtros' }))
    expect(aoMudar).toHaveBeenCalledWith({ status: [], prioridade: [], responsavel: null, atrasadas: false })
  })

  it('"Concluir" fecha', async () => {
    const modal = abrir()
    await userEvent.click(modal.getByRole('button', { name: 'Concluir' }))
    expect(aoFechar).toHaveBeenCalledOnce()
  })
})
