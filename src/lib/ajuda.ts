export interface Pergunta {
  pergunta: string
  resposta: string
}

/**
 * Catálogo da página de Ajuda. Só descreve o que existe hoje — quando uma
 * função nova entrar (ou uma daqui sair), este arquivo muda junto.
 * docs/superpowers/specs/2026-09-29-configuracoes-ajuda-design.md
 */
export const PERGUNTAS: readonly Pergunta[] = [
  {
    pergunta: 'Como crio um painel?',
    resposta:
      'Clique em "Novo Painel" na barra lateral, dê um nome e pronto. Em "Modelos" há painéis já com grupos prontos (por exemplo, Sprint de software).',
  },
  {
    pergunta: 'Quais são as visões de um painel?',
    resposta:
      'Cada painel tem quatro abas: Tabela (edição rápida), Kanban (colunas por status), Gantt (linha do tempo) e Dashboard (métricas). Todas mostram as mesmas tarefas.',
  },
  {
    pergunta: 'Como mudo o status de uma tarefa no Kanban sem arrastar?',
    resposta:
      'Cada cartão tem um menu com "Mover para…" e o status de destino. Funciona pelo teclado e em qualquer largura de tela.',
  },
  {
    pergunta: 'Como convido uma pessoa?',
    resposta:
      'Use o botão "Convidar integrantes" no topo do painel e informe o e-mail. A pessoa precisa já ter uma conta; nenhum e-mail é enviado. Quem é convidado vê e edita os painéis do seu workspace.',
  },
  {
    pergunta: 'Como marco um painel como favorito?',
    resposta: 'Clique na estrela ao lado do nome do painel. Os favoritos aparecem em "Favoritos", na barra lateral.',
  },
  {
    pergunta: 'Onde vejo o que mudou?',
    resposta:
      'Em "Atividades" ficam as tarefas criadas, os status alterados e os comentários do workspace. O Dashboard de cada painel mostra as mais recentes daquele painel.',
  },
  {
    pergunta: 'Como instalo o app?',
    resposta:
      'Onde o navegador permite (Chrome, Edge, Android), aparece um aviso "Instalar o app no seu dispositivo" no canto da tela. Também aparece um aviso quando há uma versão nova para recarregar.',
  },
  {
    pergunta: 'Como troco meu nome?',
    resposta: 'Em "Configurações", na barra lateral. O e-mail é só de leitura.',
  },
]
