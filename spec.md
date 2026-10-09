# Especificação Técnica — Apoio à Rotina

**Status:** pronta para decomposição em slices de implementação  
**Versão:** 1.0  
**Fontes:** PRD v1.0 e contexto técnico  
**Escopo:** MVP web responsivo para uso individual

## Problem Statement

O usuário precisa transformar compromissos fixos, trabalho, paternidade, terapia, alimentação, estudos, música e descanso em uma rotina semanal executável. Calendários convencionais registram horários, mas não ajudam a planejar por capacidade, limitar prioridades, proteger margens, compreender conflitos nem decidir conscientemente o destino de pendências.

A solução deve funcionar principalmente em dois momentos: o planejamento da véspera e a revisão do dia encerrado. Ela precisa reduzir carga cognitiva, oferecer estrutura sem retirar autonomia e evitar linguagem ou mecanismos que associem produtividade a valor pessoal. Como os registros incluem rotina familiar, terapia e alimentação, o acesso individual e a privacidade continuam obrigatórios mesmo em um produto pessoal e sem banco de dados no MVP.

O contexto técnico estabelece uma aplicação React implantada na Vercel, validada por workflows e apoiada inicialmente por arquivos CSV. Essa simplicidade não pode levar a credenciais distribuídas no cliente, gravações efêmeras incompatíveis com a Vercel ou exposição pública dos dados. A persistência deve, portanto, ficar atrás de uma interface própria e usar um adapter compatível com o ambiente de execução escolhido.

## Solution

Construir uma aplicação web React responsiva e de baixa carga cognitiva que ofereça:

- acesso individual persistente;
- configuração guiada da rotina recorrente e das preferências de capacidade;
- geração de uma proposta semanal explicável e sujeita a aprovação;
- planejamento da véspera com até três prioridades, compromissos fixos, margens, alertas e tarefas sem horário;
- linha do tempo diária cronológica;
- revisão do dia com estados factuais e decisão explícita sobre cada pendência;
- visão semanal de equilíbrio entre áreas da vida;
- histórico separado da rotina recorrente;
- referências de alimentação e metas graduais de estudo;
- persistência substituível, iniciando por arquivos CSV sem acoplar o domínio ao formato;
- validação automatizada de compilação, testes e qualidade antes da implantação na Vercel.

A arquitetura será organizada em módulos profundos. O módulo de rotina concentrará regras de configuração e recorrência; o módulo de planejamento concentrará geração, conflito, capacidade, prioridades, deslocamento e confirmação; o módulo de revisão concentrará estados e destinos de pendências; e o módulo de persistência esconderá CSV e qualquer adapter futuro atrás de uma interface pequena.

O seam principal de teste será a interface pública das jornadas da aplicação, exercitada pelo comportamento observável do usuário. Esse seam cobrirá configuração, planejamento, confirmação, revisão e consulta semanal com um adapter de persistência controlado. Testes menores só serão usados para regras puras com grande matriz de casos, sem duplicar a cobertura das jornadas.

## User Stories

