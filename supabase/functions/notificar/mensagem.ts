/**
 * Lógica PURA do push: quem recebe e o texto. Sem Deno, sem rede — por isso é testada pelo Vitest do app
 * (mensagem.test.ts) e importada pela função `notificar` (index.ts), que só faz o I/O.
 */

type Status = 'not_started' | 'working' | 'review' | 'done' | 'stuck'

/** Linha da tabela `activities` (0004), como chega no webhook de INSERT. */
export interface Atividade {
  board_id: string
  task_id: string | null
  actor_id: string | null
  kind: 'task_created' | 'status_changed' | 'comment_added'
  task_title: string
  from_status: Status | null
  to_status: Status | null
  comment_excerpt: string | null
}

export interface Notificacao {
  titulo: string
  corpo: string
  /** Para onde o clique na notificação leva. */
  url: string
}

// ponytail: cópia dos rótulos de src/lib/status.ts — a função é publicada sozinha (bundle do Deno) e não
// alcança o src do app. Mudou lá, muda aqui; se passar de 5 rótulos, gerar os dois de uma fonte só.
const ROTULO: Record<Status, string> = {
  not_started: 'Não iniciado',
  working: 'Em andamento',
  review: 'Em revisão',
  done: 'Pronto',
  stuck: 'Travado',
}

/** O responsável recebe — exceto da própria ação. Sem responsável, ninguém. */
export function deveNotificar(responsavelId: string | null, atorId: string | null): boolean {
  return responsavelId !== null && responsavelId !== atorId
}

export function montarNotificacao(a: Atividade, nomeAtor: string | null): Notificacao {
  const quem = nomeAtor ?? 'Alguém'
  const url = `/boards/${a.board_id}`

  if (a.kind === 'comment_added') {
    return { titulo: `Comentário em "${a.task_title}"`, corpo: `${quem}: ${a.comment_excerpt ?? ''}`, url }
  }
  if (a.kind === 'task_created') {
    return { titulo: 'Nova tarefa para você', corpo: `${quem} criou "${a.task_title}".`, url }
  }
  const status = a.to_status ? ROTULO[a.to_status] : 'outro status'
  return { titulo: a.task_title, corpo: `${quem} mudou o status para ${status}.`, url }
}
