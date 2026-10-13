# PRD v3 — Entrevista inicial assistida por IA

## Problem Statement

Uma pessoa que acessa o Apoio à Rotina pela primeira vez encontra um calendário sem informações sobre sua realidade. Para começar a usá-lo, precisa lembrar compromissos, estimar horários, definir prioridades e transformar dados dispersos em uma rotina semanal. Esse esforço inicial pode ser alto, especialmente para pessoas que enfrentam dificuldades de organização, planejamento e memória de trabalho.

O produto já permite configurar uma rotina e construir uma proposta semanal, mas precisa de uma forma mais acessível de ajudar uma pessoa recém-chegada a sair da agenda vazia sem exigir um formulário longo, conhecimento prévio do produto ou muitas decisões de uma vez.

A experiência não pode ser obrigatória, clínica ou punitiva. Ela não deve diagnosticar, tratar ou interpretar condições de saúde. Também deve preservar o controle da pessoa sobre o que será incluído no calendário e não transformar sugestões em obrigações.

## Solution

O produto oferecerá, no primeiro acesso, uma entrevista opcional e breve assistida por IA para ajudar a pessoa a criar uma proposta inicial de calendário semanal.

O convite apresentará claramente as opções **“Começar entrevista”** e **“Fazer depois”**. Quem adiar poderá iniciar a entrevista pelo painel enquanto ainda não tiver concluído um plano inicial, mas continuará podendo usar o calendário manualmente.

A entrevista terá cinco etapas curtas, com barra de progresso. Em cada etapa, a pessoa encontrará opções selecionáveis e, quando desejar, um campo aberto **“Outro / contar com minhas palavras”**. A conversa será acolhedora, prática e não clínica, concentrada em objetivos, horários fixos, sono, refeições, autocuidado, responsabilidades, dificuldades de organização, energia e preferências.

A pessoa poderá anexar opcionalmente um documento de apoio em PDF, DOCX ou TXT. Antes de iniciar o uso da IA e antes de enviar um documento, deverá consentir explicitamente que os dados escolhidos serão enviados ao Gemini Developer API no Free Tier para gerar a proposta. A interface deverá comunicar de forma clara que, nessa modalidade, os dados enviados podem ser usados pelo provedor para melhoria do serviço.

Ao final, o produto apresentará um resumo do que entendeu, uma proposta de calendário em blocos e sugestões práticas de organização. A pessoa poderá aceitar, editar ou refazer partes da proposta antes de salvar. Somente os eventos aprovados entrarão no calendário.

Se a pessoa sair da entrevista antes de concluir, o progresso será perdido. Essa consequência deve ser comunicada claramente antes de iniciar e durante o fluxo quando apropriado. Respostas, documentos, conteúdo extraído e sugestões da IA não serão mantidos como histórico após a entrevista; apenas os eventos aceitos no calendário permanecerão no produto.

Se a IA estiver indisponível, falhar ou não puder processar um documento, a pessoa poderá tentar novamente ou seguir para a criação e edição manual do calendário, sem bloqueio do uso do produto.

## User Stories