1. Como usuário, quero acessar meus dados com uma identificação individual, para impedir acesso casual de terceiros.
2. Como usuário, quero permanecer autenticado de maneira segura por um período adequado, para não repetir o acesso a cada consulta noturna.
3. Como usuário, quero encerrar minha sessão, para proteger meus dados em um dispositivo compartilhado.
4. Como usuário, quero que minha senha não apareça na interface, no código entregue ao navegador ou nos arquivos de dados, para preservar minha privacidade.
5. Como usuário, quero concluir uma configuração inicial guiada, para não começar com uma agenda vazia.
6. Como usuário, quero preencher a configuração em etapas curtas, para reduzir a carga cognitiva.
7. Como usuário, quero revisar valores padrão antes de confirmá-los, para manter controle sobre minha rotina.
8. Como usuário, quero deixar informações desconhecidas como “a confirmar”, para não precisar inventar dados.
9. Como usuário, quero informar meus dias e horários de trabalho, para que a rotina represente minha jornada real.
10. Como usuário, quero configurar uma jornada padrão de oito horas, para perceber quando o plano se distancia do habitual.
11. Como usuário, quero configurar um limite excepcional de dez horas, para ser alertado antes de excedê-lo.
12. Como usuário, quero registrar dias de trabalho presencial, para incluir preparação e deslocamento.
13. Como usuário, quero informar o horário limite de chegada presencial, para receber um horário recomendado de saída.
14. Como usuário, quero configurar duração de preparação e deslocamento, para que o horário recomendado seja realista.
15. Como usuário, quero registrar compromissos recorrentes, para não recriá-los toda semana.
16. Como usuário, quero distinguir compromissos fixos de blocos flexíveis, para que o sistema trate cada um adequadamente.
17. Como usuário, quero registrar a terapia como compromisso recorrente, para protegê-la contra conflitos acidentais.
18. Como usuário, quero planejar trabalho depois da terapia em uma exceção confirmada, para adaptar uma quinta-feira específica.
19. Como usuário, quero registrar os períodos de cuidado solo do meu filho, para não planejar atividades incompatíveis.
20. Como usuário, quero reservar tempo de convivência familiar, para equilibrar trabalho e paternidade.
21. Como usuário, quero registrar períodos indisponíveis e sono, para que eles reduzam a capacidade planejável.
22. Como usuário, quero registrar o ensaio da orquestra aos sábados, para organizar o restante do dia ao redor dele.
23. Como usuário, quero configurar pausas, transições e margens, para absorver trocas de contexto e imprevistos.
24. Como usuário, quero definir minha preferência de carga, para receber uma proposta compatível com meu momento.
25. Como usuário, quero definir categorias de áreas da vida, para visualizar equilíbrio sem depender apenas de produtividade.
26. Como usuário, quero criar blocos flexíveis de estudo, para avançar na formação sem competir de forma irrealista com outras responsabilidades.
27. Como usuário, quero definir uma meta semanal ajustável de estudo, para começar de forma gradual.
28. Como usuário, quero classificar estudo como teoria, laboratório/case, aplicação/reflexão ou revisão, para acompanhar sua composição.
29. Como usuário, quero registrar tempo planejado e realizado de estudo, para comparar intenção e execução sem julgamento.
30. Como usuário, quero criar blocos distintos para estudo musical, composição e violino, para preservar meus interesses pessoais.
31. Como usuário, quero manter música como objetivo flexível, para não transformá-la em obrigação semanal.
32. Como usuário, quero visualizar refeições recorrentes nos horários prescritos, para incorporá-las ao dia.
33. Como usuário, quero distinguir dias com e sem treino, para consultar a referência alimentar correspondente.
34. Como usuário, quero alterar horários ou ocultar lembretes de refeições, para controlar como essa referência aparece.
35. Como usuário, quero ver a fonte e a data da referência alimentar, para saber qual prescrição está sendo exibida.
36. Como usuário, quero que o produto não reinterprete porções ou orientações nutricionais, para evitar recomendações indevidas.
37. Como usuário, quero receber uma proposta semanal baseada na minha configuração, para reduzir o esforço de começar.
38. Como usuário, quero que a proposta respeite compromissos fixos, cuidado familiar e indisponibilidades, para evitar conflitos previsíveis.
39. Como usuário, quero entender por que um bloco foi sugerido em determinado horário, para decidir se a sugestão faz sentido.
40. Como usuário, quero aceitar uma sugestão, para incorporá-la à rotina.
41. Como usuário, quero editar uma sugestão, para ajustá-la à minha realidade.
42. Como usuário, quero remover uma sugestão, para não tratá-la como obrigação.
43. Como usuário, quero que sugestões permaneçam pendentes até minha confirmação, para manter autonomia.
44. Como usuário, quero confirmar uma versão da rotina recorrente, para usá-la na criação dos dias.
45. Como usuário, quero alterar uma instância diária sem mudar a recorrência, para lidar com exceções.
46. Como usuário, quero alterar explicitamente a recorrência semanal, para adaptar mudanças permanentes na minha vida.
47. Como usuário, quero visualizar primeiro a data, o contexto, as prioridades e os compromissos fixos, para entender o dia em poucos segundos.
48. Como usuário, quero planejar o dia seguinte na véspera, para reduzir decisões ao começar o dia.
49. Como usuário, quero selecionar no máximo três prioridades ativas, para manter foco realista.
50. Como usuário, quero substituir uma prioridade quando o limite for atingido, para decidir conscientemente o que é essencial.
51. Como usuário, quero visualizar uma linha do tempo cronológica, para entender a sequência do dia.
52. Como usuário, quero ver espaços livres na linha do tempo, para não interpretar todo intervalo como tempo a preencher.
53. Como usuário, quero distinguir categorias por texto, ícone e cor, para compreender os itens sem depender somente da cor.
54. Como usuário, quero reorganizar blocos flexíveis, para adequar o plano às circunstâncias do dia.
55. Como usuário, quero alterar a duração de um bloco, para representar melhor o esforço esperado.
56. Como usuário, quero adicionar uma tarefa rapidamente, para não perder algo que preciso fazer.
57. Como usuário, quero editar uma tarefa, para corrigir ou atualizar seus dados.
58. Como usuário, quero remover uma tarefa criada por engano, para manter o plano correto.
59. Como usuário, quero desfazer uma remoção, para recuperar um item excluído acidentalmente.
60. Como usuário, quero atribuir categoria, data, horário e duração estimada a uma tarefa, para posicioná-la no plano.
61. Como usuário, quero manter uma tarefa sem horário, para decidir depois sem poluir a linha do tempo.
62. Como usuário, quero transformar uma tarefa em prioridade, para destacá-la no dia.
63. Como usuário, quero dividir uma tarefa em partes menores, para torná-la mais iniciável.
64. Como usuário, quero adicionar uma nota ao dia, para registrar contexto geral.
65. Como usuário, quero adicionar uma nota a uma tarefa, para guardar detalhes úteis à execução.
66. Como usuário, quero planejar e confirmar o dia sem preencher notas, para evitar burocracia.
67. Como usuário, quero ser alertado sobre sobreposição de horários, para revisar o conflito antes de confirmar.
68. Como usuário, quero ser alertado sobre ausência de margens, para deixar espaço para transições.
69. Como usuário, quero ver a carga planejada por área da vida, para avaliar equilíbrio.
70. Como usuário, quero ser alertado quando a carga exceder minha disponibilidade, para reduzir o plano conscientemente.
71. Como usuário, quero ver separadamente as horas de trabalho, para que refeições, terapia, deslocamento e família não sejam contabilizados como trabalho.
72. Como usuário, quero ser avisado ao me aproximar da jornada excepcional de dez horas, para proteger meus limites.
73. Como usuário, quero confirmar um plano mesmo com alertas, para manter a decisão final.
74. Como usuário, quero que alertas não bloqueiem minhas ações, para que a ferramenta ofereça apoio em vez de controle.
75. Como usuário, quero que nenhuma alteração seja publicada antes de minha confirmação, para evitar mudanças silenciosas.
76. Como usuário, quero abrir o dia atual no fim do dia, para revisar o que ocorreu.
77. Como usuário, quero marcar um item como realizado, para registrar sua conclusão.
78. Como usuário, quero marcar um item como parcial, para reconhecer progresso sem fingir conclusão.
79. Como usuário, quero marcar um item como reprogramado, para registrar uma mudança deliberada.
80. Como usuário, quero marcar um item como descartado, para indicar que ele deixou de ser necessário.
81. Como usuário, quero distinguir remover de descartar, para preservar o significado histórico das decisões.
82. Como usuário, quero registrar opcionalmente um motivo para um item não concluído, para refletir sem obrigação.
83. Como usuário, quero decidir manter uma pendência sem data, para tratá-la mais tarde.
84. Como usuário, quero reduzir uma pendência, para adequá-la à capacidade disponível.
85. Como usuário, quero dividir uma pendência, para torná-la mais manejável.
86. Como usuário, quero trocar uma pendência de dia, para reagir a um imprevisto.
87. Como usuário, quero descartar uma pendência, para não carregar algo sem valor.
88. Como usuário, quero visualizar conflitos e capacidade do dia de destino antes de reprogramar, para decidir com informação.
89. Como usuário, quero confirmar o destino de cada pendência, para impedir reagendamento automático.
90. Como usuário, quero concluir a revisão mesmo com pendências mantidas sem horário, para não ficar preso ao fluxo.
91. Como usuário, quero registrar opcionalmente minha energia em uma escala curta, para reconhecer padrões pessoais.
92. Como usuário, quero registrar opcionalmente minha sobrecarga em uma escala curta, para comparar plano e experiência.
93. Como usuário, quero concluir a revisão sem informar energia, sobrecarga ou justificativas, para manter o ritual leve.
94. Como usuário, quero receber uma síntese factual do dia, para compreender o ocorrido sem julgamento moral.
95. Como usuário, quero que refeições concluídas não componham uma pontuação de desempenho, para evitar associação indevida.
96. Como usuário, quero seguir da revisão de hoje ao planejamento de amanhã, para completar meu ritual noturno.
97. Como usuário, quero consultar a semana inteira, para detectar dias carregados antes que ocorram.
98. Como usuário, quero ver compromissos fixos e blocos flexíveis na semana, para distinguir o que pode ser ajustado.
99. Como usuário, quero ver horas planejadas e registradas de trabalho, para acompanhar meus limites.
100. Como usuário, quero ver se há espaço para família, saúde, estudo, música e descanso, para buscar equilíbrio.
101. Como usuário, quero identificar itens reprogramados repetidamente, para decidir se devem ser reduzidos, divididos ou descartados.
102. Como usuário, quero ver conflitos e pendências que exigem decisão, para ajustar a semana conscientemente.
103. Como usuário, quero mover ou reduzir blocos flexíveis na visão semanal, para aliviar dias sobrecarregados.
104. Como usuário, quero receber confirmação antes de alterar um compromisso fixo, para evitar mudanças acidentais.
105. Como usuário, quero consultar dias anteriores e suas revisões, para refletir sobre minha rotina.
106. Como usuário, quero que consultar ou editar um dia anterior não altere a rotina recorrente, para preservar o planejamento futuro.
107. Como usuário, quero recuperar meus dados depois de fechar ou atualizar o navegador, para confiar na persistência.
108. Como usuário, quero que gravações concorrentes não apaguem silenciosamente mudanças recentes, para preservar a integridade do histórico.
109. Como usuário, quero receber uma mensagem clara quando um dado não puder ser salvo, para saber que preciso tentar novamente.
110. Como usuário, quero usar o produto no celular e no desktop, para planejar onde estiver.
111. Como usuário de teclado, quero alcançar todas as ações principais com foco visível, para usar o produto sem mouse.
112. Como usuário de leitor de tela, quero nomes, estados e mensagens compreensíveis, para navegar pela aplicação.
113. Como usuário com baixa percepção de contraste, quero cores compatíveis com WCAG 2.2 AA, para ler o conteúdo com clareza.
114. Como usuário que prefere movimento reduzido, quero que a aplicação respeite essa preferência, para evitar distração.
115. Como usuário, quero formulários curtos e progressivos, para não enfrentar muitas decisões de uma vez.
116. Como usuário, quero datas, horários e durações inequívocos, para evitar interpretações erradas.
117. Como usuário, quero uma interface clean, com hierarquia visual previsível, para encontrar rapidamente o que importa.
118. Como usuário, quero ausência de pop-ups e recompensas intermitentes, para evitar disputa pela minha atenção.
119. Como usuário, quero linguagem direta, acolhedora e não infantilizada, para me sentir respeitado.
120. Como usuário, quero que a aplicação evite termos punitivos, rankings, pontos e sequências, para revisar o dia sem culpa.
121. Como usuário, quero que a aplicação não faça inferências clínicas, para não confundir organização pessoal com tratamento.
122. Como mantenedor, quero executar automaticamente compilação, testes e validações de qualidade em mudanças propostas, para detectar regressões antes da integração.
123. Como mantenedor, quero bloquear a implantação quando uma validação obrigatória falhar, para não publicar uma versão inconsistente.
124. Como mantenedor, quero implantar automaticamente na Vercel após a validação da versão destinada à produção, para tornar a entrega reproduzível.
125. Como mantenedor, quero ambientes de pré-visualização para mudanças quando suportados pelo fluxo, para validar comportamento antes da produção.
126. Como mantenedor, quero manter segredos apenas nas configurações protegidas dos ambientes, para que não sejam enviados ao repositório nem ao navegador.
127. Como mantenedor, quero substituir o adapter CSV sem alterar as regras de rotina, planejamento e revisão, para permitir evolução futura da persistência.
128. Como mantenedor, quero schemas explícitos e versionados para os dados persistidos, para detectar registros inválidos e realizar migrações conscientes.
129. Como mantenedor, quero erros de leitura e gravação apresentados de modo recuperável, para evitar corrupção silenciosa ou perda de confiança.
130. Como mantenedor, quero testar jornadas pela interface pública da aplicação, para verificar comportamento sem acoplar testes à implementação interna.

