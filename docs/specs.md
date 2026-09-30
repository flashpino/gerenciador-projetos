# Especificação — Gerenciador de Projetos

**Versão:** 1.0 · 2026-09-15
**Fase do manual:** 1.3
**Referência visual e funcional:** `arquivos stitch/` (funcionalidades; o design system "Kinetic Workstream" foi substituído em 2026-09-29 pelo visual de `docs/mockups/novo-design-urbanist.html`: Urbanist, índigo, vidro fosco)

Este documento é a fonte da verdade sobre escopo. Se um pedido contradiz o que está
aqui, a contradição é apontada — não resolvida em silêncio.

---

## 1. Persona

**Quem:** Lucas, Scrum Master / Tech Lead de uma squad de 5 a 8 pessoas.
Coordena 1 a 3 sprints simultâneos e responde por prazo à liderança.

**Contexto de uso:**
- **Manhã, desktop (1440px), 15 min** — a cerimônia diária. Abre a tabela, varre o
  que travou, reatribui. É onde ele passa 80% do tempo no produto.
- **Durante o dia, desktop, em rajadas de 30s** — muda um status, mexe uma data.
  Interações curtas e frequentes. Latência percebida importa mais que qualquer feature.
- **Reunião com liderança, desktop projetado** — abre o dashboard. Precisa que um
  número responda "vamos entregar?" sem ele ter que explicar o gráfico.
- **Fora da mesa, celular (375px), esporádico** — consulta e pequenas edições.
  Não planeja sprint no celular. **Mobile é consulta e ajuste, não planejamento.**

**Dispositivo primário:** desktop. **Mobile é obrigatório, mas é o caso secundário.**
Essa distinção governa o `docs/responsive.md`: em mobile a gente corta densidade,
não funcionalidade essencial.

**Dor que o produto resolve:** o estado do sprint vive espalhado entre planilha,
chat e memória. Ninguém sabe o que travou sem perguntar.

---

## 2. MVP — exatamente 5 funcionalidades

| # | Funcionalidade | Tela de referência |
|---|---|---|
| 1 | **Tabela Principal** — tarefas agrupadas, edição inline de status/responsável/prazo/prioridade, rodapé de resumo por grupo | `quadro_de_projetos_tabela_principal` |
| 2 | **Kanban** — colunas por status, mover tarefa entre colunas por arrastar *e por teclado* | `quadro_de_projetos_visualiza_o_kanban` |
| 3 | **Cronograma Gantt** — barras por período, escala dia/semana/mês, marcos, linha de "hoje" | `quadro_de_projetos_cronograma_gantt` |
| 4 | **Dashboard de Métricas** — taxa de conclusão, atrasos, distribuição de status, progresso por grupo | `quadro_de_projetos_dashboard_de_m_tricas` |
| 5 | **Detalhe da Tarefa (modal)** — criar e editar: atributos, descrição, subtarefas, comentários | `modal_de_cadastro_e_edi_o_tarefa_e_projeto` |

As quatro primeiras são **visões sobre o mesmo dado**. O modal é o único ponto de escrita
rica. Isso é intencional: uma fonte de escrita, quatro leituras.

**Autenticação não é a 6ª funcionalidade** — é pré-requisito de infraestrutura das cinco.
Sem um usuário autenticado, `auth.uid()` é nulo e o RLS ou bloqueia tudo ou libera tudo.
Entra no escopo mínimo possível: entrar, sair, criar conta. Nada além disso.

---

## 3. Critérios de aceite

Formato: *Dado [contexto], quando [ação], então [resultado observável]*.
Cada critério vira um teste. Se não dá para observar, não é critério.

### F1 — Tabela Principal
1. Dado um board com tarefas em 2 grupos, quando a tabela carrega, então cada grupo
   mostra seu nome, a contagem de itens e uma barra de progresso agregada.
2. Dado que clico na célula de status de uma tarefa, quando escolho "Pronto", então
   a célula muda de cor **imediatamente** e persiste após recarregar a página.
3. Dado que a alteração de status falha na rede, quando o erro retorna, então a célula
   **volta ao valor anterior** e aparece uma mensagem de erro — não fica num estado mentiroso.
4. Dado um board sem nenhuma tarefa, quando a tabela carrega, então aparece um estado
   vazio com ação de criar a primeira tarefa — nunca uma tabela de cabeçalhos órfãos.
5. Dado que uma tarefa está com prazo vencido e não está concluída, quando a linha
   renderiza, então o prazo é destacado como atrasado e isso é anunciado a leitor de
   tela por texto, não só por cor.
6. Dado um viewport de 375px, quando a tabela renderiza, então vira lista de cards e
   **não existe scroll horizontal na página**.
7. Dado um board com várias tarefas, quando digito na busca do board, então só aparecem
   as tarefas cujo título ou descrição contém o texto (sem diferenciar maiúsculas nem
   acentos), os grupos sem resultado somem, e o resumo diz "Mostrando X de Y tarefas".
   *(sub-projeto 9, 2026-09-30)*
