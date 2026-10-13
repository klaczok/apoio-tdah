# PRD v2 — Evolução da experiência do Apoio à Rotina

## Problem Statement

O Apoio à Rotina oferece as funções necessárias para organizar a rotina, mas sua interface atual apresenta a agenda principalmente como listas extensas, formulários verticais e blocos textuais visualmente semelhantes. Isso dificulta compreender rapidamente a semana, comparar dias, reconhecer compromissos fixos e encontrar espaços livres.

Horários, duração, categoria e proteção exigem leitura detalhada. A hierarquia entre compromissos, prioridades, alertas e informações secundárias é pouco evidente. No celular, a redução da agenda a uma lista limita ainda mais a percepção de contexto.

Para pessoas adultas com TDAH, essa apresentação aumenta a carga de leitura, memória de trabalho e tomada de decisão. O usuário precisa interpretar a rotina antes de conseguir agir sobre ela. Além disso, o acesso atual não está preparado para incorporar muitos usuários com contas e dados privados.

O produto precisa evoluir para uma experiência visual acolhedora, bonita, acessível e funcional, sem ampliar neste momento o conjunto de funcionalidades de planejamento. A única nova capacidade funcional desta versão será o cadastro aberto de usuários com e-mail e senha, persistidos na mesma base de dados já utilizada pelo projeto.

## Solution

Redesenhar todas as telas do Apoio à Rotina sob um sistema visual único, inspirado em um planner físico e executado com acabamento digital contemporâneo. A experiência deverá reduzir a carga cognitiva, destacar o que exige atenção e permitir que o usuário compreenda sua rotina rapidamente.

No desktop, a agenda adotará uma estrutura semanal visual, adequada à comparação entre dias, compromissos e espaços livres. No celular, a experiência priorizará um dia por vez, com navegação horizontal entre os dias. Os detalhes serão apresentados progressivamente: cada bloco exibirá apenas as informações essenciais e revelará dados e ações adicionais quando selecionado.

As interações poderão mudar de apresentação para tornar os fluxos existentes mais diretos e claros, mas não poderão acrescentar novas capacidades de planejamento. Recorrência, criação multidia, drag-and-drop e novas regras de conflito ou capacidade permanecem fora do escopo.

O produto também receberá cadastro aberto com e-mail, senha e confirmação de senha. Cada conta deverá acessar somente seus próprios compromissos, notas, configurações e histórico. Os usuários e a associação de propriedade dos dados serão persistidos na base de dados existente.

## User Stories

