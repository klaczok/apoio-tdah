# Especificação Técnica — Evolução da experiência do Apoio à Rotina

**Status:** pronta para decomposição em issues de implementação  
**Versão:** 2.0  
**Fontes:** PRD v2, briefing de evolução da experiência, arquitetura e ADR de persistência vigentes  
**Escopo:** redesign responsivo de todas as jornadas e evolução do acesso individual para múltiplas contas

## Problem Statement

O Apoio à Rotina já implementa as jornadas essenciais de configuração da rotina recorrente, proposta semanal, planejamento, revisão do dia, consulta da semana e histórico. Porém, a aplicação apresenta essas jornadas sobretudo como listas extensas, formulários verticais e blocos textuais com pouca diferenciação. O usuário precisa ler muito para compreender horários, duração, categoria, proteção, prioridades, alertas e informações secundárias.

Na visão semanal, os dias aparecem como uma sequência de cartões em vez de uma representação temporal comparável. Espaços livres e margens não ficam evidentes. No celular, o conteúdo é reduzido à mesma estrutura linear, sem uma navegação apropriada ao contexto diário. Para uma pessoa adulta com TDAH, isso amplia a carga de leitura, memória de trabalho e tomada de decisão antes mesmo de qualquer ajuste na rotina.

A implementação também foi concebida para um único usuário. A credencial vive na configuração de ambiente, a sessão possui um sujeito fixo e o Postgres mantém um único documento de `EstadoPrivado`. Esse desenho não permite cadastro aberto, identificação do proprietário nem isolamento entre contas. Como a aplicação e seu Postgres já estão hospedados na Vercel, a evolução deve usar a infraestrutura existente, preservar o adapter de persistência e realizar uma migração segura do estado atual.

O desafio técnico é evoluir profundamente a experiência e o layout sem alterar as funções e regras de planejamento existentes. A única nova capacidade funcional será o cadastro de usuários por e-mail e senha. Toda mudança visual deverá preservar aprovação humana, confirmação para compromissos fixos, estados factuais, separação entre planejado e registrado e linguagem sem culpa.

## Solution

Criar um sistema visual compartilhado, acolhedor e contemporâneo, inspirado na familiaridade de um planner físico, mas com acabamento e previsibilidade de uma aplicação digital. Tokens semânticos e componentes reutilizáveis deverão unificar autenticação, Hoje, Amanhã, Semana, Proposta, Configuração e Histórico.

A experiência usará uma arquitetura responsiva híbrida:

- no desktop, a Semana será apresentada como uma grade temporal de sete dias, permitindo comparar carga, compromissos, margens e espaços livres;
- no celular, a Semana apresentará um dia por vez, com navegação horizontal e controles adequados ao toque;
- Hoje e Amanhã adotarão foco diário, hierarquia explícita e divulgação progressiva para reduzir ruído;
- detalhes e ações secundárias serão revelados no contexto do item selecionado;
- as demais jornadas reutilizarão os mesmos padrões de navegação, formulário, feedback, estado vazio e superfície.

As mudanças de interação poderão substituir a forma de executar uma ação existente, mas não seu significado. A grade poderá abrir edição contextual de um bloco, porém não permitirá criar intervalos multidia, recorrência nova ou drag-and-drop nesta versão.

Para múltiplas contas, será introduzido um módulo de identidade persistida no Postgres já provisionado. Usuários serão identificados por um ID estável, e-mails normalizados e únicos e hash individual de senha. A sessão assinada passará a carregar o ID do usuário. O `StateStore` continuará sendo a fronteira entre domínio e banco, mas será resolvido no contexto do usuário autenticado. O documento `EstadoPrivado` continuará contendo a rotina recorrente, proposta semanal, semana ativa, instâncias diárias e notas do seu proprietário.

O estado existente será migrado para a conta legada de maneira explícita e idempotente antes da abertura do cadastro. Ambientes de preview e produção continuarão isolados por configuração de tabela ou schema, conforme a estratégia operacional vigente na Vercel.

O seam principal de teste será a interface pública das jornadas renderizadas por rota, exercitando o comportamento visível do usuário com persistência e identidade controladas. Seams complementares serão limitados aos contratos HTTP de autenticação, ao contrato compartilhado do `StateStore` contextualizado por usuário e às regras puras de projeção visual da agenda que tenham matrizes de casos grandes.

## User Stories