1. Como pessoa recém-cadastrada, quero receber um convite claro para criar minha rotina inicial, para não começar diante de uma agenda vazia sem saber por onde seguir.
2. Como pessoa recém-cadastrada, quero poder começar a entrevista ou deixá-la para depois, para decidir quando tenho disposição para organizar minha rotina.
3. Como pessoa que adiou a entrevista, quero encontrá-la novamente no painel enquanto não tiver concluído meu plano inicial, para retomá-la no momento mais adequado.
4. Como pessoa que não quer realizar a entrevista, quero poder criar e editar meu calendário manualmente, para usar o produto sem depender da IA.
5. Como pessoa usuária, quero saber que a entrevista possui cinco etapas, para entender que o processo será breve e previsível.
6. Como pessoa usuária, quero visualizar uma barra de progresso, para saber em que ponto da entrevista estou.
7. Como pessoa usuária, quero responder principalmente por opções simples, para diminuir o esforço de escrever e decidir.
8. Como pessoa usuária, quero selecionar mais de uma opção quando isso fizer sentido, para representar melhor minha rotina.
9. Como pessoa usuária, quero usar um campo aberto para complementar minhas respostas, para informar detalhes que não aparecem nas opções.
10. Como pessoa usuária, quero poder avançar somente com as opções disponíveis, para que o preenchimento aberto não seja obrigatório.
11. Como pessoa usuária, quero informar meu objetivo e prioridade atual, para que a proposta reflita o que é mais importante para mim.
12. Como pessoa usuária, quero registrar trabalho, estudos, consultas e outros horários fixos, para que o calendário respeite compromissos que não posso mover facilmente.
13. Como pessoa usuária, quero informar horários habituais de sono, refeições, descanso e autocuidado, para que a proposta considere necessidades básicas da minha rotina.
14. Como pessoa usuária, quero informar tarefas recorrentes e responsabilidades pessoais ou domésticas, para que o calendário não considere apenas trabalho e compromissos formais.
15. Como pessoa usuária, quero indicar dificuldades de organização, para que as sugestões sejam mais úteis e realistas.
16. Como pessoa usuária, quero informar em quais períodos tenho mais ou menos energia, para que a proposta distribua minhas atividades de forma mais adequada.
17. Como pessoa usuária, quero indicar preferências de organização, para que o plano inicial não pareça imposto ou distante da minha realidade.
18. Como pessoa usuária, quero receber linguagem acolhedora e sem julgamento durante toda a entrevista, para me sentir apoiada sem pressão por produtividade.
19. Como pessoa usuária, quero saber que a IA oferece apoio de organização, e não diagnóstico ou tratamento, para entender os limites da experiência.
20. Como pessoa usuária, quero receber sugestões sem tom clínico ou prescritivo, para manter minha autonomia sobre a rotina.
21. Como pessoa usuária, quero poder anexar um documento de apoio opcional, para aproveitar uma lista de tarefas, alimentação ou outra referência que já possuo.
22. Como pessoa usuária, quero saber quais formatos de documento são aceitos, para não tentar enviar um arquivo que o produto não processa.
23. Como pessoa usuária, quero anexar apenas PDF, DOCX ou TXT, para ter uma experiência de envio simples e compatível.
24. Como pessoa usuária, quero ser informada do limite de um documento, tamanho máximo de 2 MB e conteúdo processável, para entender o que consigo enviar antes de tentar.
25. Como pessoa usuária, quero saber que imagens não são aceitas nesta fase, para não perder tempo preparando um formato indisponível.
26. Como pessoa usuária, quero saber que meu documento será usado apenas para compor a entrevista e não será guardado no produto, para decidir conscientemente se desejo anexá-lo.
27. Como pessoa usuária, quero consentir explicitamente antes que minhas respostas sejam enviadas ao Gemini, para ter controle sobre o uso dos meus dados.
28. Como pessoa usuária, quero receber uma confirmação específica antes de enviar um documento ao Gemini, para decidir separadamente sobre esse conteúdo adicional.
29. Como pessoa usuária, quero ser informada de que a modalidade gratuita do Gemini pode usar dados enviados para melhorar o serviço, para dar um consentimento informado.
30. Como pessoa usuária, quero poder recusar o consentimento e ainda seguir pelo fluxo manual, para que a IA não seja uma condição de uso do produto.
31. Como pessoa usuária, quero ver um resumo da rotina que o produto entendeu, para verificar se minhas informações foram interpretadas corretamente.
32. Como pessoa usuária, quero visualizar uma proposta semanal em blocos de calendário, para entender como meus compromissos e necessidades podem se encaixar.
33. Como pessoa usuária, quero receber sugestões práticas priorizadas, para identificar ajustes possíveis sem receber uma lista excessiva de recomendações.
34. Como pessoa usuária, quero saber que a proposta e as sugestões são pontos de partida, para não interpretá-las como obrigação.
35. Como pessoa usuária, quero editar blocos principais antes de aceitar a proposta, para ajustar horários, títulos ou escolhas à minha realidade.
36. Como pessoa usuária, quero refazer uma etapa antes de aceitar a proposta, para corrigir uma informação que impactou o resultado.
37. Como pessoa usuária, quero aceitar somente a proposta que revisei, para manter controle sobre os eventos que entrarão no meu calendário.
38. Como pessoa usuária, quero que somente eventos aceitos sejam salvos, para impedir alterações automáticas na minha agenda.
39. Como pessoa usuária, quero editar manualmente o calendário depois de aceitar a proposta, para adaptar minha rotina a mudanças futuras.
40. Como pessoa usuária, quero saber antes de começar que sair ou fechar a entrevista fará meu progresso ser perdido, para decidir se devo iniciar naquele momento.
41. Como pessoa usuária, quero receber uma comunicação clara se tentar sair durante a entrevista, para não abandonar o fluxo sem perceber a consequência.
42. Como pessoa usuária, quero saber que respostas, documentos e sugestões da entrevista não ficarão disponíveis depois da conclusão, para compreender o limite de histórico desta versão.
43. Como pessoa usuária, quero que apenas os eventos aceitos permaneçam no meu calendário, para que o produto guarde somente o que escolhi usar.
44. Como pessoa usuária, quero tentar novamente quando a IA falhar, para não perder a oportunidade de criar uma proposta assistida.
45. Como pessoa usuária, quero receber uma mensagem clara se meu documento não puder ser processado, para saber como seguir sem confusão.
46. Como pessoa usuária, quero continuar com a criação manual de calendário se a IA ou o documento falhar, para não ficar impedida de usar o produto.
47. Como pessoa usuária de teclado, quero concluir a entrevista, selecionar opções, escrever respostas e revisar a proposta sem usar mouse, para acessar toda a experiência.
48. Como pessoa usuária de leitor de tela, quero que as etapas, progresso, opções, consentimentos, anexos, mensagens e ações tenham nomes e estados compreensíveis, para usar a entrevista com autonomia.
49. Como pessoa usuária com baixa visão ou dificuldade de distinguir cores, quero que progresso, seleção, erro e sucesso sejam comunicados por mais de cor, para compreender o fluxo com segurança.
50. Como equipe de produto, queremos oferecer uma primeira experiência curta e acolhedora, para aumentar a chance de a pessoa construir uma rotina inicial útil sem sobrecarga.