1. Como usuário, quero compreender minha semana visualmente em poucos segundos, para reduzir o esforço necessário para planejar minha rotina.
2. Como usuário, quero comparar os dias da semana lado a lado no desktop, para perceber rapidamente diferenças de carga.
3. Como usuário, quero identificar os horários dos compromissos pela posição dos blocos, para depender menos da leitura de textos repetitivos.
4. Como usuário, quero reconhecer os dias mais carregados sem abrir cada compromisso, para tomar decisões com menos esforço.
5. Como usuário, quero perceber espaços livres e margens como partes legítimas da agenda, para não interpretar todo intervalo como tempo que precisa ser preenchido.
6. Como usuário, quero distinguir compromissos fixos, blocos flexíveis e margens, para entender as restrições da minha rotina.
7. Como usuário, quero reconhecer compromissos protegidos sem abrir seus detalhes, para evitar alterações acidentais.
8. Como usuário, quero que categorias sejam diferenciadas por texto, símbolos e cores suaves, para não depender exclusivamente da cor.
9. Como usuário, quero visualizar inicialmente apenas horário, título, categoria e proteção, para evitar excesso de informação.
10. Como usuário, quero revelar duração, detalhes e ações ao selecionar um compromisso, para obter contexto sem poluir a agenda.
11. Como usuário, quero editar um compromisso a partir de seu próprio bloco, para manter o contexto do dia ou da semana.
12. Como usuário, quero que as ações disponíveis sejam apresentadas próximas ao item selecionado, para evitar navegação desnecessária.
13. Como usuário, quero executar as mesmas ações que já existem por meio de controles mais claros e diretos, para planejar com menos atrito.
14. Como usuário, quero que a criação e a edição usem escolhas visuais e valores padrão quando possível, para preencher menos campos manualmente.
15. Como usuário, quero que opções secundárias sejam reveladas apenas quando necessárias, para manter o fluxo principal simples.
16. Como usuário, quero receber confirmação consciente antes de alterar um compromisso protegido, para preservar horários importantes.
17. Como usuário, quero que a aprovação humana continue sendo necessária nos fluxos em que já é exigida, para manter controle sobre minha rotina.
18. Como usuário, quero que mensagens e estados usem linguagem sem culpa, para receber apoio sem julgamentos.
19. Como usuário de celular, quero visualizar um dia por vez, para evitar uma versão comprimida e ilegível da semana.
20. Como usuário de celular, quero navegar horizontalmente entre os dias, para manter o contexto temporal sem enfrentar uma lista longa.
21. Como usuário de celular, quero alvos de toque confortáveis e controles acessíveis, para usar o planner com precisão.
22. Como usuário de desktop, quero visualizar a semana completa em uma grade, para comparar compromissos e espaços livres.
23. Como usuário, quero que as telas Hoje e Amanhã destaquem o essencial de cada dia, para saber rapidamente no que focar.
24. Como usuário, quero que a tela Semana ofereça uma visão visual da distribuição dos compromissos, para compreender meu equilíbrio semanal.
25. Como usuário, quero que as telas de Proposta preservem o contexto e expliquem claramente as alterações sugeridas, para decidir com segurança.
26. Como usuário, quero que a Configuração use etapas claras e visualmente consistentes, para concluir o processo sem sobrecarga.
27. Como usuário, quero consultar o Histórico com hierarquia visual clara, para localizar registros anteriores sem esforço excessivo.
28. Como usuário, quero que login, cadastro e áreas autenticadas pareçam partes do mesmo produto, para ter uma experiência coerente.
29. Como visitante, quero encontrar uma opção clara para criar uma conta, para começar a usar o produto sem depender de convite.
30. Como visitante, quero criar uma conta informando e-mail, senha e confirmação de senha, para acessar o produto com um processo simples.
31. Como visitante, quero receber orientações claras sobre os requisitos da senha, para corrigir problemas antes de enviar o cadastro.
32. Como visitante, quero saber se as duas senhas não coincidem, para corrigir o cadastro facilmente.
33. Como visitante, quero receber uma mensagem clara quando o e-mail já estiver cadastrado, para entender por que a conta não foi criada.
34. Como novo usuário, quero entrar automaticamente após um cadastro bem-sucedido, para começar a usar o produto sem repetir minhas credenciais.
35. Como usuário cadastrado, quero entrar com meu e-mail e senha, para acessar meus dados privados.
36. Como usuário cadastrado, quero que minha senha seja armazenada de forma segura, para reduzir o risco de exposição das minhas credenciais.
37. Como usuário cadastrado, quero que meu e-mail seja tratado de forma consistente independentemente de letras maiúsculas ou espaços acidentais, para evitar contas duplicadas ou falhas inesperadas de acesso.
38. Como usuário, quero acessar somente meus próprios compromissos, para preservar minha privacidade.
39. Como usuário, quero acessar somente minhas próprias notas, para preservar informações pessoais.
40. Como usuário, quero acessar somente minhas próprias configurações, para que outra conta não altere minha experiência.
41. Como usuário, quero acessar somente meu próprio histórico, para impedir exposição de atividades pessoais.
42. Como usuário novo, quero iniciar com um espaço privado e independente, para construir minha rotina sem visualizar dados de outras contas.
43. Como usuário existente, quero que meus dados continuem disponíveis após a adoção de múltiplas contas, para não perder meu planejamento atual.
44. Como usuário de teclado, quero percorrer controles e compromissos em uma ordem previsível, para utilizar todas as funções sem mouse.
45. Como usuário de teclado, quero foco visível em todos os elementos interativos, para saber onde estou na interface.
46. Como usuário de leitor de tela, quero nomes, estados e relações semânticas compreensíveis, para navegar e operar o produto.
47. Como usuário com baixa visão, quero contraste suficiente entre textos, controles, superfícies e estados, para ler o conteúdo confortavelmente.
48. Como usuário que não distingue determinadas cores, quero identificar categorias e estados por mais de um sinal visual, para compreender a agenda corretamente.
49. Como usuário sensível a movimento, quero que a interface respeite minha preferência por movimento reduzido, para evitar desconforto.
50. Como usuário, quero que erros sejam indicados junto aos campos e explicados em linguagem clara, para conseguir corrigi-los.
51. Como usuário, quero preservar o contexto e os dados preenchidos quando um erro recuperável ocorrer, para não repetir trabalho.
52. Como usuário, quero perceber estados de carregamento, sucesso, vazio e erro de forma consistente, para entender o que está acontecendo.
53. Como usuário, quero uma estética acolhedora de planner com acabamento digital refinado, para sentir familiaridade sem perder clareza.
54. Como usuário, quero tipografia legível, espaçamento consistente e superfícies visualmente organizadas, para reduzir distrações.
55. Como usuário, quero que elementos decorativos não disputem atenção com meus compromissos, para manter o foco no planejamento.
56. Como usuário, quero uma experiência consistente em todas as telas, para aprender os padrões de interação uma única vez.
57. Como equipe do produto, queremos componentes e tokens visuais reutilizáveis, para evoluir muitas telas de forma consistente.
58. Como equipe do produto, queremos estados e variações documentados no sistema visual, para sustentar o crescimento do produto.
59. Como equipe do produto, queremos validar separadamente desktop, celular, toque e teclado, para evitar que uma adaptação comprometa outra.
60. Como equipe do produto, queremos avaliar beleza, consistência, desempenho nas tarefas e acessibilidade, para confirmar que o redesign trouxe uma melhoria real.

