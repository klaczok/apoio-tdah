# Issue tracker: GitHub Issues

Os tickets e as especificações deste repositório são armazenados no GitHub Issues de `klaczok/apoio-tdah`.

## Convenções

- Uma funcionalidade por issue.
- Os tickets são numerados no título, em ordem de dependência.
- O estado de triagem é registrado com as labels definidas em `triage-labels.md`.
- Cada issue contém `## What to build`, `## Acceptance criteria` e `## Blocked by`.
- Dependências usam links para as issues bloqueadoras ou `None (can start immediately)`.
- Um ticket fica desbloqueado quando todas as issues listadas como bloqueadoras estão fechadas.
- A fronteira é composta pelas issues abertas, desbloqueadas e não atribuídas, priorizadas pelo número.

## Publicação

Quando uma skill solicitar a publicação no issue tracker, crie ou atualize uma issue em `klaczok/apoio-tdah`. Não crie tickets locais em `.scratch/`.

## Leitura

Quando uma skill solicitar um ticket, leia a issue indicada pelo número ou URL fornecido pelo usuário.

## Operações de navegação

- Listar: `gh issue list --repo klaczok/apoio-tdah`
- Consultar: `gh issue view <numero> --repo klaczok/apoio-tdah`
- Dependências: seção `## Blocked by` no corpo da issue
- Reivindicar: atribuir a issue antes de iniciar o trabalho
- Resolver: registrar a entrega na issue e fechá-la somente após verificação
