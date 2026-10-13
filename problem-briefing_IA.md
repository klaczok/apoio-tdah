# Problem briefing — entrevista inicial assistida por IA

## Problema observado

Uma pessoa que entra no Apoio à Rotina pela primeira vez ainda não possui um calendário que represente sua realidade. Criar essa rotina manualmente exige lembrar compromissos, estimar horários, decidir prioridades e transformar informações dispersas em blocos de calendário — atividades que aumentam a carga de organização.

O produto precisa oferecer um ponto de partida prático, respeitoso e de baixa carga cognitiva, sem transformar o primeiro acesso em um processo longo, clínico ou obrigatório.

## Pergunta central

> Como ajudar uma pessoa recém-chegada a transformar sua rotina diária e semanal em um calendário inicial útil, por meio de uma entrevista breve e opcional conduzida por IA?

## Objetivo da evolução

Disponibilizar uma entrevista opcional no primeiro acesso, composta por cinco etapas, que entenda elementos essenciais da rotina e proponha um calendário semanal inicial. A pessoa deve revisar, aceitar, editar ou refazer partes da proposta antes de salvar os eventos no calendário.

A IA também pode oferecer sugestões práticas de organização, priorizadas e sem tom prescritivo.

## Público e linguagem

A experiência é destinada a pessoas que usam o Apoio à Rotina e podem ter dificuldades de organização, planejamento e memória de trabalho.

A conversa deve ser:

- acolhedora, objetiva e sem julgamento;
- prática, com foco em rotina, compromissos, energia, preferências e obstáculos;
- não clínica: a IA não deve se apresentar como psiquiatra, profissional de saúde ou fonte de diagnóstico e tratamento;
- acompanhada por aviso breve de que as sugestões servem à organização e não substituem avaliação, diagnóstico ou orientação profissional de saúde.

## Entrada na experiência

Após o primeiro login, o produto deve convidar a pessoa a iniciar a entrevista, deixando explícitas duas ações:

- **Começar entrevista**;
- **Fazer depois**.

A entrevista é opcional. Ao adiá-la, a pessoa pode acessá-la posteriormente pelo painel enquanto ainda não tiver concluído um plano inicial. O calendário permanece vazio, acompanhado de orientação para criar compromissos manualmente ou concluir a entrevista.

## Estrutura da entrevista

A entrevista possui cinco etapas principais e uma barra de progresso visível. Cada etapa deve ser curta e partir de opções selecionáveis, usando múltipla escolha quando aplicável, com um campo opcional **“Outro / contar com minhas palavras”**.

A pessoa deve conseguir avançar apenas pelas opções. O texto aberto complementa o entendimento da IA, sem tornar a entrevista longa ou obrigatória.

### Etapa 1 — Objetivo e prioridade atual

Identificar o principal resultado que a pessoa busca com o calendário e a prioridade mais importante do momento.

### Etapa 2 — Horários fixos da semana

Entender trabalho, estudos, consultas e outros compromissos com dias e horários definidos.

### Etapa 3 — Sono, refeições e autocuidado

Mapear horários ou faixas habituais para sono, alimentação, descanso e autocuidado.

### Etapa 4 — Responsabilidades e dificuldades de organização

Identificar tarefas recorrentes, responsabilidades domésticas ou pessoais e os obstáculos que dificultam manter a rotina.

### Etapa 5 — Preferências, energia e confirmação

Entender a variação de energia ao longo do dia, preferências de organização e informações finais necessárias para gerar a proposta.

## Documento de apoio

Durante a entrevista, a pessoa pode anexar opcionalmente um documento que ajude a compor sua rotina, como uma lista de alimentação ou de tarefas.

Na primeira versão:

- são aceitos apenas arquivos **PDF, DOCX e TXT**;
- imagens não fazem parte do escopo;
- é permitido no máximo **um documento por entrevista**;
- o arquivo deve ter no máximo **2 MB**;
- o texto processado deve ser limitado a **10 páginas ou 10 mil caracteres extraídos**, o que ocorrer primeiro;
- o sistema deve informar antes do envio que o arquivo será usado somente para compor aquela entrevista e não será armazenado.