## Implementation Decisions

### Direção de experiência

- A arquitetura de informação será híbrida: agenda semanal completa no desktop e foco diário com navegação horizontal no celular.
- Todas as telas existentes serão abrangidas pelo novo sistema visual, incluindo autenticação, Hoje, Amanhã, Semana, Proposta, Configuração e Histórico.
- A identidade será híbrida contemporânea: familiaridade e acolhimento de um planner físico combinados com precisão e consistência de um produto digital.
- A estética deverá usar cores suaves, superfícies levemente quentes, tipografia altamente legível e ornamentação discreta.
- A hierarquia visual deverá distinguir conteúdo principal, informações secundárias, alertas, prioridades e ações.
- Espaços livres, margens e descanso deverão ser representados como capacidade preservada, não como falhas a serem preenchidas.

### Sistema visual

- Será estabelecido um conjunto compartilhado de tokens para cores, tipografia, espaçamento, dimensões, bordas, elevação, movimento e estados interativos.
- Os componentes deverão ser reutilizáveis e preparados para consistência entre todas as telas.
- Os padrões compartilhados deverão abranger navegação, cabeçalhos, cartões, blocos de agenda, campos, botões, mensagens, painéis contextuais, estados vazios, carregamento, sucesso e erro.
- Categorias e estados deverão combinar cor com texto, ícones, símbolos ou padrões visuais.
- A interface deverá preservar clareza em diferentes tamanhos de tela e densidades de conteúdo.
- Não será oferecida configuração de densidade pelo usuário nesta versão.

### Agenda e interações