8. Dado que marco filtros (status, prioridade, responsável, atrasadas), quando troco de
   visão (Tabela, Kanban, Gantt) ou recarrego a página, então o mesmo recorte continua
   valendo — o estado mora na URL.
9. Dado que a busca ou os filtros não deixam nada visível, quando a tela renderiza, então
   aparece "Nenhuma tarefa encontrada" com o botão que limpa tudo — nunca o "Nenhuma
   tarefa ainda" de um board vazio.

### F2 — Kanban
1. Dado um board com tarefas, quando abro o kanban, então existe uma coluna por status
   e cada coluna mostra sua contagem.
2. Dado que arrasto um card de "A Fazer" para "Em Andamento", quando solto, então o
   status persiste e a tabela reflete a mudança.
3. Dado que uso **apenas o teclado**, quando foco um card e aciono mover, então consigo
   levá-lo para outra coluna sem mouse, com a mudança anunciada.
4. Dado que a movimentação falha, quando o erro retorna, então o card volta à coluna
   de origem e o erro é exibido.
5. Dado uma coluna sem cards, quando renderiza, então mostra área vazia que aceita drop.
6. Dado 375px, quando abro o kanban, então navego uma coluna por vez, sem perder acesso
   a nenhuma.

### F3 — Cronograma Gantt
1. Dado tarefas com início e fim, quando abro o gantt, então cada uma vira uma barra
   posicionada e dimensionada pelo seu período.
2. Dado que troco a escala de semanas para dias, quando aplico, então as barras
   reposicionam mantendo as mesmas datas.
3. Dado que hoje está dentro do intervalo visível, quando o gantt renderiza, então existe
   um marcador de "hoje".
4. Dado uma tarefa marcada como marco, quando renderiza, então aparece como marco
   (data única), não como barra.
5. Dado uma tarefa sem datas, quando o gantt renderiza, então ela é listada como
   "sem período definido" — não some silenciosamente.
6. Dado 375px, quando abro o gantt, então a coluna de tarefas fica fixa e só a linha do
   tempo rola horizontalmente.

### F4 — Dashboard
1. Dado um board com tarefas, quando abro o dashboard, então vejo taxa de conclusão,
   contagem de atrasadas e distribuição por status, todas derivadas das tarefas reais.
2. Dado que a distribuição é exibida como gráfico, quando renderiza, então os mesmos
   números estão disponíveis **em texto** — o gráfico não é a única forma de ler o dado.
3. Dado um board sem tarefas, quando abro o dashboard, então mostra estado vazio,
   e não "0%" e "NaN".
4. Dado tarefas com status variados, quando calculo a taxa de conclusão, então ela é
   `concluídas / total`, arredondada a uma casa, e a soma dos percentuais de
   distribuição fecha em 100%.

### F5 — Detalhe da Tarefa (modal)
1. Dado que clico numa tarefa, quando o modal abre, então o foco vai para dentro dele,
   fica preso ali, `Esc` fecha e o foco **volta para a tarefa de origem**.
2. Dado o modal aberto, quando altero um atributo e salvo, então a mudança aparece na
   view que estava por trás, sem recarregar.
3. Dado que tento salvar com o título vazio, quando aciono salvar, então o botão está
   desabilitado ou o envio é bloqueado, com o erro associado ao campo (`aria-describedby`).
4. Dado que a data de fim é anterior à de início, quando tento salvar, então o envio é
   bloqueado com mensagem explicando qual é o problema.
5. Dado uma tarefa com subtarefas, quando marco uma como feita, então o contador
   (`4/6`) atualiza imediatamente.
6. Dado uma tarefa sem comentários, quando abro a aba, então há estado vazio com convite
   a comentar.

### F0 — Autenticação (pré-requisito, Zona Vermelha)
1. Dado credenciais válidas, quando entro, então chego ao meu workspace.
2. Dado credenciais inválidas, quando entro, então vejo erro genérico — **sem revelar
   se o e-mail existe**.
3. Dado que não estou autenticado, quando acesso uma rota do app, então sou levado ao
   login sem piscar conteúdo protegido.
4. Dado o usuário A e o usuário B em workspaces diferentes, quando A consulta a API,
   então **A não recebe nenhuma linha de B**. Provado por teste contra o banco real.

---

## 4. Fora de escopo da v1

Explícito para que seja possível recusar depois, sem nova discussão:

