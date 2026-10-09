# PRD — Apoio à Rotina

**Status:** pronto para validação do cliente  
**Versão:** 1.0  
**Data:** 08/10/2026  
**Origem:** briefing do cliente e entrevista de produto

## 1. Visão do produto

O Apoio à Rotina é um planejador pessoal, responsivo e de baixa carga cognitiva para uma pessoa adulta com TDAH organizar uma semana realista entre trabalho, paternidade, terapia, alimentação, estudos e música.

O produto não busca maximizar produtividade nem oferecer tratamento clínico. Seu propósito é ajudar o usuário a construir uma rotina sustentável, previsível e equilibrada, preparar o dia seguinte e refletir sobre o dia encerrado sem culpa.

## 2. Problem Statement

O usuário possui compromissos fixos, responsabilidades familiares e objetivos pessoais concorrentes, mas tem dificuldade para transformá-los em uma rotina executável. Um calendário convencional registra horários, porém não ajuda a limitar a carga diária, priorizar, reservar transições, recuperar-se de imprevistos ou compreender por que o planejamento não funcionou.

Como o usuário pretende consultar o produto principalmente na noite anterior e ao fim do dia, uma solução que exija acompanhamento constante, muitos cadastros ou decisões repetitivas terá baixa aderência. A experiência também não pode transformar tarefas pendentes em acúmulo automático nem reforçar culpa por dias que saíram do plano.

## 3. Objetivos

1. Produzir uma proposta semanal editável a partir dos compromissos e responsabilidades do usuário.
2. Permitir que o usuário entenda rapidamente o que é essencial no dia seguinte.
3. Limitar a três as prioridades explícitas de cada dia.
4. Apoiar uma revisão noturna simples, objetiva e não punitiva.
5. Ajudar a equilibrar trabalho, família, saúde e interesses pessoais.
6. Facilitar a retomada da rotina após imprevistos, sem criar uma fila crescente de pendências.

## 4. Não objetivos

- Diagnosticar, tratar ou monitorar clinicamente TDAH.
- Substituir acompanhamento psicológico, psiquiátrico, nutricional ou médico.
- Avaliar o usuário como “bom”, “ruim”, “produtivo” ou “improdutivo”.
- Maximizar o número de tarefas realizadas.
- Vigiar o usuário durante o dia ou exigir registro contínuo.

## 5. Usuário e contexto

### Persona primária

Adulto com TDAH, profissional em regime híbrido, pai de uma criança de quatro anos, em terapia e com interesses em formação profissional e música. Precisa de estrutura, mas tende a abandonar ferramentas excessivamente rígidas ou trabalhosas.

### Contexto conhecido

- Trabalho de 8 horas por dia, excepcionalmente até 10 horas.
- Home office na maior parte da semana.
- Trabalho presencial às quartas e quintas, com chegada até 10h.
- Terapia às quintas, às 18h; o trabalho pode ser retomado depois, se necessário.
- Cuidado solo do filho em três dias da semana e convivência também nos fins de semana.
- Ensaio de orquestra aos sábados, das 9h às 13h aproximadamente.
- Interesse em reservar tempo para composição e violino.
- Plano de estudos de 36 semanas, com referência de 10 horas semanais, dividido entre teoria, laboratório/case, aplicação/reflexão e revisão.
- Plano alimentar prescrito com refeições às 9h, 12h30, 16h e 20h30 e variações entre dias com e sem treino.

Os três dias de cuidado solo, dias de treino, deslocamentos e demais horários ainda não informados devem ser configuráveis, não presumidos.

## 6. Princípios de produto