1. Como usuário, quero compreender a estrutura da minha semana em poucos segundos, para começar a planejar com menor esforço mental.
2. Como usuário de desktop, quero comparar os sete dias em uma grade temporal, para reconhecer rapidamente diferenças de carga.
3. Como usuário, quero entender horário e duração pela posição e pelo tamanho dos blocos, para depender menos de texto corrido.
4. Como usuário, quero reconhecer compromissos fixos sem abrir cada item, para proteger horários importantes.
5. Como usuário, quero distinguir blocos flexíveis de compromissos fixos, para saber o que pode ser ajustado.
6. Como usuário, quero reconhecer tarefas e margens como tipos diferentes de conteúdo, para compreender corretamente minha capacidade.
7. Como usuário, quero perceber espaços livres como respiro legítimo, para não sentir que todo intervalo precisa ser preenchido.
8. Como usuário, quero reconhecer dias mais carregados visualmente, para avaliar minha semana com rapidez.
9. Como usuário, quero distinguir categorias por texto, símbolo e cor, para não depender apenas de percepção cromática.
10. Como usuário, quero ver inicialmente somente horário, título, categoria e proteção, para evitar excesso de informação.
11. Como usuário, quero revelar duração, detalhes e ações ao selecionar um bloco, para obter contexto quando necessário.
12. Como usuário, quero ajustar um item a partir do seu bloco, para não perder o contexto da semana.
13. Como usuário, quero que ajustes continuem respeitando as regras atuais, para não alterar minha rotina de maneira inesperada.
14. Como usuário, quero confirmar conscientemente mudanças em compromissos fixos, para evitar alterações acidentais.
15. Como usuário, quero que planejado e registrado continuem visualmente separados, para comparar intenção e execução sem julgamento.
16. Como usuário, quero visualizar alertas sem que eles concorram com o conteúdo principal, para tratar riscos sem perder o foco.
17. Como usuário, quero que prioridades tenham maior hierarquia que informações secundárias, para saber onde concentrar atenção.
18. Como usuário, quero que pendências permaneçam factuais e sem linguagem de culpa, para tomar decisões com autonomia.
19. Como usuário, quero que as ações disponíveis estejam próximas ao conteúdo selecionado, para evitar navegação desnecessária.
20. Como usuário, quero que opções avançadas sejam reveladas progressivamente, para manter o fluxo principal simples.
21. Como usuário de celular, quero ver um dia por vez, para não enfrentar uma semana inteira comprimida.
22. Como usuário de celular, quero navegar horizontalmente entre os dias, para conservar o contexto temporal.
23. Como usuário de celular, quero saber claramente qual dia está selecionado, para não registrar uma ação na data errada.
24. Como usuário de celular, quero alvos de toque confortáveis, para operar a agenda com precisão.
25. Como usuário de celular, quero que painéis contextuais caibam na tela sem esconder controles essenciais, para concluir ajustes sem atrito.
26. Como usuário, quero que Hoje destaque a data, o contexto e as ações prioritárias, para entender meu dia rapidamente.
27. Como usuário, quero que a revisão do dia agrupe cada estado e decisão junto do item correspondente, para reduzir associações mentais.
28. Como usuário, quero que o formulário de conclusão da revisão apareça como uma etapa clara, para saber quando encerro o processo.
29. Como usuário, quero que minha anotação diária permaneça separada da avaliação dos itens, para preservar sua finalidade.
30. Como usuário, quero que Amanhã apresente prioridades, linha do tempo e alertas com hierarquia clara, para planejar sem sobrecarga.
31. Como usuário, quero executar os fluxos atuais de criação e ajuste por controles visuais mais claros, para preencher menos campos desnecessariamente.
32. Como usuário, quero que Proposta explique sugestões e estados de aprovação com clareza, para decidir com segurança.
33. Como usuário, quero aceitar, editar ou remover sugestões pelas mesmas regras atuais, para manter autonomia sobre a proposta.
34. Como usuário, quero que Configuração seja dividida em etapas visualmente consistentes, para avançar sem enfrentar um formulário longo.
35. Como usuário, quero ver progresso e contexto durante a Configuração, para saber onde estou e o que falta.
36. Como usuário, quero revisar valores antes de confirmá-los, para preservar controle sobre a rotina recorrente.
37. Como usuário, quero consultar o Histórico com datas e sínteses bem hierarquizadas, para encontrar registros anteriores com rapidez.
38. Como usuário, quero que a consulta histórica permaneça separada da edição da rotina recorrente, para não modificar o passado acidentalmente.
39. Como usuário, quero uma navegação consistente entre Hoje, Amanhã, Semana, Proposta, Configuração e Histórico, para aprender um único modelo mental.
40. Como usuário, quero identificar minha localização atual na navegação, para manter orientação dentro do produto.
41. Como usuário, quero que ações primárias e secundárias tenham aparência consistente, para prever seu efeito.
42. Como usuário, quero estados vazios acolhedores e objetivos, para saber qual próximo passo executar.
43. Como usuário, quero feedback consistente de carregamento, sucesso e erro, para compreender o resultado das ações.
44. Como usuário, quero que erros preservem meus dados preenchidos sempre que possível, para não repetir trabalho.
45. Como usuário, quero uma estética acolhedora de planner, para sentir familiaridade ao organizar minha rotina.
46. Como usuário, quero acabamento digital limpo e contemporâneo, para perceber o produto como confiável e bem cuidado.
47. Como usuário, quero que texturas e ornamentos sejam discretos, para não disputar atenção com meu planejamento.
48. Como usuário, quero tipografia altamente legível, para ler horários e orientações com conforto.
49. Como usuário, quero espaçamento e agrupamento consistentes, para compreender relações entre elementos.
50. Como usuário, quero superfícies levemente quentes e cores suaves, para reduzir rigidez sem perder contraste.
51. Como usuário de teclado, quero operar todas as jornadas sem mouse, para acessar todas as funções.
52. Como usuário de teclado, quero uma ordem de foco previsível, para navegar sem desorientação.
53. Como usuário de teclado, quero foco sempre visível, para saber qual controle está ativo.
54. Como usuário de leitor de tela, quero títulos, regiões, nomes e estados semanticamente corretos, para compreender a estrutura da página.
55. Como usuário de leitor de tela, quero que mudanças de status importantes sejam anunciadas, para receber feedback equivalente ao visual.
56. Como usuário com baixa visão, quero contraste compatível com WCAG 2.2 AA, para ler e operar a interface.
57. Como usuário que não distingue certas cores, quero sinais redundantes para categorias e estados, para não perder informação.
58. Como usuário sensível a movimento, quero que minha preferência por movimento reduzido seja respeitada, para evitar desconforto.
59. Como visitante, quero encontrar claramente as opções de entrar e criar conta, para escolher o fluxo adequado.
60. Como visitante, quero criar uma conta apenas com e-mail, senha e confirmação, para começar sem um cadastro extenso.
61. Como visitante, quero ver os requisitos da senha antes de enviar, para corrigir problemas antecipadamente.
62. Como visitante, quero ser avisado quando a confirmação divergir da senha, para corrigir o campo correto.
63. Como visitante, quero receber uma mensagem clara quando o e-mail já estiver cadastrado, para poder entrar com a conta existente.
64. Como visitante, quero que espaços e variações de caixa do e-mail sejam normalizados, para evitar falhas acidentais.
65. Como novo usuário, quero entrar automaticamente após o cadastro, para começar sem repetir credenciais.
66. Como usuário cadastrado, quero entrar com meu e-mail e senha, para acessar meu espaço privado.
67. Como usuário cadastrado, quero que respostas de login inválido não revelem detalhes sensíveis, para proteger minha conta.
68. Como usuário cadastrado, quero manter uma sessão segura e poder encerrá-la, para controlar o acesso em dispositivos compartilhados.
69. Como usuário, quero que minha senha nunca seja armazenada em texto simples, para reduzir o impacto de uma exposição de dados.
70. Como usuário, quero acessar apenas meu `EstadoPrivado`, para preservar compromissos, notas e histórico pessoais.
71. Como usuário, quero que outra conta não consiga consultar ou alterar minha rotina recorrente, para preservar minha privacidade.
72. Como usuário, quero que outra conta não consiga consultar ou alterar minhas propostas e semanas ativas, para preservar meu planejamento.
73. Como usuário, quero que outra conta não consiga consultar ou alterar minhas instâncias diárias, para preservar meu histórico.
74. Como novo usuário, quero iniciar com um estado vazio próprio, para construir minha rotina sem dados de terceiros.
75. Como usuário legado, quero manter todos os meus dados depois da migração, para continuar usando o produto sem perda.
76. Como usuário legado, quero acessar meus dados pela conta migrada, para que a abertura de cadastros não altere minha rotina.
77. Como equipe do produto, queremos reutilizar tokens semânticos, para manter consistência visual em todas as telas.
78. Como equipe do produto, queremos componentes compartilhados para navegação, feedback, formulários e superfícies, para reduzir divergências futuras.
79. Como equipe do produto, queremos separar projeção visual de regras de domínio, para redesenhar sem duplicar lógica de planejamento.
80. Como equipe do produto, queremos que o domínio continue ignorando SQL, Vercel e detalhes de autenticação, para preservar módulos profundos.
81. Como equipe do produto, queremos contextualizar o `StateStore` pelo usuário autenticado, para isolar dados por uma interface pequena.
82. Como equipe do produto, queremos manter controle otimista de concorrência por usuário, para evitar sobrescritas silenciosas.
83. Como equipe do produto, queremos executar produção e previews no Postgres da Vercel sem cruzar dados, para validar mudanças com segurança.
84. Como equipe do produto, queremos que a migração seja idempotente, para poder retomá-la sem duplicar contas ou perder estado.
85. Como equipe do produto, queremos validar as jornadas pelo comportamento externo, para permitir refatorações visuais seguras.
86. Como equipe do produto, queremos comparar visualmente estados e breakpoints críticos, para detectar regressões de layout.
87. Como equipe do produto, queremos validar desktop, celular, toque e teclado separadamente, para não tratar responsividade apenas como largura.
88. Como equipe do produto, queremos avaliar compreensão, tempo, erros e percepção estética, para confirmar que a evolução melhorou a experiência.

