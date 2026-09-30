import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  atualizarUsuario,
  criarUsuario,
  excluirUsuario,
  listarUsuarios,
  type EdicaoUsuario,
  type NovoUsuario,
} from '@/services/usuarios'

const CHAVE = ['usuarios'] as const

/** Todas as contas do sistema — só o master consegue (a função recusa os demais com 403). */
export function useUsuarios() {
  return useQuery({ queryKey: CHAVE, queryFn: listarUsuarios })
}

/** Ações deliberadas (modal com botão em loading): sem update otimista, só recarregam a lista. */
function useMutacaoUsuario<TVars>(mutationFn: (vars: TVars) => Promise<void>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CHAVE })
    },
  })
}

export function useCriarUsuario() {
  return useMutacaoUsuario((novo: NovoUsuario) => criarUsuario(novo))
}

export function useAtualizarUsuario() {
  return useMutacaoUsuario((edicao: EdicaoUsuario) => atualizarUsuario(edicao))
}

export function useExcluirUsuario() {
  return useMutacaoUsuario(({ id, confirmacao }: { id: string; confirmacao: string }) => excluirUsuario(id, confirmacao))
}