- A tela semanal deixará de apresentar a agenda somente como uma sequência de cartões e passará a utilizar uma representação temporal responsiva.
- A posição e a dimensão dos blocos deverão comunicar horário e duração quando aplicável.
- Cada bloco mostrará inicialmente apenas as informações essenciais.
- Detalhes e ações secundárias serão apresentados por divulgação progressiva, mediante seleção do bloco.
- A alteração da apresentação dos fluxos será permitida somente quando preservar as capacidades e regras atuais.
- Ações contextuais poderão substituir etapas de navegação ou formulários extensos, desde que não introduzam funções novas.
- Os fluxos atuais de aprovação humana, proteção de compromissos e linguagem sem culpa deverão ser preservados.
- No celular, a semana não deverá ser meramente comprimida; o produto apresentará foco diário e navegação adequada ao toque.

### Cadastro e autenticação

- O cadastro será aberto, sem convite ou aprovação manual.
- O formulário solicitará apenas e-mail, senha e confirmação de senha.
- O e-mail será obrigatório, normalizado e único.
- A senha será obrigatória e deverá atender a requisitos informados claramente na própria interface.
- A confirmação deverá corresponder à senha antes do envio.
- Senhas deverão ser armazenadas exclusivamente como hashes seguros, nunca em texto simples.
- O usuário será autenticado automaticamente depois de concluir o cadastro com sucesso.
- Login social, confirmação de e-mail, recuperação de senha, nome, perfil e campos adicionais não farão parte desta versão.
- Mensagens de validação e falha deverão ser claras, acionáveis e consistentes com a linguagem do produto.
- O cadastro deverá persistir os usuários na mesma base de dados utilizada pela aplicação.

### Propriedade e privacidade dos dados

- Cada compromisso, nota, configuração, histórico e demais registros pessoais deverá pertencer a um usuário.
- Consultas e alterações deverão ser limitadas ao proprietário autenticado dos dados.
- Novos usuários deverão iniciar com um espaço privado e independente.
- Os dados existentes deverão ser associados de forma segura à conta preexistente durante a evolução para múltiplos usuários.
- A introdução de múltiplas contas não poderá expor, misturar ou permitir a alteração cruzada de dados.

### Acessibilidade

- O redesign deverá atender à WCAG 2.2 nível AA.
- Todos os fluxos deverão ser operáveis por teclado, com ordem de foco lógica e foco visível.
- Os elementos deverão possuir semântica e nomes acessíveis adequados para tecnologias assistivas.
- Contraste, tamanho dos alvos de toque e apresentação de mensagens deverão atender aos critérios aplicáveis.
- Nenhuma informação essencial dependerá exclusivamente de cor.
- Animações e transições deverão respeitar preferências de movimento reduzido.
- Desktop, celular, toque e teclado serão validados separadamente.

### Entrega incremental

1. **Fundações:** sistema visual, tokens, componentes compartilhados, autenticação, cadastro e isolamento por usuário.
2. **Planejamento central:** evolução das telas Semana, Hoje e Amanhã.
3. **Consistência completa:** evolução de Proposta, Configuração, Histórico e demais telas existentes.
4. **Refinamento e validação:** revisão visual, responsiva, de usabilidade e de acessibilidade em toda a experiência.

Cada fase deverá manter os fluxos existentes utilizáveis e coerentes. A divisão em fases não autoriza experiências visuais fragmentadas como resultado final.

## Testing Decisions

### Princípios

- Os testes deverão verificar comportamentos observáveis, não detalhes internos de implementação.
- A estratégia combinará testes automatizados, inspeção visual, validação de acessibilidade e testes de usabilidade orientados a tarefas.
- Um teste será considerado bom quando demonstrar que o usuário consegue concluir uma ação ou compreender um estado por meio da interface ou contrato público.
- Variações de desktop e celular deverão ser testadas como experiências distintas, e não somente como diferenças de largura.
- Estados padrão, vazio, carregamento, sucesso, validação e erro deverão ser cobertos nos fluxos críticos.

### Módulos e comportamentos a testar