## Implementation Decisions

### 1. Arquitetura da experiência

- O produto adotará uma arquitetura híbrida: grade semanal no desktop e foco em um único dia no celular.
- A mesma informação de domínio alimentará as duas apresentações; não haverá modelos de dados distintos por breakpoint.
- A interface deverá ser server-first, seguindo o App Router existente. Estado cliente será introduzido apenas para interações efêmeras, como seleção visual, abertura de painel contextual e navegação local entre dias.
- A navegação principal será compartilhada entre as áreas autenticadas e indicará a rota atual. No celular, deverá preservar acesso claro às jornadas sem ocupar espaço excessivo.
- Todas as páginas usarão uma estrutura comum de shell, largura, cabeçalho, navegação, região principal e feedback global.
- Autenticação terá shell público consistente com a identidade visual, sem expor navegação privada.
- A divulgação progressiva será o padrão para detalhes, ações secundárias e campos opcionais.
- Estados vazio, carregando, sucesso, alerta, erro recuperável e indisponibilidade terão padrões visuais e semânticos compartilhados.

### 2. Sistema visual

- Tokens semânticos serão definidos globalmente para:
  - superfícies e fundos;
  - texto primário, secundário e discreto;
  - ações primárias, secundárias e destrutivas;
  - estados de sucesso, alerta e erro;
  - categorias da rotina;
  - compromisso fixo, bloco flexível, tarefa, margem e espaço livre;
  - tipografia e escala de tamanhos;
  - espaçamento, raios, bordas, sombras e largura de conteúdo;
  - duração e curvas de movimento;
  - foco e estados interativos.