## Implementation Decisions

### Arquitetura e tecnologia

- O MVP será uma aplicação web React, responsiva e orientada às jornadas de configuração, planejamento, revisão, semana e histórico.
- A aplicação deve usar TypeScript em modo estrito para modelar invariantes e reduzir estados inválidos. A escolha final do framework React pode ser feita no bootstrap, mas deve oferecer execução no servidor para autenticação e acesso privado aos dados, além de implantação suportada pela Vercel.
- A lógica de domínio não dependerá de React, do framework web, do formato CSV nem do ambiente da Vercel.
- Os módulos devem ser profundos: cada interface pública deve esconder validação, invariantes, cálculos e transições relacionadas, evitando que regras sejam repetidas em telas ou adapters.
- Datas e horários serão interpretados no fuso horário configurado para o usuário. Datas civis, horários locais e instantes de auditoria devem permanecer conceitos distintos para evitar deslocamentos indevidos.
- Toda gravação relevante deverá retornar sucesso ou erro explícito. A interface só apresentará confirmação após a persistência ter sido concluída.

### Módulo de acesso individual

- O acesso será de usuário único no MVP, mas a sessão continuará validada no servidor.
- E-mail e credencial não serão usados como segredo embutido no bundle React.
- A senha não será criptografada reversivelmente em CSV. Será armazenado somente um hash lento com salt, e a comparação ocorrerá exclusivamente em ambiente servidor.
- Segredos de sessão e parâmetros sensíveis ficarão em variáveis protegidas do ambiente de execução.
- A sessão usará cookie seguro, `HttpOnly` e política `SameSite` adequada; o navegador não receberá hash de senha nem segredo de sessão.
- Rotas e operações de dados privadas exigirão sessão válida no servidor, e não apenas ocultação visual no cliente.
- Não haverá recuperação de senha por e-mail no MVP; a troca de credencial será uma operação administrativa controlada.

