# Spec v3 — Entrevista inicial assistida por IA

## Problem Statement

Uma pessoa que acessa o Apoio à Rotina pela primeira vez encontra um calendário vazio e precisa transformar informações dispersas — compromissos, responsabilidades, horários, necessidades de autocuidado e preferências — em uma rotina semanal. O fluxo de configuração atual já permite registrar uma `RotinaRecorrente` e gerar uma `PropostaSemanal`, mas pode exigir muitas decisões e conhecimento prévio do produto antes de oferecer valor.

Para uma pessoa com dificuldades de organização, planejamento ou memória de trabalho, iniciar manualmente aumenta a carga cognitiva. O produto precisa oferecer um começo guiado, curto e opcional que reduza esse esforço sem retirar autonomia, transformar a experiência em atendimento clínico ou publicar itens no calendário sem aprovação humana.

Além disso, a pessoa precisa entender com clareza quando informações pessoais e documentos serão enviados ao Gemini Developer API no Free Tier, quais são os limites dessa modalidade e o que acontece com seus dados ao abandonar ou concluir a entrevista.

## Solution

Adicionar uma entrevista inicial opcional, apresentada após o primeiro login e disponível pelo painel até a pessoa concluir seu primeiro plano. A entrevista terá cinco etapas curtas e produzirá uma `RotinaRecorrente` estruturada, que alimentará o gerador determinístico existente de `PropostaSemanal`.

A IA Gemini será usada para interpretar respostas selecionadas, texto aberto e, opcionalmente, texto extraído de um documento de apoio. A IA não criará eventos persistidos diretamente. Sua saída deverá ser validada e normalizada para a `RotinaRecorrente`; a geração da `PropostaSemanal` continuará obedecendo às regras existentes de capacidade, proteção, margens e itens a confirmar.

A pessoa deverá consentir explicitamente antes do primeiro envio à IA e antes de enviar um documento. O fluxo continuará disponível manualmente quando houver recusa, indisponibilidade da IA, falha de processamento ou abandono da entrevista.

Depois das cinco etapas, a pessoa verá uma tela de revisão com o resumo da rotina compreendida, a `PropostaSemanal` em blocos e sugestões práticas não clínicas. A pessoa poderá editar sugestões, refazer uma etapa ou aceitar a proposta. Apenas a proposta confirmada integrará a `SemanaAtiva` e originará os itens usuais do calendário.

Respostas da entrevista, documento original, texto extraído, contexto enviado ao Gemini e sugestões textuais de IA serão efêmeros: não entram no `EstadoPrivado`, não são gravados pelo `StateStore` e são descartados ao sair, falhar definitivamente ou concluir. Apenas a `RotinaRecorrente`, a `PropostaSemanal` em revisão e a `SemanaAtiva` confirmada usarão a persistência existente.

## User Stories

