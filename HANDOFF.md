# Handoff — GitHub e tickets do Apoio à Rotina

## Objetivo

Continuar a preparação do projeto após reiniciar o Devin com permissões administrativas:

1. instalar e autenticar o GitHub CLI;
2. inicializar o repositório Git local;
3. criar o repositório público `apoio-tdah` na conta pessoal autenticada;
4. atualizar o tracker configurado de Markdown local para GitHub Issues;
5. criar as labels de triagem em português;
6. publicar no GitHub as 18 issues aprovadas, em ordem de dependência;
7. configurar relações de bloqueio quando a plataforma permitir ou registrar `Blocked by` no corpo;
8. preparar as orientações e a configuração posterior da Vercel.

## Estado atual

- Diretório: `/home/klaczok/Documentos/projetos/apoio-tdah`
- Ainda não é um repositório Git.
- O GitHub CLI (`gh`) não está instalado.
- A tentativa de instalação com `apt-get` falhou por falta de permissão administrativa.
- O usuário aprovou:
  - nome do repositório: `apoio-tdah`;
  - visibilidade: pública;
  - proprietário: conta pessoal autenticada no GitHub;
  - decomposição em 18 slices;
  - instalação e uso do `gh` para criação do repositório e das issues.
- Não solicitar nem registrar token, senha, hash real ou dados pessoais na conversa ou no repositório.

## Fontes de produto

Ler integralmente antes de publicar as issues:

- `PRD.md`
- `spec.md`
- `briefing.md`
- `contexto-tech.md`
- `AGENTS.md`
- `docs/agents/issue-tracker.md`
- `docs/agents/triage-labels.md`
- `docs/agents/domain.md`

Termos canônicos: rotina recorrente, instância diária, compromisso fixo, bloco flexível, prioridade, margem, pendência, revisão, realizado, parcial, reprogramado e descartado.

## Cuidados de segurança

- Embora o briefing contenha uma senha, ela não deve ser usada diretamente, versionada ou incluída em nenhuma issue.
- Credenciais devem ser configuradas posteriormente como segredo protegido e armazenadas apenas como hash lento com salt.
- Dados familiares, de terapia, alimentação e rotina são privados e não devem ser publicados no repositório público como dados reais.
- CSV empacotado na aplicação pode ser seed de leitura, mas não é persistência durável na Vercel.
- Não executar operações destrutivas ou publicar segredos.

## Próximos passos

### 1. Instalar o GitHub CLI

Tentar:

```bash
apt-get update
apt-get install -y gh
```

Depois verificar:

```bash
gh --version
gh auth status
```

Se não estiver autenticado, iniciar:

```bash
gh auth login
```

A autenticação pelo navegador exige ação humana. Não pedir que o usuário cole token no chat.

### 2. Confirmar identidade e disponibilidade do nome

Após autenticar:

```bash
gh api user --jq .login
gh repo view "$(gh api user --jq .login)/apoio-tdah"
```

Se `apoio-tdah` já existir, não sobrescrever: informar o usuário e confirmar se deve usá-lo ou escolher outro nome.

### 3. Inicializar o Git com segurança

Antes de publicar qualquer coisa:

- conferir todos os arquivos;
- criar `.gitignore` adequado ao framework futuro, segredos, dados pessoais, `.env*` e artefatos;
- não versionar `.scratch/` se não for mais o tracker oficial;
- inicializar Git sem apagar arquivos existentes;
- criar o repositório remoto público e associar `origin`.

Não criar commit sem seguir as regras de commit do ambiente e não fazer push até que o repositório tenha sido conferido quanto a segredos.

### 4. Trocar o tracker para GitHub Issues

Atualizar:

- `AGENTS.md` para indicar GitHub Issues;
- `docs/agents/issue-tracker.md` com a configuração GitHub e o identificador real do repositório.

Manter as labels locais:

| Função canônica | Label no GitHub |
| --- | --- |
| `needs-triage` | `pendente-triagem` |
| `needs-info` | `precisa-informacoes` |
| `ready-for-agent` | `pronto-para-agente` |
| `ready-for-human` | `pronto-para-humano` |
| `wontfix` | `nao-sera-feito` |

Criar essas labels no GitHub sem apagar labels existentes.

## Backlog aprovado

Publicar uma issue por ticket, em ordem. Cada issue deve conter:

- `## What to build`;
- descrição end-to-end do comportamento;
- `## Acceptance criteria` com critérios verificáveis derivados de `PRD.md` e `spec.md`;
- `## Blocked by` com links para as issues bloqueadoras reais ou `None (can start immediately)`;
- label `pronto-para-agente`.

### 01. Criar o repositório GitHub e publicar o backlog

- **Blocked by:** nenhum.
- **Entrega:** repositório GitHub público inicializado, documentação importada, labels de triagem, proteção contra segredos/dados pessoais e backlog publicado.

Esta issue representa o bootstrap em execução. Só deve ser fechada quando o repositório e todas as issues estiverem publicados; não fechar automaticamente sem solicitação do usuário.

### 02. Entregar a fundação React validada por CI