### Módulo de configuração da rotina

- A configuração registrará jornada de trabalho, dias presenciais, chegada, preparação, deslocamento, compromissos recorrentes, cuidado familiar, indisponibilidades, sono, alimentação, dias de treino, metas flexíveis, margens e preferência de carga.
- Dados ainda não informados terão estado explícito de “a confirmar”; o sistema não presumirá dias de cuidado solo, treino, deslocamento ou horários ausentes.
- A rotina recorrente será separada das instâncias diárias. Alterar um dia não modificará automaticamente recorrências futuras.
- Um item recorrente terá identidade estável, vigência e regra de recorrência. Mudanças futuras não reescreverão o histórico já materializado.
- Compromissos serão classificados como fixos ou flexíveis. Alterar um compromisso fixo exigirá ação e confirmação explícitas.
- Categorias iniciais incluirão trabalho, família, saúde, alimentação, estudo, música, descanso e pessoal; a apresentação nunca dependerá exclusivamente de cor.

### Módulo de proposta semanal

- A proposta semanal será gerada a partir da configuração, respeitando primeiro compromissos fixos, cuidado familiar, sono e indisponibilidades.
- Em seguida, a geração reservará preparação, deslocamentos, refeições, pausas, transições e margens antes de posicionar objetivos flexíveis.
- Trabalho usará oito horas como referência normal e dez horas como limite excepcional configurado.
- Terapia, refeições, preparação, deslocamento, família, saúde e descanso não serão contabilizados como trabalho.
- Estudos e música serão posicionados como blocos flexíveis e graduais; a meta externa de dez horas de estudo não será imposta automaticamente.
- Toda sugestão carregará uma explicação curta baseada nas restrições e preferências que justificaram seu posicionamento.
- A proposta será um rascunho. Aceitar, editar ou remover sugestões não afetará a rotina ativa até confirmação explícita do conjunto.

