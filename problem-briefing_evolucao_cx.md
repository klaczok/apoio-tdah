# Problem briefing — evolução da experiência do Apoio à Rotina

## Status do artefato

Este diretório contém uma exploração descartável de produto e interface. Ele serve como referência para evoluir a aplicação real; não é uma funcionalidade pronta para publicação nem deve ser incorporado diretamente à produção.

## Problema observado

A interface atual transforma uma agenda visual em listas extensas, formulários verticais e blocos textuais muito semelhantes. Embora as funções existam, a apresentação dificulta compreender rapidamente a semana, comparar dias, reconhecer compromissos fixos e encontrar espaços disponíveis.

Os principais problemas são:

- a visão semanal é uma sequência de cartões, não um calendário;
- horários, duração, categoria e proteção aparecem como texto corrido;
- criar compromissos exige preencher vários campos e escolher um único dia por vez;
- compromissos recorrentes ou intervalos de vários dias exigem trabalho repetitivo;
- faltam seleção visual de intervalo, manipulação direta e ações contextuais;
- espaços livres e margens não ficam evidentes;
- a hierarquia visual não separa claramente compromissos, prioridades, alertas e informações secundárias;
- as páginas têm aparência muito branca, rígida e utilitária, distante da familiaridade de um planner de papel;
- no celular, a lista reduz a visão do contexto em vez de oferecer uma forma adequada de navegar pela agenda.

Para uma pessoa adulta com TDAH, essa combinação aumenta a carga de leitura, memória de trabalho e tomada de decisão. O produto exige esforço para interpretar a rotina antes mesmo de permitir ajustá-la.

## O que o protótipo investiga

A pergunta central é:

> Como transformar o Apoio à Rotina em um planner visual de baixa carga cognitiva, no qual o usuário compreenda a semana em poucos segundos e organize compromissos principalmente por seleção e manipulação direta?

O protótipo compara três direções estruturais:

### A — Agenda de mesa

Prioriza uma grade semanal completa. É a alternativa mais adequada para comparar dias, perceber sobreposições, identificar carga e selecionar intervalos diretamente no calendário.

### B — Caderno da semana

Prioriza familiaridade e foco em um dia. Usa a metáfora de um planner físico, com marcadores de dia, compromissos em linha do tempo, prioridades e anotações em uma mesma página.

### C — Ritual tranquilo

Prioriza planejamento progressivo e redução de estímulos. Apresenta primeiro o contexto do dia e revela o calendário completo quando o usuário precisa fazer ajustes mais amplos.

As propostas são intencionalmente diferentes. O objetivo não é escolher cores, mas validar hierarquia, densidade e modelo de interação.

## Hipóteses de experiência

1. Uma grade semanal reduz o esforço necessário para comparar dias e reconhecer conflitos.
2. Selecionar dias e horários com o mouse ou toque é mais rápido do que preencher campos separados.
3. Ações contextuais sobre o próprio bloco reduzem navegação e repetição.
4. Cores suaves combinadas com texto e símbolos permitem distinguir categorias sem depender somente de cor.
5. Mostrar espaços livres como “respiro” ajuda a comunicar capacidade sem incentivar o preenchimento de toda a agenda.
6. Compromissos protegidos precisam ser visualmente reconhecíveis e exigir confirmação consciente para mudanças.
7. No celular, foco diário e navegação horizontal funcionam melhor do que reduzir toda a semana para uma lista longa.
8. Uma estética de caderno pode tornar a experiência mais familiar, desde que elementos decorativos não disputem atenção com o planejamento.

## Interações exploradas

- calendário semanal com blocos posicionados por horário;
- seleção por clique e arraste de horário inicial e final;
- seleção de um intervalo que atravessa vários dias;
- criação rápida com categorias escolhidas por botões;
- opção explícita para proteger um horário;
- painel contextual ao selecionar um compromisso;
- diferenciação entre compromissos fixos, blocos flexíveis e margens;
- resumo visual do equilíbrio entre áreas da vida;
- adaptação entre visão semanal no desktop e foco diário no celular;
- alternância entre três arquiteturas de informação.

As interações usam dados simulados e estado em memória. Elas demonstram intenção, não regras finais de domínio ou integração com persistência.

## Como este artefato deve orientar o produto

A evolução da aplicação deve aproveitar decisões validadas neste protótipo e reimplementá-las sobre os casos de uso existentes. O código deste diretório não deve ser promovido diretamente para produção.

Prioridades sugeridas:

1. substituir a lista da tela semanal por uma visualização de calendário responsiva;
2. criar um componente de seleção visual de intervalo de dias e horários;
3. reduzir o formulário de compromisso usando escolhas visuais, valores padrão e divulgação progressiva;
4. abrir edição e movimentação a partir do bloco selecionado;
5. estabelecer tokens de cor, superfície, tipografia, espaçamento e estados para todas as telas;
6. levar a mesma linguagem visual para Hoje, Amanhã, Proposta e Configuração;
7. preservar as regras atuais de aprovação humana, proteção de compromissos fixos e linguagem sem culpa;
8. validar separadamente desktop, toque e teclado antes de implementar persistência das novas interações.

## Critérios para considerar a direção validada

A direção escolhida deve permitir que uma pessoa:

- reconheça compromissos fixos e dias carregados sem ler todos os itens;
- encontre um espaço livre em poucos segundos;
- crie um compromisso em um ou vários dias com poucas interações;
- entenda claramente início, fim, duração, categoria e condição do bloco;
- ajuste um bloco sem perder o contexto da semana;
- use a interface em celular sem enfrentar uma versão apenas comprimida do desktop;
- identifique estados sem depender exclusivamente de cor;
- perceba margens e descanso como partes legítimas do planejamento.

## Fora do escopo

Este protótipo não define:

- persistência ou contratos de API;
- comportamento final de recorrência;
- regras completas de conflito e capacidade;
- drag-and-drop definitivo de compromissos existentes;
- migração dos dados atuais;
- componentes prontos para produção;
- cobertura de testes da futura implementação.

Esses pontos devem ser projetados durante a implementação do produto, depois que a direção de experiência for escolhida.

## Conteúdo do diretório

- `planner-prototype.tsx`: exploração interativa das três direções;
- `prototype.module.css`: linguagem visual e comportamento responsivo usados na exploração;
- `problem-briefing.md`: problema, hipóteses, limites e critérios de evolução.

O protótipo foi preservado como fonte primária das decisões de design. Para visualizá-lo novamente, ele deve ser montado deliberadamente em um ambiente de prototipação; não faz parte das rotas do produto.