- Tokens deverão expressar função, não nomes de cores, permitindo evolução futura sem reescrever componentes.
- O tema inicial será claro, com superfícies quentes e cores suaves. Tema escuro e personalização ficam fora do escopo.
- Tipografia deverá priorizar legibilidade em português, diferenciação de números e leitura rápida de horários.
- Elementos decorativos deverão ser discretos e nunca codificar informação essencial.
- Contraste deverá cumprir WCAG 2.2 AA inclusive em estados hover, focus, disabled e selected.
- A implementação deverá respeitar `prefers-reduced-motion` e não usar animação como único feedback.

### 3. Componentes e módulos compartilhados

- Um módulo de apresentação deverá concentrar os tokens e componentes fundamentais do produto.
- Componentes fundamentais incluirão, no mínimo:
  - shell público e shell autenticado;
  - navegação principal e identificação da página atual;
  - cabeçalho de página e ações de contexto;
  - botão, link com aparência de ação e botão de ícone;
  - campo, seleção, área de texto, checkbox e grupo de escolhas;
  - mensagem de status, alerta e erro de campo;
  - cartão, seção, painel contextual e estado vazio;
  - indicador de categoria, proteção e situação factual;
  - controle de dia selecionado e navegação entre datas;
  - bloco temporal e escala de horários.
- Componentes não deverão reimplementar regras de domínio. Eles receberão conteúdo, estado e ações por interfaces tipadas.
- Server Components continuarão responsáveis por carregar dados e compor jornadas. Client Components serão pequenos limites de interação e não acessarão o banco diretamente.
- A linguagem dos componentes seguirá os termos existentes: rotina recorrente, proposta semanal, semana ativa, instância diária, compromisso fixo, bloco flexível, margem, prioridade, pendência e `EstadoPrivado`.

### 4. Projeção visual da agenda