### Módulo de planejamento

- O módulo de planejamento será a fonte única das regras de cronologia, conflito, capacidade, jornada de trabalho, margens, prioridades e horário de saída.
- Sua interface receberá a configuração relevante e o rascunho do dia, retornando uma visão calculada com linha do tempo, espaços livres, carga por categoria, horas de trabalho, conflitos, ausência de margem e alertas.
- O módulo não persistirá nem apresentará dados diretamente; produzirá resultados determinísticos para que os mesmos cálculos sejam usados nas jornadas e nos testes.
- O limite de prioridades será uma invariante: no máximo três prioridades ativas por dia. Uma quarta seleção exigirá retirar ou substituir uma das atuais.
- Conflitos e excesso de capacidade serão alertas não bloqueantes. O usuário poderá confirmar o plano após reconhecer os alertas.
- A proteção de um compromisso fixo ou período de cuidado será mais forte que a de um bloco flexível: alterações exigirão confirmação específica, mas continuarão possíveis.
- O horário recomendado de saída será calculado subtraindo preparação e deslocamento do horário limite de chegada.
- A linha do tempo exibirá itens agendados em ordem cronológica e representará espaços livres e tarefas sem horário separadamente.
- A confirmação materializará uma instância diária independente da rotina recorrente e registrará a versão dos dados usados na geração.

### Módulo de tarefas e notas

- Uma tarefa poderá ter título, categoria, data opcional, horário opcional, duração estimada opcional, prioridade, nota e relação opcional com uma tarefa de origem quando houver divisão.
- Tarefas sem horário permanecerão fora da sequência cronológica e aparecerão como itens ainda não posicionados.
- Dividir uma tarefa criará partes rastreáveis sem marcar automaticamente a tarefa original como realizada.
- Remover representará correção de cadastro e terá confirmação ou desfazer. Descartar será um resultado de revisão preservado no histórico.
- Notas de dia e de tarefa serão opcionais e não impedirão planejamento ou revisão.

