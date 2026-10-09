# 0001. Persistência em Postgres gerenciado, sem adapter CSV

## Status

Aceito — 2026-10-09

## Contexto

O spec descrevia a primeira persistência como um adapter CSV sobre armazenamento de objetos compatível com a Vercel, com CSV empacotado apenas como seed de leitura. Para a issue #5, o mantenedor decidiu usar o Postgres da Vercel como armazenamento durável e abandonar o CSV.

## Decisão

- O domínio acessa dados somente pela interface `StateStore` (carregar/salvar o estado do usuário), sem conhecer SQL, `pg` ou variáveis de ambiente.
- O adapter de produção é `PostgresStateStore`, executado no servidor sobre `POSTGRES_URL` (Vercel Postgres/Neon). A tabela `estado_usuario` guarda documento JSONB com `schema_version`, `version` (controle otimista de concorrência) e timestamps.
- `MemoryStateStore` atende desenvolvimento local e testes quando `PERSISTENCE_DRIVER=memory`.
- Os testes de contrato da interface são compartilhados entre os adapters; o adapter Postgres é exercido via `pg-mem`, sem banco real em CI.
- O hash de credencial permanece fora do estado persistido (variáveis de ambiente, issue #4).

## Consequências

- As seções de `spec.md` que mencionam CSV/RFC 4180 ficam superadas para escrita; serialização canônica passa a ser JSONB e os tipos do `EstadoPrivado`.
- Produção exige um banco Postgres provisionado e a variável `POSTGRES_URL` configurada; sem ela o adapter responde `armazenamento-indisponivel` de forma explícita.
- Migrações futuras incrementam `SCHEMA_VERSION` e o adapter deve transformar documentos antigos ou rejeitá-los com `schema-invalido`.