1. **Planejar por capacidade:** deixar margens e não ocupar todo o tempo disponível.
2. **Poucas escolhas por vez:** destacar somente compromissos e até três prioridades.
3. **Estrutura com autonomia:** sugerir uma rotina, mas exigir aprovação para mudanças.
4. **Sem culpa:** usar linguagem factual e acolhedora.
5. **Recuperação simples:** permitir reduzir, dividir, mover ou descartar uma pendência.
6. **Contexto antes de produtividade:** proteger compromissos fixos, família, saúde e descanso.
7. **Uso episódico:** entregar valor na véspera e no fechamento do dia, sem depender de consulta constante.
8. **Progressão gradual:** começar com uma agenda viável; não tentar encaixar imediatamente todas as metas máximas.
9. **Privacidade por padrão:** coletar somente dados necessários e evitar exposição de informações pessoais sensíveis.

## 7. Proposta de solução

### 7.1 Configuração inicial guiada

O produto conduz uma configuração curta para registrar:

- jornada e dias de trabalho;
- dias presenciais, horário limite de chegada e tempo de deslocamento;
- compromissos recorrentes;
- dias e períodos de cuidado solo do filho;
- sono e períodos indisponíveis;
- refeições e outras rotinas de saúde;
- objetivos flexíveis, como estudo e música;
- preferência de carga e margens entre blocos.

Ao final, o produto gera uma proposta de semana. Cada bloco pode ser aceito, editado ou removido antes de a rotina entrar em vigor. Nenhuma sugestão é tratada como obrigação.

### 7.2 Planejamento da véspera

A tela principal do dia seguinte apresenta, nesta ordem:

1. data e contexto do dia;
2. até três prioridades;
3. compromissos fixos;
4. linha do tempo completa;
5. alertas de preparação, como saída para o trabalho presencial;
6. carga planejada por área da vida;
7. tarefas ainda sem horário, quando houver.

O usuário pode reorganizar blocos, alterar duração, adicionar tarefa ou nota e confirmar o plano. O sistema alerta sobre conflitos, excesso de carga e ausência de margem, mas não impede a decisão do usuário.

### 7.3 Linha do tempo diária

A linha do tempo reúne:

- compromissos fixos;
- blocos de trabalho;
- deslocamentos e preparação;
- cuidado com o filho;
- refeições;
- estudos;
- música;
- tarefas pessoais;
- pausas, transições e margens.

Cada item informa título, horário, duração, categoria e condição atual. As categorias devem ser visualmente distinguíveis sem depender exclusivamente de cor.

### 7.4 Tarefas e notas

O usuário pode:

- criar, editar e remover tarefas;
- atribuir categoria, data, horário e duração estimada;
- transformar uma tarefa em prioridade do dia;
- dividir uma tarefa em partes menores;
- registrar uma nota livre associada ao dia ou a uma tarefa;
- manter uma tarefa sem horário para decidir depois.

Remover deve significar excluir um item criado por engano; “descartar” deve ser usado na revisão quando uma tarefa planejada deixou de ser necessária.

### 7.5 Revisão do dia

No fim do dia, o usuário revisa os itens planejados com uma ação rápida:

- **Realizado**;
- **Parcial**;
- **Reprogramado**;
- **Descartado**.

A revisão também oferece, de forma opcional:

- nota sobre o dia;
- percepção de energia em escala curta;
- percepção de sobrecarga em escala curta;
- motivo simples para um item não concluído;
- decisão sobre cada pendência: manter, reduzir, dividir, trocar de dia ou descartar.

O produto não move pendências automaticamente. Ao finalizar, mostra uma síntese factual e reconhece o que foi concluído sem atribuir nota moral ao dia.

### 7.6 Visão semanal de equilíbrio

A visão semanal mostra:

- compromissos fixos e blocos flexíveis;
- horas planejadas e registradas de trabalho;
- presença de tempo reservado para família, saúde, estudo, música e descanso;
- itens recorrentes frequentemente reprogramados;
- conflitos e dias sobrecarregados;
- pendências que ainda exigem decisão.

A visão não cria ranking, sequência obrigatória de dias perfeitos ou pontuação de produtividade.

### 7.7 Estudos