1. Como pessoa recém-cadastrada, quero receber um convite claro para iniciar minha rotina, para não precisar descobrir sozinha como começar com um calendário vazio.
2. Como pessoa recém-cadastrada, quero escolher entre começar a entrevista e fazê-la depois, para organizar minha rotina no momento em que tiver disponibilidade.
3. Como pessoa que adiou a entrevista, quero encontrá-la no painel enquanto ainda não tiver uma semana ativa, para iniciar quando fizer sentido.
4. Como pessoa que não quer usar IA, quero continuar criando minha `RotinaRecorrente` e meus compromissos manualmente, para não depender do fluxo assistido.
5. Como pessoa usuária, quero saber que a entrevista possui cinco etapas, para perceber que ela é limitada e previsível.
6. Como pessoa usuária, quero visualizar o avanço entre as cinco etapas, para saber onde estou e quanto falta concluir.
7. Como pessoa usuária, quero responder principalmente com opções selecionáveis, para reduzir a necessidade de escrever e decidir muitas coisas de uma vez.
8. Como pessoa usuária, quero poder selecionar várias opções quando aplicável, para representar uma rotina que não cabe em uma única resposta.
9. Como pessoa usuária, quero complementar cada etapa por texto aberto, para informar detalhes relevantes que não aparecem nas opções.
10. Como pessoa usuária, quero avançar sem preencher texto aberto, para manter a entrevista breve.
11. Como pessoa usuária, quero informar minha prioridade atual, para que a proposta inicial considere o que é mais importante para mim.
12. Como pessoa usuária, quero registrar trabalho, estudos, consultas e outros compromissos fixos, para que a proposta respeite horários já definidos.
13. Como pessoa usuária, quero registrar horários de sono, refeições, descanso e autocuidado, para que necessidades básicas façam parte da rotina.
14. Como pessoa usuária, quero informar responsabilidades pessoais, familiares e domésticas, para que a proposta não trate apenas trabalho como compromisso relevante.
15. Como pessoa usuária, quero indicar dificuldades de organização, para que as sugestões sejam realistas e acolhedoras.
16. Como pessoa usuária, quero informar períodos de maior ou menor energia, para que a proposta use melhor minha capacidade percebida.
17. Como pessoa usuária, quero indicar preferências de carga e organização, para que a semana proposta não pareça imposta.
18. Como pessoa usuária, quero receber linguagem direta, acolhedora e sem culpa, para organizar-me sem pressão por produtividade.
19. Como pessoa usuária, quero saber que a entrevista apoia organização e não oferece diagnóstico, tratamento ou orientação profissional de saúde, para compreender seus limites.
20. Como pessoa usuária, quero anexar uma referência opcional, para aproveitar informações que já organizei fora do produto.
21. Como pessoa usuária, quero enviar somente PDF, DOCX ou TXT, para saber quais documentos podem ser usados nesta versão.
22. Como pessoa usuária, quero ser informada do limite de um documento, 2 MB e até 10 páginas ou 10 mil caracteres extraídos, para preparar um envio compatível.
23. Como pessoa usuária, quero saber que imagens não são aceitas, para não tentar anexar um formato fora do escopo.
24. Como pessoa usuária, quero saber que o documento será usado somente naquela entrevista e não será armazenado pelo produto, para decidir se desejo enviá-lo.
25. Como pessoa usuária, quero consentir explicitamente antes de minhas respostas serem enviadas ao Gemini, para controlar o uso das minhas informações.
26. Como pessoa usuária, quero dar consentimento específico antes de enviar o documento ao Gemini, para decidir separadamente sobre esse conteúdo.
27. Como pessoa usuária, quero saber que a modalidade gratuita do Gemini pode usar dados enviados para melhoria do serviço, para consentir de forma informada.
28. Como pessoa usuária, quero recusar o consentimento sem perder o acesso ao calendário manual, para que a IA não seja obrigatória.
29. Como pessoa usuária, quero receber um resumo da rotina compreendida, para verificar se a proposta parte de informações coerentes.
30. Como pessoa usuária, quero ver uma `PropostaSemanal` em blocos de calendário, para compreender como minha semana pode se organizar.
31. Como pessoa usuária, quero receber sugestões práticas priorizadas e não clínicas, para identificar ajustes iniciais sem uma lista excessiva de tarefas.
32. Como pessoa usuária, quero editar as sugestões antes de confirmar a proposta, para manter controle sobre títulos, horários e blocos do calendário.
33. Como pessoa usuária, quero refazer uma etapa antes de confirmar a proposta, para corrigir uma informação que alterou o resultado.
34. Como pessoa usuária, quero que nenhum evento seja confirmado automaticamente, para preservar minha autonomia.
35. Como pessoa usuária, quero que somente a proposta revisada e confirmada se torne minha `SemanaAtiva`, para saber o que efetivamente entrou no calendário.
36. Como pessoa usuária, quero continuar editando manualmente minha semana após a confirmação, para adaptar minha rotina a mudanças reais.
37. Como pessoa usuária, quero ser avisada antes de começar e ao sair que meu progresso será perdido, para decidir se devo continuar a entrevista naquele momento.
38. Como pessoa usuária, quero que respostas, documentos, conteúdo extraído e sugestões de IA não apareçam como histórico após a conclusão, para entender o limite de privacidade desta versão.
39. Como pessoa usuária, quero que somente os eventos aprovados permaneçam no produto, para que ele guarde apenas o planejamento que escolhi adotar.
40. Como pessoa usuária, quero tentar novamente quando a IA falhar, para ainda poder obter uma proposta assistida.
41. Como pessoa usuária, quero receber uma mensagem clara quando o documento não for aceito ou não puder ser processado, para saber como seguir.
42. Como pessoa usuária, quero seguir para o fluxo manual quando a IA ou o documento falharem, para que uma indisponibilidade não bloqueie o produto.
43. Como pessoa usuária de teclado, quero navegar pelo convite, consentimentos, opções, texto aberto, anexo e revisão com foco visível, para completar o fluxo sem mouse.
44. Como pessoa usuária de leitor de tela, quero receber nomes, progresso, estados de seleção, avisos e ações compreensíveis, para usar a entrevista com autonomia.
45. Como pessoa usuária com baixa visão ou dificuldade de distinguir cores, quero que seleção, erro, progresso e sucesso não dependam somente de cor, para compreender todos os estados.
46. Como equipe do produto, queremos reutilizar a `RotinaRecorrente` e a `PropostaSemanal` existentes, para preservar regras validadas de rotina, proteção e capacidade.
47. Como equipe do produto, queremos manter o material transitório da entrevista fora do `EstadoPrivado`, para não transformar a primeira versão em um histórico de dados pessoais e documentos.
48. Como equipe do produto, queremos um provedor de IA isolado do domínio de rotina, para trocar o fornecedor em uma evolução futura sem alterar as regras de planejamento.