### Módulo de revisão diária

- Um item planejado aceitará os estados `realizado`, `parcial`, `reprogramado` e `descartado`.
- Itens não concluídos poderão receber uma decisão explícita: manter, reduzir, dividir, trocar de dia ou descartar.
- Nenhuma pendência será movida automaticamente. Trocar de dia produzirá uma proposta sujeita a cálculo de conflito/capacidade e confirmação.
- “Manter” preservará a pendência sem escolher automaticamente uma nova data.
- “Reduzir” alterará conscientemente o escopo ou a duração estimada; “dividir” produzirá novas partes relacionadas; “descartar” encerrará o item mantendo sua trilha histórica.
- Energia, sobrecarga, motivo e nota serão opcionais. As escalas deverão ser curtas e não terão interpretação clínica.
- A síntese será derivada dos estados registrados e usará linguagem factual, sem nota moral, pontuação, ranking ou sequência.
- A revisão concluída será imutável por padrão na consulta histórica; uma eventual correção deverá ser explícita e não alterar recorrências.

### Módulo de visão semanal e histórico

- A visão semanal agregará instâncias diárias, compromissos recorrentes aplicáveis, carga por categoria, horas de trabalho, alertas, pendências e reprogramações.
- Planejado e realizado permanecerão valores distintos. Ausência de registro realizado não será interpretada automaticamente como falha.
- Itens frequentemente reprogramados serão identificados por histórico de decisões, sem produzir julgamento ou recomendação automática no MVP.
- A visão permitirá editar blocos flexíveis e iniciar alterações explícitas em compromissos fixos.
- A consulta histórica nunca modificará automaticamente a rotina recorrente nem materializará novos dias.

### Alimentação e estudos

- A referência alimentar será armazenada como conteúdo versionado com fonte e data, associada a tipos de dia com ou sem treino.
- O produto exibirá a prescrição fornecida sem calcular calorias, reinterpretar porções ou sugerir alterações.
- Dados de contato desnecessários da profissional responsável não serão replicados.
- O estudo será representado por meta semanal ajustável e blocos classificados como teoria, laboratório/case, aplicação/reflexão ou revisão.
- O MVP calculará somente tempo planejado e tempo realizado por tipo, sem importar ou editar o currículo externo.

### Persistência e modelo de dados

- O domínio acessará dados por uma única interface de persistência de alto nível, orientada a carregar e salvar o estado do usuário e não a operações específicas de CSV.
- A primeira implementação poderá usar CSV, mas o adapter será executado em ambiente servidor e será invisível para o cliente React.
- Como o sistema de arquivos de funções da Vercel não oferece persistência durável para gravações em produção, o adapter CSV de produção deverá usar armazenamento persistente externo compatível com arquivos/objetos ou volume equivalente. CSV empacotado com a implantação poderá servir apenas como seed de leitura, nunca como destino confiável de gravação.
- O formato físico será dividido por conjuntos coerentes, como perfil/configuração, recorrências, dias, itens, revisões e referências, evitando um único CSV polimórfico e frágil.
- Cada registro terá identificador estável, versão de schema e timestamps de criação/atualização quando aplicáveis.
- Valores enumerados usarão códigos estáveis independentes dos textos apresentados na interface.
- Campos de texto serão escapados conforme RFC 4180; datas e números terão formatos canônicos independentes da localização visual.
- O adapter validará todo conteúdo lido contra schemas antes de entregá-lo aos módulos de domínio. Registros inválidos gerarão erro explícito e não serão ignorados silenciosamente.
- Gravações deverão ser atômicas no limite oferecido pelo armazenamento e proteger contra atualização perdida por meio de versão ou token de concorrência.
- Seeds iniciais conterão apenas compromissos confirmados no PRD. Informações ausentes permanecerão “a confirmar”.
- O hash de credencial, caso mantido no mesmo meio lógico, ficará separado dos arquivos de rotina e nunca será retornado pelas operações comuns de leitura.

### Interface de usuário e acessibilidade