## Implementation Decisions

### Experiência de entrada

- A entrevista será apresentada como convite opcional após o primeiro login.
- O convite terá as ações **“Começar entrevista”** e **“Fazer depois”**.
- Quem adiar poderá acessar a entrevista pelo painel até concluir um plano inicial.
- A ausência de entrevista não bloqueia criação ou edição manual do calendário.

### Experiência da entrevista

- A entrevista terá cinco etapas e barra de progresso visível.
- Cada etapa combinará opções selecionáveis, múltipla escolha quando aplicável e campo aberto opcional **“Outro / contar com minhas palavras”**.
- As etapas cobrirão: objetivo e prioridade; horários fixos; sono, refeições e autocuidado; responsabilidades e dificuldades de organização; preferências, energia e confirmação.
- A linguagem será direta, acolhedora, sem julgamento e não clínica.
- A experiência deixará claro que o produto apoia organização e não oferece diagnóstico, tratamento ou orientação profissional de saúde.

### Documento de apoio

- O envio de documento será opcional.
- Serão aceitos somente PDF, DOCX e TXT.
- Imagens não serão aceitas.
- Será permitido um único documento por entrevista, de até 2 MB.
- O conteúdo considerado será limitado a até 10 páginas ou 10 mil caracteres extraídos, prevalecendo o primeiro limite atingido.
- Antes do envio, o produto explicará que o documento será usado apenas naquela entrevista e não ficará armazenado.

### IA, transparência e autonomia

- A primeira versão usará Gemini Developer API no Free Tier para apoiar a entrevista e a criação da proposta inicial.
- Antes do primeiro envio de dados à IA, a pessoa deverá consentir explicitamente com o uso de suas respostas.
- Antes do envio de documento, haverá consentimento específico para seu conteúdo.
- A interface explicará que a modalidade gratuita do Gemini pode usar dados enviados para melhoria do serviço.
- A IA apoiará a compreensão das informações fornecidas; a proposta apresentada continuará sujeita a revisão, edição e aceitação humana.
- Indisponibilidade, falha da IA ou falha no documento não impedem a criação ou edição manual do calendário.

### Resultado, privacidade e continuidade

- A tela final mostrará resumo da rotina, proposta de calendário semanal, sugestões práticas e aviso de limites não clínicos.
- A pessoa poderá aceitar, editar ou refazer partes da proposta antes de salvar.
- Apenas eventos aceitos serão incorporados ao calendário.
- Respostas, contexto da entrevista, documentos, texto extraído e sugestões não serão mantidos como histórico após a conclusão.
- Ao sair, fechar a página ou abandonar a entrevista antes da conclusão, todo o progresso será perdido; essa consequência será comunicada com clareza.
- Depois de aceitar a proposta, a pessoa poderá editar o calendário manualmente.
- A entrevista concluída não poderá ser reaberta nesta versão, e não haverá revisão da rotina conduzida por IA.