## Implementation Decisions

### Fluxo e telas de produto

O protótipo estático v3 é a referência visual para as telas e estados desta evolução. Ele estabelece a seguinte sequência de experiência:

```text
convite opcional
  ├─ fazer depois → calendário/configuração manual
  └─ começar → consentimento geral
       ├─ recusar → calendário/configuração manual
       └─ consentir → etapa 1 → etapa 2 → etapa 3 → etapa 4 → etapa 5
                                                ├─ documento opcional → consentimento específico → documento transitório
                                                └─ sem documento
                                                     ↓
                                                gerar proposta
                                                ├─ falha → tentar novamente | calendário/configuração manual
                                                └─ revisão → editar sugestões | refazer etapa | confirmar
                                                                      ↓
                                                               SemanaAtiva
```

Esse diagrama foi sintetizado do protótipo e define estados de produto, não detalhes de navegação ou de componentes.

O convite só aparecerá automaticamente quando a pessoa autenticada não tiver uma `SemanaAtiva`. Adiar ou recusar a entrevista não grava uma resposta de produto; enquanto não houver uma semana confirmada, o painel manterá um ponto de entrada para a entrevista e para configuração manual.

A saída da entrevista deve alertar que as respostas em andamento serão perdidas. O produto não recuperará etapas abandonadas após navegação, recarga, fechamento de aba ou encerramento da sessão.

### Sessão efêmera da entrevista

As cinco etapas, suas escolhas, respostas abertas, consentimentos e referência transitória ao documento pertencem a uma sessão de entrevista efêmera, limitada à sessão ativa do navegador/servidor. Ela não integra `EstadoPrivado`, `StateStore`, `notasPorDia`, `RotinaRecorrente`, `PropostaSemanal`, `SemanaAtiva` ou histórico.