O processamento deve extrair texto localmente quando possível e enviar ao modelo apenas o conteúdo necessário e estruturado.

## Estratégia de IA e custo

A implementação deve priorizar um modelo de linguagem configurável, de menor custo disponível e, quando houver cota aplicável, capaz de operar dentro de uma faixa gratuita.

Para controlar uso e custo:

- limitar o número de etapas a cinco;
- evitar chamadas adicionais desnecessárias;
- definir limites de tokens para entrevista, documento e geração do plano;
- enviar ao modelo somente respostas relevantes e o trecho necessário do documento;
- manter uma alternativa que permita criar ou editar o calendário manualmente se não houver disponibilidade de IA ou de processamento de documento.

A eventual indisponibilidade de cota gratuita não pode bloquear a pessoa de usar o produto.

## Resultado da entrevista

Após concluir as cinco etapas, a pessoa recebe uma tela de revisão com:

- resumo da rotina entendida;
- proposta de calendário semanal organizada em blocos;
- sugestões práticas priorizadas;
- aviso de que são sugestões de organização, não orientações clínicas;
- ações para aceitar a proposta, editar os blocos principais ou refazer uma etapa antes de salvar.

Ao aceitar, somente os eventos aprovados passam a integrar o calendário da pessoa.

## Privacidade, persistência e abandono

A entrevista não deve ser persistida como histórico nesta primeira versão.

- respostas, contexto de IA e conteúdo extraído de documentos existem apenas durante a sessão ativa da entrevista;
- documentos e seu conteúdo não são armazenados em base de dados;
- se a pessoa sair, fechar a página ou abandonar a entrevista antes de concluir, todo o progresso é perdido;
- essa consequência deve ser informada de forma clara antes de iniciar e durante a experiência, quando apropriado;
- depois que a proposta for aceita, as respostas temporárias e o contexto usado pela IA devem ser descartados;
- devem permanecer persistidos apenas os eventos de calendário que a pessoa tiver aceitado.

Em caso de falha da IA, a interface deve oferecer nova tentativa e uma saída para criação ou edição manual do calendário, sem bloquear o produto.

## Limites da primeira versão

Após a conclusão e aceitação da proposta:

- a entrevista não pode ser reaberta;
- respostas, documentos, contexto extraído e sugestões da IA não ficam disponíveis para consulta;
- não há nova entrevista nem revisão de rotina conduzida por IA;
- o calendário gerado pode ser editado manualmente, com criação, alteração e remoção de blocos.

Uma revisão assistida por IA, reaproveitando o plano existente e perguntando apenas sobre mudanças, fica reservada para evolução futura.

## Critérios de sucesso

A direção será considerada bem atendida se uma pessoa conseguir:

- entender que a entrevista é opcional e saber como adiá-la;
- concluir a coleta essencial em cinco etapas curtas, acompanhando seu progresso;
- responder predominantemente por opções e complementar dados com texto aberto quando quiser;
- anexar, de forma opcional e transparente, um documento elegível sem comprometer sua privacidade;
- receber uma proposta compreensível de rotina e calendário semanal;
- aceitar ou ajustar a proposta antes de qualquer evento ser salvo;
- continuar usando o calendário manualmente diante de falha ou indisponibilidade da IA;
- compreender que o progresso será perdido se sair antes de concluir.

## Fora do escopo

Esta evolução não define:

- diagnóstico, tratamento, aconselhamento clínico ou atuação profissional de saúde;
- processamento de imagens;
- armazenamento de arquivos, conteúdo extraído, transcrições ou histórico da entrevista;
- recuperação de entrevista abandonada;
- reabertura da entrevista concluída;
- revisão da rotina por IA após a conclusão;
- escolha definitiva de fornecedor, modelo ou integração de IA;
- contratos de API, persistência, autenticação, observabilidade ou tratamento técnico detalhado de falhas;
- regras finais de geração, conflitos, recorrência e edição dos eventos de calendário.

Esses pontos devem ser definidos no PRD e nos artefatos técnicos posteriores.