- A hierarquia da tela diária será: contexto do dia, prioridades, compromissos fixos, linha do tempo, alertas, carga por área e tarefas sem horário.
- O design será clean, com densidade controlada, poucos níveis de ação concorrentes e cores calmas com contraste WCAG 2.2 AA.
- Estado, categoria, conflito e prioridade usarão texto e/ou ícone além de cor.
- Todas as ações principais funcionarão por teclado, terão foco visível e nomes acessíveis.
- A interface respeitará preferência por movimento reduzido.
- Ações destrutivas ou semanticamente finais oferecerão confirmação ou desfazer, conforme o contexto.
- Mensagens evitarão “fracasso”, “falhou”, “dia ruim”, “atrasado”, “sequência perdida” e quaisquer inferências sobre sintomas.
- O layout será mobile-first, sem retirar capacidade funcional no desktop.

### Integrações internas e contratos

- A camada web chamará casos de uso do domínio e receberá resultados serializáveis com dados, alertas e erros de validação estruturados.
- Erros esperados serão diferenciados entre entrada inválida, conflito de versão, sessão inválida e indisponibilidade de persistência.
- Alertas de planejamento não serão representados como erros de validação, pois não bloqueiam confirmação.
- O módulo de revisão reutilizará o cálculo do módulo de planejamento ao propor troca de dia, evitando regras divergentes.
- Os adapters de autenticação e persistência serão injetados nos casos de uso; módulos de domínio não criarão dependências de infraestrutura internamente.

### Entrega contínua e Vercel

- O repositório futuro terá workflow de integração contínua para instalação reproduzível, verificação de formatação/lint, checagem de tipos, testes e build de produção.
- O workflow falhará imediatamente quando qualquer validação obrigatória falhar.
- Pull requests executarão as validações sem usar segredos de produção.
- A implantação de produção ocorrerá somente após validações bem-sucedidas na branch de produção e usará credenciais protegidas do GitHub/Vercel.
- Quando adotada, a implantação de pré-visualização deverá usar ambiente e dados isolados de produção.
- Dependências serão travadas por lockfile e atualizações deverão passar pelas mesmas validações.
- Segredos, credenciais, hashes reais e arquivos de dados pessoais não serão versionados.

### Slices de implementação recomendados

1. Fundamentos da aplicação, qualidade, build, acessibilidade básica e pipeline sem dados pessoais.
2. Acesso individual com sessão no servidor e persistência segura da credencial.
3. Interface de persistência, schemas versionados e adapter inicial para dados seed.
4. Configuração guiada e manutenção da rotina recorrente.
5. Geração e aprovação da proposta semanal.
6. Planejamento diário, linha do tempo, prioridades, capacidade e alertas.
7. Tarefas, notas, divisão, remoção e desfazer.
8. Revisão diária e decisões explícitas de pendência.
9. Visão semanal, histórico e identificação factual de reprogramações.
10. Alimentação versionada, estudos e música.
11. Hardening de acessibilidade, responsividade, falhas de persistência e implantação produtiva.

Cada slice deverá entregar comportamento vertical observável e testes no seam público correspondente, evitando criar módulos de passagem sem regras próprias.

## Testing Decisions

- Um bom teste verifica comportamento externo: o que o usuário vê, quais decisões pode tomar, quais alterações permanecem após recarregar e quais mensagens são apresentadas. Não deve afirmar nomes de funções internas, estrutura de estado React, quantidade de chamadas, classes CSS ou detalhes do CSV.
- O seam principal será a interface pública das jornadas da aplicação com um adapter de persistência controlado. Esse seam permitirá testar configuração → proposta → confirmação → planejamento → revisão → histórico como fluxos verticais.
- Esse seam é novo porque ainda não existe implementação. Ele será colocado no ponto mais alto possível: os casos de uso acionados pela interface web, incluindo regras do domínio e persistência substituível, mas excluindo serviços externos reais.
- O módulo de acesso será testado por comportamento de sessão: credencial válida, credencial inválida, encerramento, proteção de rotas e ausência de dados sensíveis na resposta ao cliente.
- O módulo de configuração será testado pela preservação de campos “a confirmar”, distinção entre fixo/flexível e isolamento entre recorrência e alteração diária.
- O módulo de proposta semanal será testado pela geração sem sobreposição de compromissos protegidos, explicações de posicionamento, progressão gradual e necessidade de aprovação.
- O módulo de planejamento será testado por sua interface determinística para matrizes extensas de horários: sobreposição, capacidade, margens, horas de trabalho, proteção familiar, limite de prioridades e horário recomendado de saída.
- O módulo de tarefas será testado para criação, edição, remoção/desfazer, tarefa sem horário, promoção a prioridade e divisão rastreável.
- O módulo de revisão será testado para os quatro estados, cinco destinos de pendência, campos opcionais e ausência de reagendamento automático.
- A visão semanal será testada para agregações observáveis, separação entre planejado/realizado, histórico imutável e ausência de pontuação.
- Alimentação será testada para seleção do tipo de dia, edição/ocultação de horários, exibição de fonte/data e ausência de inferência nutricional.
- Estudos serão testados para meta ajustável, categorias permitidas e somatórios de tempo planejado/realizado.
- O adapter CSV será submetido a testes de contrato compartilhados com qualquer adapter futuro: leitura e gravação equivalentes, round-trip de caracteres especiais, schema inválido, concorrência, falha de armazenamento e ausência de exposição da credencial.
- Testes de acessibilidade automatizados cobrirão as jornadas principais, complementados por verificação de teclado, ordem de foco, leitor de tela, contraste e movimento reduzido.
- Testes responsivos cobrirão pelo menos viewport móvel e desktop nas telas diária, semanal, onboarding e revisão.
- Testes de conteúdo impedirão linguagem punitiva nas mensagens críticas e sínteses.
- O build de produção será uma verificação obrigatória do pipeline, além dos testes e da checagem de tipos.
- A implantação será validada com smoke test sem dados pessoais: carregamento da aplicação, proteção de rota privada e disponibilidade do fluxo de acesso.
- Casos baseados no PRD incluirão quarta e quinta presenciais com chegada até 10h, terapia na quinta às 18h com eventual trabalho posterior, sábado com ensaio das 9h às 13h, refeições recorrentes e períodos configuráveis de cuidado familiar.
- Prior art: não há implementação nem suíte de testes no diretório atual. Os testes inaugurais deverão estabelecer os padrões para slices posteriores, priorizando testes de jornada e contratos de adapters.