O plano de estudos entra como objetivo flexível. A referência externa é de 10 horas semanais, mas o MVP deve permitir uma meta ajustável e uma adoção gradual para evitar que o plano concorra de forma irrealista com trabalho e paternidade.

Os blocos podem ser classificados como:

- teoria;
- laboratório/case;
- aplicação ou reflexão;
- revisão.

O MVP acompanha tempo planejado e realizado. Não precisa reproduzir todo o currículo nem editar a base do projeto de estudos.

### 7.8 Alimentação

O produto pode criar lembretes recorrentes baseados no plano fornecido:

- café da manhã às 9h;
- almoço às 12h30;
- lanche às 16h;
- jantar às 20h30;
- indicação de cardápio para dia com ou sem treino.

O conteúdo deve ser apresentado como referência prescrita, sem reinterpretar porções, calorias ou orientações e sem sugerir mudanças nutricionais. A conclusão da refeição pode ser registrada como rotina, mas não deve compor avaliação de desempenho.

## 8. Jornadas principais

### Jornada A — Primeira configuração

1. Usuário acessa o produto e se identifica.
2. Informa compromissos, responsabilidades e preferências.
3. Visualiza a proposta semanal.
4. Aceita, edita ou remove os blocos sugeridos.
5. Confirma a rotina inicial.
6. É direcionado ao planejamento do próximo dia.

### Jornada B — Planejar o dia seguinte

1. Usuário abre o produto à noite.
2. Visualiza compromissos fixos e sugestões para amanhã.
3. Confere carga, conflitos e margens.
4. Escolhe até três prioridades.
5. Ajusta blocos, se necessário.
6. Confirma o plano.

### Jornada C — Encerrar o dia

1. Usuário abre o dia atual.
2. Marca os itens como realizados, parciais, reprogramados ou descartados.
3. Decide o destino de cada pendência.
4. Registra energia, sobrecarga e nota, se desejar.
5. Visualiza a síntese do dia.
6. Pode seguir diretamente para o planejamento de amanhã.

### Jornada D — Recuperar-se de um imprevisto

1. Usuário identifica uma tarefa que não ocorreu.
2. O produto oferece manter, reduzir, dividir, trocar de dia ou descartar.
3. Usuário escolhe uma alternativa.
4. O produto verifica conflito e capacidade do novo dia.
5. A alteração só é aplicada após confirmação.

### Jornada E — Ajustar a semana

1. Usuário abre a visão semanal.
2. Identifica dias carregados ou áreas sem espaço.
3. Move ou reduz blocos flexíveis.
4. Preserva ou altera compromissos fixos conscientemente.
5. Confirma a nova versão da semana.

## 9. Requisitos funcionais

### RF-01 — Identificação

O produto deve oferecer acesso individual persistente. O requisito de negócio é impedir acesso casual de terceiros sem criar fricção significativa. A senha citada no briefing não deve ficar exposta na interface ou no código distribuído.

### RF-02 — Rotina recorrente

O usuário deve criar e editar blocos recorrentes por dia da semana, horário, duração, categoria e flexibilidade.

### RF-03 — Compromissos fixos

O usuário deve distinguir compromissos fixos de blocos flexíveis. O sistema deve evitar mover um compromisso fixo sem ação explícita.

### RF-04 — Proposta inicial

O sistema deve gerar uma semana inicial com base nas informações cadastradas e explicar de forma simples por que os blocos foram posicionados.

### RF-05 — Aprovação humana

O usuário deve aceitar, editar ou remover cada sugestão relevante. O sistema não deve publicar alterações automáticas na agenda.

### RF-06 — Prioridades

Cada dia deve aceitar no máximo três prioridades ativas.

### RF-07 — Linha do tempo

O produto deve mostrar os itens do dia em ordem cronológica, incluindo espaços livres, margens e conflitos.

### RF-08 — Capacidade

O produto deve calcular a carga planejada e alertar quando a soma exceder a disponibilidade ou o limite de trabalho configurado.

