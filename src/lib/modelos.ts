import type { GrupoInicial } from '@/types/domain'

export interface Modelo {
  id: string
  nome: string
  descricao: string
  grupos: GrupoInicial[]
}

// ponytail: catálogo fixo no código. "Salvar board como modelo" pede tabela + RLS (Zona Vermelha) — só se alguém pedir.
export const MODELOS: Modelo[] = [
  {
    id: 'sprint',
    nome: 'Sprint de software',
    descricao: 'Do backlog à entrega, com etapa de revisão antes de concluir.',
    grupos: [
      { name: 'Backlog', color: 'azure' },
      { name: 'Em andamento', color: 'grape' },
      { name: 'Revisão', color: 'crimson' },
      { name: 'Concluído', color: 'mint' },
    ],
  },
  {
    id: 'campanha',
    nome: 'Lançamento de campanha',
    descricao: 'Planeje, produza, aprove e publique as peças da campanha.',
    grupos: [
      { name: 'Planejamento', color: 'azure' },
      { name: 'Produção', color: 'grape' },
      { name: 'Aprovação', color: 'crimson' },
      { name: 'Publicado', color: 'mint' },
    ],
  },
  {
    id: 'onboarding',
    nome: 'Onboarding',
    descricao: 'O que preparar para quem chega, do primeiro dia ao primeiro mês.',
    grupos: [
      { name: 'Antes do 1º dia', color: 'azure' },
      { name: 'Primeira semana', color: 'grape' },
      { name: 'Primeiro mês', color: 'mint' },
    ],
  },
]