- **Blocked by:** 01.
- **Entrega:** aplicação React com TypeScript estrito, execução no servidor, layout mobile-first mínimo e página pública verificável; PRs executam lint, formatação, tipos, testes e build.
- **Decisão recomendada:** Next.js, por oferecer React, execução no servidor e suporte à Vercel.

### 03. Disponibilizar um ambiente de preview na Vercel

- **Blocked by:** 02.
- **Entrega:** mudanças elegíveis geram preview sem dados pessoais, com smoke test e bloqueio quando CI falha.

### 04. Proteger o acesso individual

- **Blocked by:** 02 e 03.
- **Entrega:** login de usuário único, sessão segura no servidor, logout e proteção de rotas privadas; nenhum segredo chega ao navegador.

### 05. Persistir um estado privado versionado

- **Blocked by:** 04.
- **Entrega:** alteração mínima persiste após recarregar; erros, schema inválido e conflitos de versão são explícitos.
- **Inclui:** schemas versionados, interface de persistência e adapter CSV sobre armazenamento durável compatível com Vercel.

### 06. Configurar a rotina recorrente em etapas curtas

- **Blocked by:** 05.
- **Entrega:** onboarding persistente para trabalho, dias presenciais, compromissos, cuidado familiar, indisponibilidades, sono, margens e preferência de carga; desconhecidos ficam “a confirmar”.

### 07. Incorporar alimentação, estudos e música à configuração

- **Blocked by:** 06.
- **Entrega:** refeições editáveis/ocultáveis, tipo de dia com ou sem treino, meta gradual de estudo e blocos flexíveis de música.

### 08. Gerar e aprovar a proposta semanal

- **Blocked by:** 06 e 07.
- **Entrega:** proposta explicável que prioriza itens protegidos; sugestões podem ser aceitas, editadas ou removidas antes da confirmação.

### 09. Planejar amanhã em uma linha do tempo

- **Blocked by:** 08.
- **Entrega:** contexto, compromissos, linha do tempo, espaços livres, margens, carga por área e tarefas sem horário; ajustes diários não alteram recorrência; inclui saída presencial calculada.

### 10. Escolher até três prioridades

- **Blocked by:** 09.
- **Entrega:** seleção persistente de no máximo três prioridades, com substituição consciente ao atingir o limite.

### 11. Planejar com alertas de conflito e capacidade

- **Blocked by:** 09.
- **Entrega:** alertas não bloqueantes de sobreposição, margem, carga e horas de trabalho; itens protegidos exigem confirmação específica.

### 12. Gerenciar tarefas e notas no planejamento

- **Blocked by:** 09 e 10.
- **Entrega:** criar, editar, agendar, categorizar, remover/desfazer, manter sem horário, promover a prioridade, anotar e dividir tarefas.

### 13. Revisar o dia com estados factuais

- **Blocked by:** 11 e 12.
- **Entrega:** estados realizado, parcial, reprogramado e descartado; campos reflexivos opcionais; síntese factual sem pontuação.

### 14. Decidir explicitamente o destino das pendências

- **Blocked by:** 13.
- **Entrega:** manter, reduzir, dividir, trocar de dia ou descartar; destino apresenta conflito/capacidade antes da confirmação; nada é reagendado automaticamente.

### 15. Consultar e ajustar o equilíbrio semanal

- **Blocked by:** 11 e 14.
- **Entrega:** semana com itens fixos/flexíveis, carga, horas, conflitos, pendências e reprogramações; permite reduzir/mover blocos flexíveis.

### 16. Consultar histórico sem alterar a rotina recorrente

- **Blocked by:** 14 e 15.
- **Entrega:** consulta de dias, planos e revisões anteriores sem modificar recorrências futuras.

### 17. Validar acessibilidade e responsividade das jornadas

- **Blocked by:** 06, 09, 13 e 15.
- **Entrega:** onboarding, planejamento, revisão e semana funcionam em celular/desktop, teclado e tecnologias assistivas; contraste, foco e movimento reduzido verificados.

### 18. Publicar a produção com proteção operacional

- **Blocked by:** 03, 04, 05, 16 e 17.
- **Entrega:** produção Vercel somente após CI aprovado, com variáveis protegidas, armazenamento durável e smoke tests; preview e produção isolados.

## Vercel

Ainda não foi configurada. Quando chegar ao passo correspondente:

1. verificar se `vercel` CLI existe e se há autenticação;
2. não solicitar token pelo chat;
3. explicar ao usuário como autenticar pelo navegador ou configurar GitHub/Vercel;
4. solicitar/confirmar somente:
   - conta ou time Vercel;
   - projeto novo chamado `apoio-tdah` ou nome alternativo;
   - domínio padrão ou personalizado;
   - região/fuso desejados;
   - escolha do armazenamento persistente compatível;
5. configurar segredos apenas nos ambientes protegidos da Vercel/GitHub.

## Estado da tarefa

A decomposição foi aprovada. A tarefa permanece em andamento porque `gh` ainda não está instalado/autenticado e nenhuma issue foi publicada.