### RF-09 — Trabalho

O produto deve apoiar jornada padrão de 8 horas e alertar ao aproximar-se ou ultrapassar 10 horas no dia. Terapia, refeições, deslocamentos e cuidado familiar não devem ser contabilizados como trabalho.

### RF-10 — Deslocamento

Nos dias presenciais, o usuário deve configurar horário de chegada, preparação e deslocamento. O sistema deve calcular e exibir o horário recomendado de saída.

### RF-11 — Tarefas

O usuário deve adicionar, editar, excluir, agendar, dividir e categorizar tarefas.

### RF-12 — Notas

O usuário deve registrar notas no dia e em tarefas, sem exigir preenchimento para concluir a revisão.

### RF-13 — Estados de revisão

Todo item planejado deve aceitar os estados realizado, parcial, reprogramado e descartado.

### RF-14 — Gestão de pendências

Ao revisar uma pendência, o sistema deve oferecer manter, reduzir, dividir, trocar de dia ou descartar. Nenhuma opção deve ser escolhida automaticamente.

### RF-15 — Revisão diária

O usuário deve conseguir concluir a revisão com poucas interações e sem preencher justificativas obrigatórias.

### RF-16 — Percepção subjetiva

Energia e sobrecarga devem ser campos opcionais, de escala curta, usados para reflexão pessoal e não para inferência clínica.

### RF-17 — Semana

O usuário deve visualizar e editar a semana, com indicação de carga por categoria e alertas de conflito.

### RF-18 — Alimentação

O usuário deve visualizar refeições recorrentes e a referência do cardápio correspondente ao tipo de dia, podendo alterar horários ou desativar a exibição.

### RF-19 — Estudos

O usuário deve definir uma meta semanal de estudo e registrar blocos planejados e realizados por tipo de atividade.

### RF-20 — Música

O usuário deve criar blocos flexíveis distintos para estudo musical, composição e violino, sem torná-los obrigatórios em toda semana.

### RF-21 — Paternidade

O usuário deve configurar períodos de cuidado do filho e protegê-los contra sobreposição acidental com blocos flexíveis.

### RF-22 — Linguagem

A interface deve evitar termos punitivos como “fracasso”, “falhou”, “dia ruim”, “atrasado” ou “sequência perdida”.

### RF-23 — Histórico

O usuário deve consultar dias anteriores e suas revisões sem alterar acidentalmente o plano recorrente.

### RF-24 — Configuração

O usuário deve alterar horários, recorrências, metas e categorias quando sua rotina mudar.

### RF-25 — Dados iniciais

O produto deve suportar a carga inicial dos compromissos conhecidos, mantendo como “a confirmar” todos os dados ausentes no briefing.

## 10. Requisitos de experiência e acessibilidade

1. Interface responsiva para celular e desktop.
2. Tela diária compreensível em poucos segundos, com hierarquia visual clara.
3. Ações principais acessíveis por teclado e com foco visível.
4. Contraste compatível com WCAG 2.2 nível AA.
5. Estados comunicados por texto e ícone, não somente por cor.
6. Redução de animações conforme preferência do dispositivo.
7. Confirmação ou possibilidade de desfazer ações que removam ou descartem itens.
8. Formulários curtos, com preenchimento progressivo e valores padrão editáveis.
9. Ausência de pop-ups, recompensas intermitentes ou elementos visuais que disputem atenção.
10. Datas, horários e duração apresentados em formatos inequívocos.

## 11. Conteúdo e tom de voz

O tom deve ser direto, acolhedor e não infantilizado.

Exemplos recomendados:

- “Vamos deixar espaço para imprevistos?”
- “Esta tarefa não coube hoje. O que faz mais sentido agora?”
- “Você concluiu 2 das 3 prioridades e protegeu seus compromissos fixos.”
- “Quinta-feira parece carregada. Deseja reduzir um bloco flexível?”

Exemplos a evitar:

- “Você falhou em três tarefas.”
- “Não quebre sua sequência.”
- “Seja mais produtivo.”
- “Seu TDAH está piorando.”

## 12. User Stories

1. Como usuário, quero informar meus compromissos fixos, para que o planejamento respeite o que não posso mover.
2. Como usuário, quero registrar meus dias de trabalho presencial, para que preparação e deslocamento entrem na rotina.
3. Como usuário, quero informar o horário limite de chegada, para saber a que horas devo sair.
4. Como usuário, quero configurar minha jornada de trabalho, para não planejar menos ou mais horas sem perceber.
5. Como usuário, quero receber alerta ao ultrapassar 10 horas de trabalho, para proteger meus limites.
6. Como usuário, quero registrar a terapia como compromisso recorrente, para não haver conflito com outras atividades.
7. Como usuário, quero poder voltar ao trabalho após a terapia quando necessário, para ajustar uma exceção conscientemente.
8. Como usuário, quero registrar os períodos em que cuido sozinho do meu filho, para não planejar tarefas incompatíveis.
9. Como usuário, quero proteger tempo de convivência com meu filho, para equilibrar trabalho e família.
10. Como usuário, quero registrar o ensaio da orquestra, para que o sábado seja planejado ao redor dele.
11. Como usuário, quero reservar tempo flexível para violino, para manter um interesse importante sem tratá-lo como obrigação máxima.
12. Como usuário, quero reservar tempo para composição, para cultivar criatividade dentro da minha capacidade semanal.
13. Como usuário, quero definir uma meta ajustável de estudo, para progredir na formação sem sobrecarregar a rotina.
14. Como usuário, quero diferenciar teoria, laboratório, aplicação e revisão, para acompanhar a composição do estudo.
15. Como usuário, quero ver minhas refeições nos horários prescritos, para incorporá-las à rotina.
16. Como usuário, quero distinguir dias com e sem treino, para consultar o cardápio correspondente.
17. Como usuário, quero editar ou ocultar lembretes de refeições, para manter controle sobre a experiência.
18. Como usuário, quero responder a uma configuração guiada, para não começar com uma agenda vazia.
19. Como usuário, quero receber uma proposta de semana, para reduzir o esforço de planejamento inicial.
20. Como usuário, quero entender por que um bloco foi sugerido em determinado horário, para confiar e decidir melhor.
21. Como usuário, quero aceitar, editar ou remover sugestões, para continuar dono da minha rotina.
22. Como usuário, quero definir até três prioridades por dia, para saber o que realmente merece atenção.
23. Como usuário, quero ver primeiro os compromissos e prioridades, para compreender o dia rapidamente.
24. Como usuário, quero consultar uma linha do tempo, para entender a sequência e os intervalos do dia.
25. Como usuário, quero enxergar espaços livres, para não interpretar todo intervalo como tempo a preencher.
26. Como usuário, quero incluir margens entre atividades, para absorver transições e imprevistos.
27. Como usuário, quero ser avisado sobre conflitos, para corrigi-los antes do dia começar.
28. Como usuário, quero ser avisado sobre excesso de carga, para reduzir o plano conscientemente.
29. Como usuário, quero adicionar uma tarefa rapidamente, para não perder algo que preciso fazer.
30. Como usuário, quero editar e excluir tarefas, para corrigir erros e mudanças.
31. Como usuário, quero manter tarefas sem horário, para decidir depois sem poluir a linha do tempo.
32. Como usuário, quero estimar a duração de uma tarefa, para planejar com mais realismo.
33. Como usuário, quero dividir uma tarefa grande, para torná-la mais iniciável.
34. Como usuário, quero categorizar tarefas, para visualizar o equilíbrio entre áreas da vida.
35. Como usuário, quero adicionar notas ao dia, para registrar contexto que os estados não explicam.
36. Como usuário, quero adicionar notas a uma tarefa, para guardar detalhes relevantes à execução.
37. Como usuário, quero marcar um item como realizado, para registrar o que ocorreu.
38. Como usuário, quero marcar um item como parcial, para reconhecer progresso sem fingir conclusão.
39. Como usuário, quero marcar um item como reprogramado, para registrar uma mudança deliberada.
40. Como usuário, quero marcar um item como descartado, para retirar algo que não faz mais sentido.
41. Como usuário, quero decidir individualmente o destino das pendências, para evitar uma bola de neve automática.
42. Como usuário, quero reduzir uma pendência, para adequá-la à capacidade disponível.
43. Como usuário, quero trocar uma pendência de dia, para reagir a imprevistos.
44. Como usuário, quero descartar uma pendência, para não carregar tarefas sem valor.
45. Como usuário, quero registrar opcionalmente minha energia, para reconhecer padrões pessoais.
46. Como usuário, quero registrar opcionalmente minha sobrecarga, para comparar plano e experiência.
47. Como usuário, quero concluir a revisão sem justificar tudo, para não transformar reflexão em burocracia.
48. Como usuário, quero receber uma síntese factual do dia, para entender o ocorrido sem julgamento.
49. Como usuário, quero ir da revisão de hoje ao planejamento de amanhã, para completar meu ritual noturno.
50. Como usuário, quero consultar a semana inteira, para perceber dias sobrecarregados antes que aconteçam.
51. Como usuário, quero comparar carga entre áreas da vida, para buscar equilíbrio e não somente produtividade.
52. Como usuário, quero ver itens reprogramados repetidamente, para decidir se devo reduzi-los ou removê-los.
53. Como usuário, quero consultar dias anteriores, para refletir sobre a rotina ao longo do tempo.
54. Como usuário, quero mudar recorrências, para adaptar o produto quando minha vida mudar.
55. Como usuário, quero desfazer uma ação equivocada, para usar a ferramenta sem receio.
56. Como usuário, quero usar o produto pelo celular, para planejar e revisar onde estiver.
57. Como usuário, quero usar teclado e leitor de tela, para ter uma experiência acessível.
58. Como usuário, quero que os estados não dependam apenas de cor, para compreendê-los com clareza.
59. Como usuário, quero linguagem respeitosa e não punitiva, para revisar o dia sem culpa.
60. Como usuário, quero que o produto não faça afirmações clínicas, para não confundir organização pessoal com tratamento.

