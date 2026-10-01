import { afterEach, describe, expect, it, vi } from 'vitest'
import { escolherWorkspace, lembrarWorkspaceAtual, lerWorkspaceAtual } from './workspaceAtual'

const MEU = 'u-eu'
const LISTA = [
  { id: 'w-convite', name: 'Do Pino', owner_id: 'u-pino' },
  { id: 'w-meu', name: 'Meu Workspace', owner_id: MEU },
  { id: 'w-clientes', name: 'Clientes', owner_id: MEU },
]

describe('escolherWorkspace — qual é o workspace atual', () => {
  it('o último escolhido, se a pessoa ainda tem acesso a ele', () => {
    expect(escolherWorkspace(LISTA, 'w-clientes', MEU)?.id).toBe('w-clientes')
  })
  it('sem escolha guardada: o primeiro do qual é dono (não o de quem convidou)', () => {
    expect(escolherWorkspace(LISTA, null, MEU)?.id).toBe('w-meu')
  })
  it('escolha guardada que sumiu (excluído ou saiu): volta para o próprio', () => {
    expect(escolherWorkspace(LISTA, 'w-apagado', MEU)?.id).toBe('w-meu')
  })
  it('sem nenhum próprio (só convidado): o primeiro da lista', () => {
    expect(escolherWorkspace([LISTA[0]!], null, MEU)?.id).toBe('w-convite')
  })
  it('lista vazia: nenhum', () => {
    expect(escolherWorkspace([], 'w-meu', MEU)).toBeUndefined()
  })
})

describe('lembrar/ler o workspace atual', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })
  it('guarda e lê do navegador', () => {
    lembrarWorkspaceAtual('w-clientes')
    expect(lerWorkspaceAtual()).toBe('w-clientes')
  })
  it('armazenamento bloqueado não quebra: só não lembra', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    expect(() => lembrarWorkspaceAtual('w')).not.toThrow()
    expect(lerWorkspaceAtual()).toBeNull()
  })
})