## Testing Decisions

### Princípios

- Os testes devem verificar comportamentos percebidos pela pessoa usuária, e não detalhes internos de implementação.
- Os fluxos críticos devem ser validados por interação: convite, consentimento, entrevista, anexo, revisão, aceitação, abandono, falha e alternativa manual.
- A experiência deve ser verificada em desktop, celular, teclado e tecnologias assistivas.
- Mensagens de privacidade, perda de progresso, indisponibilidade e erro devem ser testadas por clareza e capacidade de orientar a próxima ação.

### Comportamentos a validar

- O convite aparece no primeiro acesso e permite começar ou adiar sem impedir o uso manual do calendário.
- A entrevista apresenta cinco etapas, barra de progresso, opções e campo aberto opcional.
- A pessoa consegue avançar usando somente as opções disponibilizadas.
- O produto comunica seu caráter não clínico e a finalidade organizacional das sugestões.
- O consentimento é solicitado antes do uso da IA e antes de anexar documento.
- A recusa de consentimento mantém o fluxo manual disponível.
- O envio aceita apenas PDF, DOCX e TXT dentro dos limites anunciados e explica rejeições de forma clara.
- A revisão apresenta resumo, proposta e sugestões antes de qualquer evento ser salvo.
- A pessoa consegue editar ou refazer parte da proposta antes de aceitar.
- Somente os eventos aceitos passam a aparecer no calendário.
- A saída da entrevista comunica a perda de progresso e não permite recuperar respostas abandonadas.
- Após a conclusão, respostas, documentos e sugestões não estão disponíveis para consulta, enquanto os eventos aceitos permanecem editáveis.
- Falhas da IA e do documento oferecem nova tentativa e caminho manual sem bloquear o uso do produto.
- A entrevista é navegável por teclado, apresenta foco visível e informa etapas, seleção, progresso, erros e ações de forma acessível.
- Estados essenciais não dependem exclusivamente de cor e a experiência respeita preferências de movimento reduzido.

### Validação da experiência

A evolução deverá ser avaliada com pessoas usuárias por meio de tarefas que confirmem se conseguem, sem assistência:

- entender que a entrevista é opcional;
- saber o que acontece ao adiá-la ou abandoná-la;
- concluir as cinco etapas sem se sentir sobrecarregadas;
- decidir conscientemente sobre consentimento e envio de documento;
- entender a proposta recebida;
- editar, refazer ou aceitar a proposta com segurança;
- continuar usando o calendário quando a IA não estiver disponível.

## Out of Scope

- Diagnóstico, tratamento, aconselhamento clínico ou atuação como profissional de saúde.
- Processamento ou envio de imagens.
- Anexo de formatos diferentes de PDF, DOCX e TXT.
- Mais de um documento por entrevista.
- Armazenamento de arquivos, conteúdo extraído, respostas, transcrições, contexto de IA ou histórico da entrevista.
- Recuperação do progresso de uma entrevista abandonada.
- Reabertura de entrevista concluída.
- Nova entrevista ou revisão de rotina assistida por IA depois da conclusão.
- Alteração automática do calendário sem revisão e aceitação da pessoa.
- Substituição da edição manual do calendário.
- Uso obrigatório de IA para acessar ou usar o produto.
- Integrações com outros provedores de IA nesta versão.
- Notificações, lembretes ou acompanhamento contínuo derivado da entrevista.

## Further Notes

Esta versão prioriza oferecer um início assistido de baixa carga cognitiva, preservando autonomia, transparência e privacidade. A entrevista é um caminho para criar uma primeira proposta, não um cadastro clínico nem uma fonte permanente de histórico.

O Gemini Developer API no Free Tier foi escolhido para a fase inicial por permitir validação da experiência com custo controlado. Por envolver dados pessoais de rotina e, opcionalmente, conteúdo documental, a transparência e o consentimento explícito são requisitos centrais da experiência.

Futuras evoluções podem avaliar uma revisão de rotina com IA, novos provedores, condições de privacidade diferentes ou retenção deliberada de histórico, mas essas decisões exigem novo discovery de produto e privacidade.