- Será criado um módulo puro de projeção que converte itens de uma instância diária em blocos posicionáveis, sem alterar os modelos do domínio.
- A projeção calculará posição inicial, altura, faixa de horário, tipo visual, categoria, proteção e rótulos acessíveis.
- Sobreposições existentes deverão permanecer visíveis e compreensíveis; o módulo de apresentação não decidirá conflito nem capacidade.
- A grade usará intervalos e limites temporais consistentes derivados dos dados exibidos, com uma faixa mínima que permita compreender o dia.
- Espaços livres serão apresentados visualmente sem serem persistidos como novos itens.
- Margens persistidas ou derivadas pelas regras atuais deverão ser distintas de espaços simplesmente vazios.
- A grade semanal no desktop deverá manter cabeçalhos e horários legíveis durante rolagem quando necessário.
- A experiência móvel deverá renderizar um dia por vez, mantendo o mesmo conteúdo e rótulos acessíveis da grade.
- Selecionar um bloco abrirá detalhes e ações já existentes. A seleção não modificará dados.
- Edição continuará sendo confirmada pelos contratos atuais; nenhum movimento visual gravará alterações automaticamente.

### 5. Jornadas existentes

- Hoje, Amanhã, Semana, Proposta, Configuração e Histórico preservarão seus casos de uso e contratos de domínio.
- Hoje agrupará revisão, pendências, síntese e anotação em regiões claramente identificadas.
- Amanhã apresentará planejamento em linha do tempo, prioridades e alertas sem mudar limites ou regras atuais.
- Semana apresentará totais como resumo secundário e a agenda como conteúdo principal.
- Proposta preservará a distinção entre rascunho em edição e semana ativa confirmada.
- Configuração preservará etapas curtas e valores existentes, com navegação de progresso e agrupamento visual consistente.
- Histórico permanecerá somente leitura e não oferecerá ações que modifiquem a rotina recorrente.
- Formulários poderão mudar de layout e adotar escolhas visuais, mas nomes, validações, confirmações e resultados deverão permanecer compatíveis até que cada endpoint seja explicitamente adaptado.
- Feedback por parâmetros de URL poderá ser encapsulado em um padrão compartilhado, preservando links e redirecionamentos existentes durante a migração.

### 6. Identidade persistida e cadastro

- Credenciais deixarão de ser definidas por usuário nas variáveis `AUTH_USER_EMAIL` e `AUTH_PASSWORD_HASH`.
- `SESSION_SECRET` continuará sendo segredo de ambiente da aplicação e não será persistido no banco.
- Será introduzido um repositório de usuários com interface pequena, separado do `EstadoPrivado` e das regras de rotina.
- O registro persistido do usuário conterá:
  - ID opaco e estável;
  - e-mail normalizado;
  - hash individual de senha com algoritmo e parâmetros necessários à verificação;
  - timestamps de criação e atualização.
- O e-mail será normalizado por remoção de espaços externos e conversão para minúsculas antes de verificar unicidade.
- A unicidade será garantida no banco, não apenas na aplicação.
- A senha nunca será registrada em logs, respostas ou `EstadoPrivado`.
- O hash usará função de derivação resistente a ataques offline com salt aleatório individual. A escolha deverá permanecer encapsulada para permitir atualização futura de parâmetros.
- O cadastro aberto aceitará e-mail, senha e confirmação de senha.
- Validações de formato, requisitos de senha e confirmação deverão produzir erros de campo claros.
- Cadastro bem-sucedido criará o usuário e seu estado vazio de forma atômica ou compensável, emitirá sessão e redirecionará para a área privada.
- E-mail duplicado produzirá resposta tratável pela interface sem expor hashes ou dados da conta.
- Login continuará respondendo genericamente a credencial inválida para não distinguir e-mail inexistente de senha incorreta.
- O token de sessão assinado carregará o ID do usuário no `sub`, com emissão e expiração.
- A verificação de sessão retornará uma identidade autenticada, e não apenas um booleano.
- Middleware protegerá as áreas privadas e tornará login e cadastro públicos.
- Cookies continuarão `HttpOnly`, `SameSite=Lax`, `Path=/`, com `Secure` em HTTPS e prazo de expiração definido.
- Logout continuará invalidando a sessão no cliente pela remoção do cookie.

### 7. Persistência multiusuário

- A decisão arquitetural de Postgres gerenciado e domínio desacoplado de SQL será preservada.
- `StateStore` continuará sendo o seam do domínio para carregar e salvar `EstadoPrivado`.
- A obtenção do store será contextualizada por um `userId` autenticado. O domínio não receberá e-mail, cookie, token, SQL ou variáveis de ambiente.
- A tabela de estado deixará de usar o identificador constante de usuário único e usará o ID do proprietário como chave.
- Cada usuário terá documento JSONB, `schema_version`, `version` de concorrência otimista e timestamps independentes.
- `load` de um usuário sem estado persistido retornará `estadoVazio()` com versão inicial, sem acessar estado de outro usuário.
- `save` usará o ID do usuário e a versão esperada na condição de atualização.
- O adapter em memória deverá simular múltiplos usuários para desenvolvimento e testes.
- O adapter Postgres continuará sendo validado via `pg-mem` em CI.
- Ambientes de preview e produção continuarão isolados conforme a configuração operacional vigente; cadastro em preview não poderá criar ou consultar usuários de produção.
- Rotas e páginas autenticadas resolverão primeiro a identidade e só então o `StateStore` correspondente.
- Ausência ou invalidade de identidade nunca poderá cair silenciosamente no estado legado ou em um usuário padrão.