## Out of Scope

- Criação do repositório GitHub ou de qualquer código nesta etapa de especificação.
- Publicação desta especificação em issue tracker.
- Implementação da aplicação, infraestrutura, workflows ou projeto Vercel nesta etapa.
- Banco de dados relacional ou arquitetura destinada a múltiplos usuários no MVP.
- Aplicativo móvel nativo.
- Aprendizagem automática, inferência de padrões ou reorganização automática da semana.
- Reagendamento automático de pendências.
- Recomendações avançadas baseadas no histórico.
- Notificações push, SMS ou e-mail.
- Integração com Google Calendar, Outlook ou Apple Calendar.
- Importação e sincronização automática do plano de estudos.
- Reprodução ou edição do currículo completo de estudos.
- Diagnóstico, triagem, tratamento, prescrição ou avaliação clínica de TDAH.
- Telemedicina e comunicação com profissionais de saúde.
- Reinterpretação do plano alimentar, cálculo nutricional ou sugestão de mudanças.
- Gamificação, pontos, medalhas, rankings, streaks ou pontuação de produtividade.
- Contas familiares, compartilhamento, colaboração ou permissões multiusuário.
- Recuperação automatizada de senha por e-mail.
- Relatórios clínicos ou compartilhamento com empregadores.
- Garantia de escala além do uso individual previsto.

## Further Notes

- Esta especificação deliberadamente corrige um ponto inseguro do contexto técnico: senhas não devem ser “criptografadas” de forma reversível em CSV. O produto deve armazenar apenas hash de senha com salt e manter a validação no servidor.
- React executado apenas no navegador não pode acessar arquivos CSV privados com segurança nem gravá-los de forma durável na Vercel. A implementação precisará de funções/rotas no servidor e de um armazenamento persistente compatível com o adapter CSV.
- CSV é uma decisão de adapter, não do modelo de domínio. A interface de persistência deve permitir substituição futura sem alterar planejamento e revisão.
- Não há glossário formal, ADRs, código ou testes no diretório atual. Esta especificação usa como vocabulário canônico os termos do PRD: rotina recorrente, instância diária, compromisso fixo, bloco flexível, prioridade, margem, pendência, revisão, realizado, parcial, reprogramado e descartado.
- O seam de teste proposto é único no nível principal: as jornadas públicas da aplicação. Regras puras e adapters terão cobertura complementar somente quando isso aumentar clareza sem fragmentar o desenho.
- Os dados iniciais ainda não confirmados — dias de cuidado solo, treino, horários de trabalho, preparação, deslocamento, sono, meta inicial de estudos, frequência musical e trabalho de fim de semana — devem permanecer configuráveis e explicitamente pendentes.
- O plano alimentar deve ser tratado como referência versionada. Somente o conteúdo necessário ao usuário deve ser carregado; informações pessoais ou profissionais irrelevantes devem ser omitidas.
- Antes da implementação, as decisões difíceis de reverter sobre framework React com execução no servidor e armazenamento persistente de CSV podem ser registradas em ADRs se houver alternativas reais em avaliação.