A sessão deve poder ser descartada integralmente por abandono, cancelamento, confirmação da proposta e erro irrecuperável. Um resultado exibido na revisão pode permanecer apenas enquanto necessário para a própria revisão; ao sair dela sem confirmar, não há obrigação de recuperação posterior.

### Mapeamento para a RotinaRecorrente

A entrevista não cria uma estrutura paralela de planejamento persistido. Ela produz uma entrada estruturada que é normalizada para a `RotinaRecorrente` já existente.

- horários fixos viram `Compromisso` do tipo `fixo`, `Periodo` protegido, configurações de trabalho ou presencial quando houver dados suficientes;
- sono, alimentação, preferências de carga e margens preenchem suas configurações correspondentes;
- estudo, música e blocos flexíveis usam os tipos e categorias já definidos pelo domínio;
- dados incompletos permanecem ausentes ou a confirmar, sem invenção de horário, duração ou compromisso;
- texto sobre objetivos, dificuldades, energia e preferências pode orientar a interpretação e as sugestões de IA, mas não deve criar novas categorias de domínio nem ser persistido como histórico;
- toda rotina derivada deve passar pelas validações já existentes antes de gerar a `PropostaSemanal`.

A geração da `PropostaSemanal` continua determinística sobre a `RotinaRecorrente` validada. Regras de proteção, capacidade, margens de transição, horários de sono e conflitos existentes não poderão ser deslocadas para o Gemini.

### Gemini e limites de segurança

A integração inicial usa Gemini Developer API no Free Tier por meio de um adaptador de provedor exclusivamente do lado do servidor. A variável de ambiente `GEMINI_API_KEY` já foi criada na Vercel para o ambiente de produção e deve ser lida somente no servidor. A chave não deve ser exposta ao navegador, armazenada em `EstadoPrivado`, devolvida em respostas HTTP ou registrada em logs. Ela não deve usar o prefixo `NEXT_PUBLIC_`.

O adaptador recebe somente dados para os quais houve consentimento explícito, devolve um contrato estruturado de interpretação e nunca uma alteração direta da `SemanaAtiva`. A saída deve ser validada contra o vocabulário e as invariantes da `RotinaRecorrente`; respostas ausentes, incompatíveis, excessivamente vagas ou inválidas devem resultar em nova tentativa, pedido de ajuste ou continuação manual — nunca em dados inventados.

O conteúdo enviado à IA deve ser limitado às respostas relevantes, ao trecho necessário do documento e aos limites de tokens definidos na implementação. As mensagens de produto devem informar que:

- a IA apoia organização e não oferece diagnóstico, tratamento ou orientação profissional de saúde;
- no Free Tier, o provedor pode usar dados enviados para melhoria do serviço;
- a pessoa pode continuar sem consentir com a IA.

### Documento de apoio

O fluxo aceita no máximo um documento por entrevista, somente em PDF, DOCX ou TXT, com até 2 MB. Imagens e demais formatos devem ser recusados antes de qualquer envio ao Gemini.

O processador de documento deve extrair o texto apenas durante a entrevista, limitar o material usado a 10 páginas ou 10 mil caracteres extraídos — o que ocorrer primeiro — e descartar arquivo e texto ao abandonar, concluir ou encerrar a tentativa. Antes do upload, a interface deve informar formatos, limites, ausência de armazenamento e o papel do documento. Antes do envio ao Gemini, exige consentimento específico.

Uma falha de extração, formato, limite ou processamento deve expor mensagem factual, permitir remover/trocar o arquivo e permitir seguir sem documento.

### Revisão, confirmação e persistência

Depois da interpretação e geração, a revisão apresenta: resumo da rotina compreendida, `PropostaSemanal` em blocos, sugestões práticas não clínicas, aviso de que se trata de ponto de partida e ações para editar sugestões, refazer uma etapa e confirmar.

