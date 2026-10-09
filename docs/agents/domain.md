# Documentação de domínio

Como as skills de engenharia devem consumir a documentação de domínio deste repositório ao explorar a base de código.

## Leia antes de explorar

- `CONTEXT.md` na raiz do repositório: fonte do glossário e dos conceitos do domínio
- `docs/adr/`: decisões arquiteturais relacionadas à área que será alterada

Se algum desses arquivos não existir, prossiga silenciosamente. Não sinalize sua ausência nem sugira sua criação antecipada. Crie-os somente quando conceitos ou decisões forem efetivamente definidos.

## Estrutura

Este é um repositório single-context:

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

## Use o vocabulário do glossário

Ao nomear conceitos de domínio em tickets, propostas de refatoração, hipóteses ou testes, use os termos definidos em `CONTEXT.md`. Não substitua termos estabelecidos por sinônimos.

Se um conceito necessário não estiver no glossário, reavalie se a linguagem pertence ao projeto ou registre a lacuna para modelagem de domínio.

## Sinalize conflitos com ADRs

Se uma proposta contradisser um ADR existente, sinalize o conflito explicitamente em vez de sobrescrever silenciosamente a decisão.