## 13. Critérios de aceitação do MVP

### Configuração e semana inicial

- O usuário consegue cadastrar todos os tipos de compromisso descritos no escopo.
- Uma proposta semanal é gerada sem sobrepor compromissos fixos conhecidos.
- Sugestões permanecem pendentes até aceite ou edição do usuário.
- Campos ainda desconhecidos são solicitados ou mantidos claramente como não configurados.

### Planejamento diário

- O topo do dia nunca mostra mais de três prioridades.
- Compromissos fixos aparecem antes de tarefas flexíveis.
- Conflitos e excesso de carga ficam visíveis antes da confirmação.
- O usuário pode confirmar o dia sem preencher notas.

### Revisão

- Cada item aceita os quatro estados definidos.
- Uma pendência nunca é movida para outro dia sem confirmação.
- O usuário consegue concluir a revisão mesmo deixando energia e sobrecarga vazias.
- A síntese usa linguagem factual e não atribui pontuação ao usuário.

### Contextos específicos

- Quartas e quintas podem conter trabalho presencial e horário calculado de saída.
- Quinta-feira pode conter terapia às 18h e eventual bloco posterior de trabalho.
- Sábado pode conter ensaio das 9h às 13h.
- Os horários de refeição podem aparecer como recorrências editáveis.
- Estudo e música podem ser planejados como blocos flexíveis.
- Períodos de cuidado do filho bloqueiam sobreposição acidental.

## 14. Métricas de sucesso

As métricas devem avaliar utilidade e sustentabilidade, não performance clínica.

### Métrica principal