| Não faremos | Por quê |
|---|---|
| Automações e webhooks | Motor de regras é um produto dentro do produto |
| Upload real de anexos | Storage, antivírus, cota, permissão de arquivo. Sozinho é uma v2 |
| Time tracking com cronômetro | `horas estimadas` e `horas gastas` são campos simples; o cronômetro não é |
| ~~Templates de board~~ | **Reaberto e entregue** no sub-projeto 5 (2026-09-28): catálogo fixo de 3 modelos em `/modelos`, só grupos, sem migration — `docs/superpowers/specs/2026-09-28-modelos-design.md`. Continua fora: salvar board como modelo, tarefas de exemplo |
| Notificação por e-mail / push | Exige fila, preferência por usuário e opt-out |
| Exportação XLSX / PDF | Uma dependência pesada para um caso que o copiar-colar cobre na v1 |
| Colaboração em tempo real | Traz reconciliação de estado e conflito de edição concorrente |
| Funcionamento offline | Exige resolução de conflito. O PWA da v1 é **instalável, não offline** |
| Recuperação de senha, OAuth, 2FA | Fora do mínimo que faz o RLS funcionar |
| ~~Múltiplos workspaces por usuário~~ | **Reaberto em parte** no sub-projeto 6 (2026-09-29): quem é convidado vê e edita os boards do workspace de quem convidou, além dos próprios. O "workspace atual" continua sendo o da própria pessoa (onde ela cria boards). Continua fora: trocar de workspace na UI, transferir posse — `docs/superpowers/specs/2026-09-29-integrantes-design.md` |
| Colunas customizáveis pelo usuário | O conjunto de colunas é fixo na v1 |
| Permissão granular por papel | Membro do workspace lê e escreve. Sem papéis na v1 |
| ~~Feed de atividades no dashboard~~ | **Reaberto e entregue** no sub-projeto 4 (2026-09-28): tabela `activities` gravada por gatilhos (migration 0004, revisada e aplicada por humano), `/atividades` e card no Dashboard — `docs/superpowers/specs/2026-09-28-atividades-design.md`. Continua fora: tempo real, filtro por tipo de evento, eventos de outros campos |
| Carga de trabalho / capacidade da equipe no dashboard | Zona Vermelha (`CLAUDE.md`): cálculo de capacidade e alocação de esforço é autoria humana. `estimated_hours`/`logged_hours` já existem em `tasks`, mas a fórmula de sobrecarga fica para v1.1, proposta pela IA e aprovada linha a linha |
| Filtros de período/sprint, exportar relatório, personalizar widgets no dashboard | Não existe conceito de sprint/período no schema. Seriam controles de UI sem dado real por trás — mockup do stitch é ilustrativo aqui, não um requisito com dado que sustente. "Exportar" já cai na linha "Exportação XLSX/PDF" acima |
| Subtarefas aninhadas em vários níveis | Um nível só |
| Busca global entre boards | Busca dentro do board atual apenas |

---

## 5. Requisitos não-funcionais

**Performance**
- LCP < 2.5s em 4G
- Bundle inicial < 200 KB gzip (baseline no fim da Fase 0: 68.6 KB)
- Gantt e Dashboard carregam por rota (code splitting) — não pesam na primeira tela
- Um board com 200 tarefas rola sem travar

**Acessibilidade — WCAG 2.2 AA**
- Contraste 4.5:1 em texto normal, 3:1 em texto grande e componentes de UI
- Tudo alcançável por teclado, com foco visível e ordem lógica
- **Cor nunca é o único portador de significado** — status tem texto, atraso tem rótulo
- Alvo de toque mínimo 44×44px em mobile
- Legível em zoom de 200%
- Drag-and-drop tem alternativa por teclado (WCAG 2.5.7)

**Responsividade**
- Breakpoints 375 / 768 / 1440, mobile-first
- Zero scroll horizontal de página em 375px (a exceção controlada é a linha do tempo
  do Gantt, que rola dentro do próprio container)

**PWA**
- Instalável: manifest válido, ícones 192/512 + maskable
- **Não requer funcionamento offline** (decisão do produto)
- Atualização avisada ao usuário — nada de ficar preso numa versão velha

**Segurança**
- RLS ativo em todas as tabelas, sem exceção
- Nenhum segredo em variável `VITE_`; `SERVICE_ROLE_KEY` jamais no frontend
- Validação no banco (constraint), não apenas no cliente

---

## 6. Zona Vermelha — autoria humana

A IA **propõe**; o humano escreve, revisa linha a linha e aplica:

1. **Fluxo de autenticação** — login, sessão, logout, guarda de rota
2. **Políticas de Row Level Security** — todas, e o teste de isolamento entre usuários
3. **Migrations** — o agente escreve o arquivo, nunca executa. Todo `up` tem `down`
4. **Validação no servidor** — constraints e checks no banco
5. **Cálculo de capacidade e alocação de esforço** — alimenta decisão sobre pessoas;
   erro aqui é caro e silencioso

---

## 7. Fatia vertical

**A primeira coisa construída de ponta a ponta é a Tabela Principal (F1).**

Motivo: é a tela onde a persona passa 80% do tempo e a única que exercita todos os
padrões de uma vez — leitura agrupada, escrita inline, update otimista com rollback,
os quatro estados e o contrato de responsividade mais difícil (tabela → cards).

As outras três views reusam os mesmos hooks e trocam apenas a renderização. Se a fatia
vertical estiver certa, elas são baratas. Se estiver errada, é melhor descobrir agora.