- Cadastro com e-mail, senha e confirmação válidos.
- Rejeição de e-mail inválido, e-mail duplicado, senha inválida e confirmação divergente.
- Armazenamento seguro de senha e ausência de senha em texto simples.
- Autenticação automática após cadastro bem-sucedido.
- Login e logout com contas persistidas.
- Normalização e unicidade de e-mail.
- Isolamento de compromissos, notas, configurações e histórico entre usuários.
- Associação segura dos dados existentes à conta correspondente.
- Comportamento da agenda semanal no desktop.
- Foco diário e navegação entre dias no celular.
- Divulgação progressiva de detalhes e ações.
- Identificação de categorias, proteção e demais estados sem dependência exclusiva de cor.
- Operação completa por teclado e gerenciamento de foco.
- Semântica para leitores de tela, contraste, alvos de toque e movimento reduzido.
- Preservação das regras existentes de planejamento, aprovação e proteção.

### Validação da experiência

A evolução deverá ser avaliada tanto por qualidade visual quanto por desempenho em tarefas.

A avaliação visual verificará:

- coerência entre todas as telas;
- aplicação consistente da identidade híbrida contemporânea;
- legibilidade, espaçamento, hierarquia e acabamento;
- equilíbrio entre acolhimento e baixa carga cognitiva;
- qualidade responsiva em desktop e celular;
- consistência dos estados interativos e de feedback.

Os testes de usabilidade deverão verificar se uma pessoa consegue, sem assistência:

- compreender a estrutura da semana em poucos segundos;
- reconhecer compromissos fixos e protegidos sem abrir todos os itens;
- identificar dias carregados;
- localizar rapidamente um espaço livre;
- encontrar e executar as ações existentes de criação e ajuste;
- ajustar um compromisso sem perder o contexto temporal;
- navegar pela agenda no celular;
- cadastrar-se e entrar no produto;
- compreender e corrigir erros de cadastro.

Não será exigida telemetria de produto nesta versão. As métricas poderão ser coletadas em sessões controladas de usabilidade, considerando tempo, erros, conclusão de tarefas, compreensão e percepção subjetiva de clareza e beleza.

### Referências para testes

- Os testes existentes dos fluxos atuais deverão servir como referência para preservar comportamento durante o redesign.
- Os padrões já usados no projeto para testes de interface e acessibilidade deverão ser reutilizados.
- Novos testes de autenticação e isolamento deverão seguir os contratos públicos do sistema e utilizar a infraestrutura de banco de dados empregada nos testes do projeto.

## Out of Scope

- Recorrência de compromissos.
- Criação de um compromisso em vários dias simultaneamente.
- Seleção multidia como nova capacidade funcional.
- Drag-and-drop definitivo de compromissos existentes.
- Novas regras de conflito, capacidade ou preenchimento automático da agenda.
- Novas funções de planejamento além das já existentes.
- Personalização de tema ou densidade pelo usuário.
- Colaboração, compartilhamento de agenda, equipes ou contas familiares.
- Perfis públicos ou campos adicionais de perfil.
- Convites ou aprovação manual de cadastro.
- Confirmação de e-mail.
- Recuperação ou redefinição de senha.
- Login social ou autenticação multifator.
- Notificações, lembretes ou telemetria de produto.
- Incorporação direta do código do protótipo exploratório à produção.
- Mudanças nas regras de domínio existentes que não sejam indispensáveis ao isolamento seguro entre usuários.

## Further Notes

- O protótipo e o briefing são referências de intenção, hierarquia e experiência; seus dados simulados e seu estado em memória não representam uma solução pronta para produção.
- A evolução deverá ser reimplementada sobre os casos de uso e a persistência existentes.
- “Muito bonito” significa uma experiência visualmente refinada, consistente e acolhedora, mas beleza nunca deverá comprometer legibilidade, velocidade de compreensão ou acessibilidade.
- A escalabilidade pretendida nesta versão está na consistência do sistema visual, na reutilização de componentes, na persistência de contas e no isolamento seguro dos dados — não na introdução antecipada de novas funcionalidades.
- Qualquer interação visual que revele uma capacidade não disponível atualmente deverá ser retirada ou tratada em um PRD futuro.