### 8. Migração do usuário e estado legados

- Antes da abertura do cadastro, a credencial e o estado atuais deverão ser associados a uma conta legada.
- A migração deverá ser explícita, observável, idempotente e executável no Postgres da Vercel.
- A conta legada deverá receber um ID estável preservado entre execuções.
- O e-mail e o hash existentes poderão ser importados das variáveis atuais sem transportar segredos para logs ou respostas.
- O documento atualmente identificado pelo registro único deverá ser copiado ou reassociado ao ID da conta legada sem alterar seu conteúdo de domínio.
- A migração deverá verificar previamente colisões de e-mail, presença de destino e compatibilidade de schema.
- Reexecução após sucesso não poderá duplicar usuário, estado ou incrementar versões indevidamente.
- A abertura do cadastro dependerá da verificação de que a conta legada consegue autenticar e carregar o mesmo `EstadoPrivado`.
- O rollback operacional deverá priorizar impedir novos cadastros e preservar os registros migrados; não deverá apagar dados criados depois da abertura.
- A remoção das variáveis legadas só ocorrerá após validação de produção.

### 9. Contratos HTTP

- Será adicionado um contrato público de cadastro por formulário.
- Sucesso no cadastro emitirá cookie de sessão e redirecionará para a área privada.
- Falhas de validação retornarão ao cadastro com códigos estáveis ou estrutura adequada para mensagens por campo, sem incluir senha na URL.
- Login consultará o repositório de usuários e emitirá sessão vinculada ao ID encontrado.
- Rotas privadas não aceitarão `userId` enviado pelo cliente como fonte de autoridade; o proprietário será sempre derivado da sessão.
- Endpoints existentes continuarão recebendo as ações de planejamento atuais, mas salvarão no store do usuário autenticado.
- Respostas de armazenamento indisponível continuarão explícitas e não deverão ser confundidas com estado vazio.
- Erros de concorrência continuarão impedindo sobrescritas silenciosas.

### 10. Acessibilidade e comportamento responsivo

- O objetivo normativo será WCAG 2.2 AA.
- A estrutura de cada página deverá ter título principal único, regiões nomeadas e hierarquia coerente de headings.
- Controles deverão possuir nomes acessíveis que incluam contexto suficiente, especialmente blocos temporais e ações repetidas.
- Seleção, expansão, proteção e estados factuais deverão ser comunicados semanticamente.
- Painéis contextuais deverão gerenciar foco ao abrir e fechar sem aprisioná-lo indevidamente.
- Navegação horizontal no celular deverá possuir alternativa operável por controles explícitos, não depender apenas de gesto.
- Alvos de toque e espaçamento deverão atender aos critérios aplicáveis da WCAG 2.2.
- Mensagens de sucesso e erro deverão usar regiões de status ou alerta conforme urgência.
- Erros de formulário deverão ser associados aos campos e resumidos quando necessário.
- Nenhuma informação essencial dependerá apenas de posição, cor, animação ou hover.
- Breakpoints deverão responder à capacidade real do layout, sem assumir um dispositivo específico.

### 11. Desempenho e Vercel

- A solução continuará implantada na Vercel e usará o Postgres já integrado ao projeto.
- Consultas de identidade e estado ocorrerão apenas no servidor.
- Conexões Postgres continuarão reutilizando o pool existente e as variáveis fornecidas pela integração da Vercel.
- Fontes, ícones e recursos visuais deverão evitar payload desnecessário e não bloquear a compreensão inicial da página.
- Client Components deverão ser limitados às interações que realmente exigem estado no navegador.
- A grade não deverá exigir biblioteca pesada quando CSS e projeções puras forem suficientes.
- A aplicação deverá manter renderização funcional sem JavaScript para envios de formulários existentes sempre que a interação não exigir manipulação direta.
- Falhas do banco deverão resultar em feedback recuperável, sem renderizar dados de cache pertencentes a outra conta.

### 12. Entrega e decomposição futura

A implementação deverá ser decomposta em issues pequenas, ordenadas por dependência. A sequência técnica recomendada é:

