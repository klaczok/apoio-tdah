# Operação — produção e recuperação

Documento operacional do **Apoio à Rotina**. Nenhum segredo ou valor de credencial aparece aqui — nomes de variáveis apenas.

## Ambientes

| Ambiente | Origem | Dados | Sessão |
|---|---|---|---|
| Produção | push na `main` → deploy Vercel automático | tabela `estado_usuario` (Neon) | `SESSION_SECRET` de produção |
| Preview | PR → deploy Vercel automático | tabela `estado_usuario_preview` (mesmo Neon, via `PERSISTENCE_TABLE`) | `SESSION_SECRET` próprio do preview |
| Desenvolvimento | `vercel env pull` → `.env.local` (gitignored) | tabela `estado_usuario` | mesma sessão de desenvolvimento |

Preview e produção compartilham o projeto Neon, mas **não compartilham dados nem sessões**: o preview grava em tabela separada e assina cookies com segredo próprio. Credenciais de login (`AUTH_USER_EMAIL`, `AUTH_PASSWORD_HASH`) são as mesmas em todos os ambientes por ser uma conta pessoal única — sessões ainda assim são isoladas pelo segredo distinto.

## Variáveis obrigatórias

Definidas na Vercel por ambiente (dashboard → Settings → Environment Variables):

- `AUTH_USER_EMAIL`, `AUTH_PASSWORD_HASH` — login individual.
- `SESSION_SECRET` — assinatura do cookie de sessão (valor diferente por ambiente).
- `planejador_pessoal_db_POSTGRES_URL` — conexão Neon (a aplicação também aceita qualquer variável com sufixo `_POSTGRES_URL`).
- `PERSISTENCE_TABLE` — **somente preview**: `estado_usuario_preview`.

A ausência de variável de auth faz o login falhar fechado (503 + redirect para `/login`), nunca abre acesso.

## Gate de promoção

- CI (`validate`) é obrigatório para merge na `main` — branch protection ativa.
- O workflow `preview.yml` roda `scripts/smoke.sh` no deploy de preview; falha marca o job como falho.
- Deploy de produção acontece só via push na `main` (integração Git da Vercel) — não se usa `vercel deploy --prod` manual.

## Smoke test

```bash
./scripts/smoke.sh https://<dominio-de-producao>
```

Verifica sem escrever dados pessoais:

1. Página pública (`/login`) carrega.
2. Rota privada (`/hoje`) sem sessão redireciona para `/login`.
3. Credencial inválida devolve `?erro=credencial`.
4. Com `SMOKE_EMAIL` e `SMOKE_PASSWORD` no ambiente: login → sessão → `/hoje` autenticado (leitura persistida) → logout → sessão encerrada.

Qualquer falha encerra com código 1 — promover só com smoke verde.

## Rollback e recuperação

Rollback de aplicação (deploy anterior):

```bash
npx vercel ls planejador-pessoal            # achar o deployment Ready anterior
npx vercel rollback <deployment-url>        # promove o deploy anterior
# ou: git revert <commit> && git push origin main  (rollback via código)
```

Rollback de dados:

- O estado é uma única linha JSONB na tabela do ambiente (`estado_usuario`). O Neon mantém histórico/branching — restaurar pelo console do Neon ou por backup exportado.
- Regressão de schema: `SCHEMA_VERSION` é incrementado a cada mudança de formato e migrações rodam no carregamento. Para voltar atrás, restaurar o backup do JSON ou editar a linha manualmente no console do Neon.

Recuperação de acesso:

- Perda do `SESSION_SECRET`: gerar novo valor e atualizar a variável — sessões antigas invalidam, dados persistidos não se perdem.
- Perda da senha: gerar novo hash com `scripts/hash-password.mjs` e atualizar `AUTH_PASSWORD_HASH` na Vercel (produção e demais ambientes desejados).

## Fuso e datas

Datas civis usam `America/Sao_Paulo` (`src/server/tempo.ts`). Instantes de auditoria (`registradaEm`, `concluidaEm`, `criado_em`) são ISO/UTC — data civil e instante não se misturam.