A edição e a confirmação reutilizam os fluxos de `PropostaSemanal` existentes. Confirmar promove a proposta revisada a `SemanaAtiva`, sem reter a sessão de entrevista ou o material de IA. A pessoa continua podendo editar o calendário pelos fluxos manuais existentes.

A evolução deve respeitar o ADR de persistência: o domínio acessa dados pela interface `StateStore`, e somente os dados de produto definidos em `EstadoPrivado` são salvos. O schema de `EstadoPrivado` não deve receber campos para respostas transitórias, arquivos, texto extraído, prompts, resposta bruta do Gemini, sugestões textuais ou registros de consentimento desta entrevista. Se algum estado persistido adicional for indispensável para entrada do convite, ele deve ser derivável de `SemanaAtiva` ou definido separadamente com justificativa explícita em decisão posterior.

### Interface e acessibilidade

A interface deve materializar os estados mostrados no protótipo: convite, calendário manual, consentimento, cada uma das cinco etapas, documento opcional, documento selecionado, revisão, falha e conclusão.

Cada etapa terá progresso textual e visual, opções selecionáveis, campos abertos opcionais e ações de voltar/continuar. A seleção, o progresso, mensagens de erro e sucesso devem ter representação textual e semântica além da cor. Todos os controles devem ser operáveis por teclado, apresentar foco visível e ser anunciados adequadamente por tecnologias assistivas. A interface respeita `prefers-reduced-motion`.

## Testing Decisions

### Princípios

Um teste bom verifica comportamento observável no maior seam disponível, sem depender de estrutura interna, nomes privados, chamadas intermediárias ou detalhes de renderização. Para esta evolução, o seam primário será o fluxo autenticado de caso de uso e rota HTTP: entrada validada da entrevista, atualização da `RotinaRecorrente`, geração da `PropostaSemanal`, revisão, confirmação e leitura posterior por `StateStore`.

Esse seam aproveita contratos existentes: `StateStore` para persistência versionada por usuário, operações de rotina para validação de domínio e rota de proposta para revisão e confirmação. Testes unitários adicionais são justificáveis apenas para os limites que não atravessam esse seam — validação de documento e adaptador de IA — e devem testar seus contratos públicos, não bibliotecas externas nem detalhes do Gemini.

### Comportamentos a testar

- convite apresentado para pessoa autenticada sem `SemanaAtiva`, com caminhos para iniciar, adiar e seguir manualmente;
- convite não exibido como primeiro acesso após existir `SemanaAtiva` confirmada;
- cinco etapas com progresso, opções, múltipla escolha quando aplicável e texto aberto não obrigatório;
- consentimento geral obrigatório antes de qualquer chamada de IA;
- consentimento específico obrigatório antes de disponibilizar conteúdo de documento ao provedor;
- recusa de consentimento mantém caminhos manuais e não chama o adaptador de IA;
- aceitação somente de PDF, DOCX e TXT, máximo de um documento e 2 MB;
- recusa de imagens, formatos não permitidos e arquivos acima do limite antes do processamento externo;
- limite aplicado ao texto aproveitado: 10 páginas ou 10 mil caracteres, o que ocorrer primeiro;
- abandono, cancelamento, recarga ou encerramento descartam a sessão efêmera e não criam dados no `StateStore`;
- saída válida da IA é normalizada para uma `RotinaRecorrente` válida e gera uma `PropostaSemanal` pelo gerador existente;
- saída inválida, incompleta ou indisponibilidade do Gemini não publica itens, oferece nova tentativa e mantém alternativa manual;
- dados incompletos não recebem horários inventados;
- revisão mostra a proposta antes da confirmação e permite editar/remover/aceitar sugestões pelos comportamentos já existentes;
- confirmação promove somente a proposta revisada para `SemanaAtiva`;
- após confirmação, `EstadoPrivado` contém somente dados existentes permitidos — nunca respostas, arquivo, texto extraído, prompt, resposta bruta ou sugestões textuais de IA;
- testes de interface cobrem foco, ordem de teclado, nomes acessíveis, progresso, mensagens de privacidade, aviso de perda de progresso, falhas e estados que não dependem apenas de cor;
- a experiência de falha permite tentar novamente ou seguir à configuração/calendário manual.