1. decisão e migração da persistência multiusuário;
2. repositório de usuários, hash de senha e sessão identificada;
3. cadastro aberto e adaptação do login;
4. contextualização do `StateStore` e isolamento de todas as rotas;
5. fundações do sistema visual e shells compartilhados;
6. componentes temporais e projeção pura da agenda;
7. evolução de Semana para desktop e celular;
8. evolução de Hoje e Amanhã;
9. evolução de Proposta e Configuração;
10. evolução de Histórico e autenticação;
11. validação visual, responsiva, de acessibilidade e usabilidade;
12. migração e abertura controlada em produção.

Cada issue futura deverá conter `What to build`, `Acceptance criteria` e `Blocked by`, conforme as convenções do repositório. Esta spec não é uma issue e não recebe label de triagem.

## Testing Decisions

### Estratégia e seams

- O seam principal será a jornada renderizada por rota. Os testes deverão montar cada página com identidade e persistência controladas e verificar o que o usuário percebe e consegue fazer.
- O segundo seam será o contrato HTTP de autenticação: cadastro, login, sessão e logout serão testados pelas requisições, respostas, redirecionamentos e cookies.
- O terceiro seam será o contrato compartilhado do `StateStore` contextualizado por usuário, executado contra memória e Postgres via `pg-mem`.
- Regras puras de projeção temporal poderão ter testes diretos quando cobrirem cálculos difíceis de observar de forma diagnóstica apenas pela jornada.
- Componentes visuais básicos não deverão receber testes isolados se já estiverem cobertos pelas jornadas. Um novo seam só será criado quando oferecer uma fronteira pública estável e reduzir duplicação.

### O que caracteriza um bom teste

- Verifica comportamento externo ou contrato público, não classes CSS, estrutura interna ou detalhes de implementação.
- Usa nomes e consultas acessíveis, refletindo como uma pessoa ou tecnologia assistiva encontra o conteúdo.
- Demonstra uma regra ou risco relevante com o menor arranjo necessário.
- Falha por uma mudança de comportamento observável, não por refatoração sem efeito para o usuário.
- Cobre estados positivo, vazio, inválido, indisponível e concorrente quando aplicáveis.
- Evita snapshots extensos de markup; comparações visuais devem usar estados intencionais e estáveis.

### Jornadas a testar

- Login público e acesso à área privada.
- Cadastro válido, autenticação automática e criação de estado vazio.
- Cadastro com e-mail inválido, duplicado, senha fora dos requisitos e confirmação divergente.
- Logout e bloqueio de rotas privadas após remoção da sessão.
- Configuração da rotina recorrente por etapas.
- Geração, edição e confirmação de proposta semanal.
- Planejamento de Amanhã com prioridades, alertas, linha do tempo e confirmações existentes.
- Revisão de Hoje, estados factuais, pendências, síntese e anotação.
- Semana com sete dias, planejado versus registrado, proteção, categorias, margens e espaços livres.
- Semana móvel com foco diário e navegação explícita entre dias.
- Histórico em lista e detalhe, mantendo comportamento somente leitura.
- Estados vazios e falhas de persistência em todas as jornadas críticas.

### Autenticação e segurança

- O hash armazenado não equivale à senha e usa salt individual.
- Senha, hash e segredo de sessão não aparecem em respostas, cookies, URLs ou logs testáveis.
- E-mails são normalizados e a unicidade resiste a concorrência.
- Login inválido não distingue e-mail desconhecido de senha incorreta.
- Sessão válida retorna a identidade correta; sessão expirada, adulterada ou com sujeito inválido é rejeitada.
- Cookie mantém `HttpOnly`, `SameSite=Lax`, `Path=/`, expiração e `Secure` em HTTPS.
- Rotas privadas ignoram qualquer proprietário fornecido pelo cliente.

### Persistência e migração

- O mesmo contrato será executado para o adapter de memória e o adapter Postgres.
- Primeira leitura de cada usuário retorna estado vazio independente.
- Gravação e leitura preservam o `EstadoPrivado` do proprietário.
- Dois usuários no mesmo banco não leem nem sobrescrevem dados entre si.
- Conflito de versão é calculado independentemente por usuário.
- Conteúdo inválido e versões de schema incompatíveis produzem erros explícitos.
- Falha transitória não é convertida em estado vazio.
- Preview e produção permanecem isolados.
- A migração cria a conta legada, preserva exatamente seu estado e pode ser reexecutada sem duplicação.
- Uma falha parcial na migração deixa um estado detectável e retomável.

### Experiência visual e responsiva

- Testes das rotas deverão afirmar hierarquia e conteúdo, não propriedades cosméticas específicas.
- Estados visuais críticos deverão possuir comparação visual em pelo menos desktop e celular: vazio, dados densos, alertas, erro, painel aberto e formulário com validação.
- A revisão visual deverá cobrir autenticação, Hoje, Amanhã, Semana, Proposta, Configuração e Histórico.
- A grade deverá ser validada com compromissos curtos, longos, adjacentes, sobrepostos, fixos, flexíveis e distribuídos em categorias diferentes.
- A visualização móvel deverá ser validada com conteúdo extenso, zoom e orientação estreita.
- Contraste deverá ser medido manualmente ou por ferramenta que use estilos computados reais; o ambiente jsdom não será considerado suficiente.

