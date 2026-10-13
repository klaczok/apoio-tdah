# 0002. Identidade persistida no Postgres e sessão identificada por usuário

## Status

Aceito — 2026-10-12

## Contexto

O acesso era individual: a credencial vivia em `AUTH_USER_EMAIL` + `AUTH_PASSWORD_HASH` e o token de sessão carregava o sujeito fixo `usuario-unico`. O spec v2 (seção 6) prevê cadastro aberto e isolamento de estado por conta, o que exige identidade persistida no Postgres já provisionado — antes da migração do usuário legado e sem interromper o acesso atual.

## Decisão

- Novo módulo `src/server/identidade/` com a interface `UserStore` (`criarUsuario`, `buscarPorEmail`, `buscarPorId`), separada do `StateStore` e das regras de rotina. O domínio continua sem conhecer SQL, cookies ou credenciais.
- A tabela `usuarios` guarda `id` (TEXT opaco, UUID gerado pela aplicação), `email` normalizado (trim + minúsculas) com constraint `UNIQUE`, `senha_hash` serializado (`scrypt:N:r:p:saltHex:keyHex`, salt aleatório individual) e `criado_em`/`atualizado_em`. A unicidade é garantida pelo banco — violação `23505` vira `email-em-uso`.
- `MemoryUserStore` atende desenvolvimento e testes; `PostgresUserStore` é exercitado via `pg-mem` em CI. A tabela é configurável por `IDENTIDADE_TABLE` para isolar preview de produção, no mesmo padrão de `PERSISTENCE_TABLE`.
- O token de sessão passa a carregar o ID do usuário em `sub`; `verifySessionToken` retorna `IdentidadeAutenticada | null` em vez de booleano e rejeita sujeito vazio, expiração e adulteração.
- O login consulta primeiro o `UserStore`; e-mail encontrado autentica somente pelo hash persistido. E-mail ausente — ou repositório indisponível — cai na credencial legada de ambiente, que emite sessão com o sujeito estável `usuario-unico` (`ID_USUARIO_LEGADO`), preservando o acesso atual e as sessões existentes.
- O hash de credencial permanece fora do `EstadoPrivado`; senha em texto claro não é persistida nem registrada.

## Consequências

- `AUTH_USER_EMAIL`/`AUTH_PASSWORD_HASH` deixam de ser obrigatórias quando há usuários persistidos, mas `SESSION_SECRET` continua obrigatória — sua ausência responde 503.
- Sujeito de sessão deixa de ser constante: consumidores que assumirem `usuario-unico` devem usar a identidade retornada pela verificação. O `StateStore` é contextualizado por `usuarioId` — páginas e APIs resolvem o proprietário via `storeDoUsuario()` (cookie assinado, nunca `userId` do cliente) e `proprietarioDoEstado` mapeia `usuario-unico` para a linha histórica `usuario` durante a transição.
- A migração da conta legada para `usuarios` e a remoção das variáveis de ambiente são passos posteriores, explicitados no spec v2 (seção 8).