### Seams e referências existentes

1. **Seam principal: caso de uso autenticado e rota HTTP de rotina/proposta.** Ele verifica o comportamento completo que transforma uma entrevista válida em `RotinaRecorrente`, gera `PropostaSemanal` e confirma `SemanaAtiva`, usando `MemoryStateStore` em testes. Os testes atuais de atualização de rotina e de proposta são a referência de estilo e de resultado observável.
2. **Seam de contrato: StateStore.** Ele confirma que `EstadoPrivado` persiste apenas os dados permitidos e conserva isolamento e concorrência do usuário. Os testes de contrato existentes com memória e Postgres em memória são a referência.
3. **Seam de contrato: adaptador de IA.** Um adaptador falso deve permitir testar consentimento, resposta válida, resposta inválida, indisponibilidade e limites sem rede, chave real ou dependência do Gemini. O teste observa o contrato de entrada/saída do adaptador, não payloads internos do SDK.
4. **Seam de contrato: processador de documento.** Testa formatos, quantidade, tamanho, limite de texto e descarte do conteúdo por uma interface pública de processamento transitório. Arquivos reais de teste devem ser mínimos e não conter dados sensíveis.
5. **Seam de interface.** Testes de página e rota autenticada com Testing Library e jest-axe verificam as jornadas de convite, consentimento, etapas, revisão, falha, alternativa manual e acessibilidade.

Há precedente para testes de rotas autenticadas em memória, proposta, configuração de rotina, acessibilidade e contratos de persistência. A nova cobertura deve seguir esses padrões e não introduzir infraestrutura de banco real ou chamadas reais ao Gemini em CI.

## Out of Scope

- Diagnóstico, tratamento, aconselhamento clínico ou qualquer apresentação da IA como profissional de saúde.
- Envio ou processamento de imagens.
- Formatos de documento diferentes de PDF, DOCX e TXT.
- Mais de um documento por entrevista.
- Armazenamento de arquivo, conteúdo extraído, respostas abertas, transcrição, prompt, resposta bruta do modelo, sugestão textual de IA ou histórico da entrevista.
- Recuperação de entrevista abandonada, reabertura da entrevista concluída ou revisão posterior da rotina por IA.
- Alterações automáticas de `SemanaAtiva` ou do calendário sem revisão e confirmação humana.
- Substituição dos fluxos manuais de configuração, proposta e edição de calendário.
- Provedores de IA além do Gemini nesta versão.
- Troca de infraestrutura de persistência definida nos ADRs existentes.
- Notificações, lembretes, telemetria de produto ou acompanhamento contínuo derivado da entrevista.
- Definição de diagnóstico de privacidade, contrato empresarial com provedor ou retenção especial de dados; essas decisões exigem discovery e decisão próprios.

## Further Notes

A evolução se apoia no vocabulário e nos conceitos existentes: `RotinaRecorrente` é a configuração recorrente, `PropostaSemanal` é o rascunho editável e `SemanaAtiva` é a proposta confirmada que orienta o calendário. A entrevista é um mecanismo de entrada temporário para esses conceitos, não um novo domínio persistido.

A direção visual e de conteúdo está documentada no protótipo estático da PRD v3. Ele é uma referência de estados de tela e mensagens; não deve ser incorporado diretamente à aplicação de produção.

A decisão de usar o Gemini Free Tier torna o consentimento e a minimização de dados requisitos funcionais centrais, não apenas detalhes técnicos. Toda cópia deve continuar clara, acolhedora, não clínica e sem culpa.

Esta especificação foi criada como arquivo local e não foi publicada em GitHub Issues, conforme decisão anterior.