### Acessibilidade

- A suíte existente com `jest-axe` será ampliada para cadastro e novos estados interativos.
- Operação por teclado será validada em todas as jornadas e nos painéis contextuais.
- A ordem de foco, restauração do foco e anúncios de status serão verificados pelo comportamento observável.
- Identificação por cor será testada pela presença de texto ou rótulo equivalente.
- `prefers-reduced-motion` e foco visível continuarão como garantias transversais.
- Testes automatizados serão complementados por revisão manual com teclado, leitor de tela e contraste real.

### Usabilidade e aceitação

Sessões controladas deverão medir se a pessoa consegue, sem assistência:

- compreender a semana em poucos segundos;
- reconhecer compromissos fixos e dias carregados;
- localizar um espaço livre;
- diferenciar margem de espaço vazio;
- abrir e ajustar um item sem perder contexto;
- navegar entre dias no celular;
- concluir cadastro e login;
- compreender e corrigir erros de formulário.

Serão observados conclusão, tempo, erros, hesitação, compreensão e percepção subjetiva de beleza e clareza. Telemetria de produção não é requisito desta versão.

### Prior art

- Testes de páginas com Testing Library já exercitam as jornadas Hoje, Amanhã, Semana, Proposta, Configuração, Histórico e login.
- A suíte de acessibilidade já usa `jest-axe` sobre páginas renderizadas e verifica garantias globais de foco e movimento reduzido.
- O contrato compartilhado de `StateStore` já roda contra memória e Postgres em `pg-mem` e deverá ser evoluído, não substituído.
- Os testes HTTP de login, logout e middleware já validam redirecionamentos, cookies e proteção de segredos e deverão orientar cadastro e sessão identificada.

## Out of Scope

- Recorrência adicional de compromissos.
- Criação de um compromisso em múltiplos dias em uma única ação.
- Seleção multidia como capacidade funcional.
- Drag-and-drop persistente para mover compromissos.
- Redimensionamento persistente de blocos por arraste.
- Novas regras de conflito, capacidade ou preenchimento automático.
- Alteração dos limites e regras atuais de prioridades.
- Mudança das regras de aprovação da proposta semanal.
- Mudança da confirmação exigida para compromissos fixos.
- Gamificação, pontuação, ranking, streak ou linguagem avaliativa.
- Tema escuro, temas personalizados ou controle de densidade.
- Colaboração, compartilhamento, equipes ou contas familiares.
- Perfis públicos, avatar, nome ou campos adicionais de perfil.
- Convite, aprovação administrativa ou lista de espera.
- Confirmação de e-mail.
- Recuperação ou redefinição de senha.
- Login social, passkeys ou autenticação multifator.
- Painel administrativo de usuários.
- Notificações, lembretes ou telemetria de produto.
- Migração para outro provedor de hospedagem ou banco.
- Substituição do Postgres gerenciado existente.
- Introdução de ORM sem decisão arquitetural separada.
- Incorporação direta do código do protótipo à produção.
- Reescrita das regras de domínio apenas para acomodar o redesign.

## Further Notes

- Esta especificação é a fonte técnica para decompor o trabalho em issues; ela não deve ser publicada como uma issue única.
- A persistência atual em Postgres gerenciado e o uso de `StateStore` são decisões arquiteturais aceitas. A evolução multiusuário deve aprofundar essa interface, não acoplar o domínio ao banco.
- O hash único mantido em variável de ambiente é adequado apenas ao acesso individual atual. Cadastro aberto exige credenciais persistidas por usuário e altera essa consequência da arquitetura; a implementação deverá registrar a nova decisão em ADR antes da migração de produção.
- O protótipo de experiência orienta hierarquia, densidade e interação, mas não fornece componentes prontos nem contratos finais.
- Beleza é um requisito verificável de coerência, acabamento, hierarquia e percepção, mas nunca prevalece sobre legibilidade, baixa carga cognitiva, privacidade ou acessibilidade.
- A evolução visual deve evitar um “big bang”: as fundações compartilhadas vêm antes das páginas, e cada etapa deverá permanecer implantável e testável na Vercel.
- A abertura do cadastro é um marco operacional separado do deploy do código. Ela só ocorrerá após migração e verificação da conta legada, isolamento entre usuários e capacidade de desabilitar novos cadastros sem retirar o acesso existente.