**Aderência saudável à rotina:** percentual de semanas em que o usuário realizou planejamento em pelo menos quatro dias e revisão em pelo menos três, sem aumento persistente da sobrecarga autorrelatada.

### Métricas secundárias

- Percentual de dias planejados na véspera.
- Percentual de dias revisados até o fim do dia seguinte.
- Percentual de prioridades com decisão registrada.
- Distribuição entre realizado, parcial, reprogramado e descartado.
- Quantidade de tarefas reprogramadas três ou mais vezes.
- Percentual de semanas com presença planejada em pelo menos três áreas além do trabalho.
- Diferença entre duração estimada e registrada, quando o usuário informar ambas.
- Taxa de conclusão do ritual noturno: revisão de hoje seguida de planejamento de amanhã.
- Percepção mensal do usuário sobre previsibilidade e equilíbrio, em pergunta curta.

### Sinais de risco

- Crescimento contínuo de pendências.
- Planejamento recorrente acima de 10 horas de trabalho.
- Abandono após a configuração inicial.
- Revisões frequentemente iniciadas e não concluídas.
- Uso concentrado apenas em trabalho, sem espaço para saúde, família ou descanso.

## 15. Hipóteses a validar

1. Uma proposta inicial editável reduz a barreira de começar comparada a um calendário vazio.
2. Limitar prioridades a três melhora clareza sem esconder compromissos importantes.
3. O ritual combinado de revisão e preparação aumenta a previsibilidade percebida.
4. Não reagendar automaticamente reduz o acúmulo e a sensação de fracasso.
5. Mostrar equilíbrio por áreas gera decisões melhores do que exibir somente taxa de conclusão.
6. Lembretes de alimentação integrados ajudam a estruturar o dia sem virar fiscalização.
7. Uma meta gradual de estudos é mais sustentável do que aplicar imediatamente as 10 horas semanais de referência.

## 16. Riscos e mitigação

| Risco | Impacto | Mitigação de produto |
|---|---|---|
| Agenda excessivamente ambiciosa | Sobrecarga e abandono | Capacidade visível, margens e alertas antes da confirmação |
| Pendências acumuladas | Culpa e perda de confiança | Decisão explícita por item; sem reagendamento automático |
| Produto trabalhoso demais | Baixa recorrência | Planejamento e revisão curtos; campos opcionais |
| Linguagem clínica indevida | Interpretação como tratamento | Avisos claros e conteúdo não diagnóstico |
| Plano alimentar desatualizado | Orientação inadequada | Exibir fonte e data; permitir atualização e desativação |
| Exposição de rotina familiar e saúde | Risco de privacidade | Coleta mínima, acesso individual e ausência de segredo embutido no cliente |
| Rigidez da rotina | Rejeição após imprevistos | Blocos flexíveis, desfazer e replanejamento simples |
| Foco excessivo em produtividade | Desequilíbrio | Visão por áreas da vida e ausência de pontuação |

## 17. Out of Scope

Ficam fora do MVP:

- aprendizagem automática de padrões;
- recomendações avançadas baseadas em histórico;
- reorganização automática da semana;
- notificações push, SMS ou e-mail;
- integração com Google Calendar, Outlook ou Apple Calendar;
- importação ou sincronização automática do plano de estudos;
- edição do currículo de estudos;
- telemedicina ou comunicação com profissionais de saúde;
- diagnóstico, triagem, prescrição ou avaliação de sintomas;
- sugestões nutricionais ou alteração do plano alimentar;
- gamificação, pontos, medalhas, rankings e sequências obrigatórias;
- contas familiares, compartilhamento e múltiplos usuários;
- colaboração com empregadores;
- relatórios clínicos;
- aplicativo móvel nativo.

## 18. Evoluções posteriores

Após validar o MVP e acumular histórico suficiente, o produto poderá:

- indicar blocos frequentemente reprogramados;
- comparar duração estimada e observada;
- sugerir redução ou divisão de tarefas;
- indicar dias com sobrecarga recorrente;
- sugerir períodos em que determinados tipos de atividade funcionam melhor;
- oferecer resumo semanal de padrões;
- integrar calendários externos;
- enviar lembretes configuráveis.

Toda recomendação deve explicar quais registros a motivaram, ser dispensável e depender de confirmação antes de alterar a agenda.

## 19. Implementation Decisions

Estas decisões descrevem capacidades do produto, sem fixar tecnologia:

- Separar **modelo semanal recorrente** de **instâncias diárias**, para permitir ajustes pontuais sem alterar toda a rotina.
- Tratar compromissos fixos, blocos flexíveis, tarefas, refeições e margens como conceitos distintos.
- Manter planejamento e revisão como fluxos independentes, conectados pelo ritual noturno.
- Centralizar regras de capacidade, conflito, jornada de trabalho e prioridade em um módulo de planejamento.
- Centralizar estados e decisões de pendência em um módulo de revisão diária.
- Manter conteúdo do plano alimentar como referência versionada, com fonte e data visíveis.
- Tratar o plano de estudos como meta e blocos de tempo, não como cópia completa do currículo.
- Armazenar alterações de agenda somente após confirmação explícita.
- Preservar histórico diário separado da configuração recorrente.
- Não usar a senha informada no briefing como segredo público ou credencial embutida. A experiência pode continuar simples, mas o acesso deve evitar exposição trivial dos dados pessoais.

## 20. Testing Decisions

Um bom teste deve verificar comportamento observável do produto, não detalhes internos de implementação.

Devem ser priorizados testes para:

- geração da proposta semanal sem conflito com compromissos fixos;
- cálculo do horário recomendado de saída para dias presenciais;
- cálculo das horas de trabalho e alerta dos limites de 8 e 10 horas;
- limite de três prioridades;
- identificação de sobreposição e excesso de capacidade;
- preservação de blocos de cuidado do filho;
- aplicação dos quatro estados de revisão;
- garantia de que pendências não sejam reagendadas sem confirmação;
- diferenças entre alteração de um dia e alteração da recorrência semanal;
- seleção do cardápio de dia com ou sem treino;
- acessibilidade dos fluxos de planejamento e revisão;
- persistência e recuperação do histórico;
- tom de mensagens críticas, evitando linguagem punitiva.

Como ainda não existe implementação no repositório, não há testes anteriores que possam servir de referência. A estratégia detalhada deverá ser definida quando a tecnologia e os primeiros módulos forem escolhidos.

## 21. Dados pendentes para configuração, não para aprovação do PRD

Estes dados devem ser solicitados pelo próprio onboarding ou definidos antes da carga inicial:

- quais são os três dias de cuidado solo do filho;
- horários habituais de início e fim do trabalho;
- duração de preparação e deslocamento nos dias presenciais;
- dias e horários de treino;
- horário de sono desejado;
- compromissos fixos ainda não mencionados;
- preferência inicial de meta semanal de estudos;
- frequência desejada para música;
- necessidade de trabalho aos fins de semana;
- necessidade de registrar duração real das atividades.

## 22. Further Notes

- O briefing sugere Vercel e armazenamento simples, mas a escolha de infraestrutura pertence à etapa técnica. O requisito de produto é acesso individual, persistência adequada e implantação web responsiva.
- Mesmo sendo um produto pessoal, rotina familiar, terapia e alimentação são dados privados. “Não precisa de segurança” não deve ser interpretado como autorização para publicar credenciais ou deixar esses dados acessíveis.
- O plano alimentar consultado está datado de 06/10/2026 e identifica uma profissional responsável. O produto deve evitar replicar dados de contato desnecessários e exibir somente o conteúdo útil ao destinatário.
- Este PRD limita-se ao produto. Arquitetura, modelo de dados, APIs, hospedagem e estratégia de autenticação serão definidos em etapa posterior.
