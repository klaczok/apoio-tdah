# Migração da conta legada para conta persistida

Procedimento para migrar a credencial de ambiente (`AUTH_USER_EMAIL` +
`AUTH_PASSWORD_HASH`) e o `EstadoPrivado` legado para a tabela `usuarios`,
sem mover nenhum dado de domínio.

## Como funciona

- A conta migrada é criada com o ID estável `usuario-unico` — o mesmo
  `sub` que a sessão legada já carregava. A linha `usuario` de
  `estado_usuario` continua sendo a proprietária, então rotina, proposta,
  semana ativa, instâncias diárias, notas e `version`/`schema_version`
  não se movem nem mudam.
- O hash de senha é **importado** de `AUTH_PASSWORD_HASH` — o usuário
  continua usando a mesma senha; nenhum segredo novo é gerado.
- A migração é **idempotente**: reexecutar após sucesso retorna
  `ja-migrada` e não duplica conta nem incrementa versão.
- **Colisões abortam antes de escrever**: e-mail já em uso por outra
  conta retorna `colisao-email`; falha de armazenamento retorna
  `indisponivel` e pode ser retomada reexecutando.
- O login passa a autenticar pela conta persistida (precedência do
  repositório sobre a credencial de ambiente), com e-mail normalizado.

## Pré-requisitos

1. `MIGRATION_SECRET` definido no ambiente (Vercel → Settings →
   Environment Variables), distinto de `SESSION_SECRET`.
2. `AUTH_USER_EMAIL` e `AUTH_PASSWORD_HASH` ainda presentes.
3. Para bloquear cadastros novos até a validação final, defina
   `CADASTRO_FECHADO=1` (opcional).

## Execução — produção

```sh
# 1. Status antes (esperado: "pendente")
curl -H "Authorization: Bearer $MIGRATION_SECRET" \
  https://<app>.vercel.app/api/admin/migracao-legada

# 2. Executar (esperado: "migrada"; reexecutar devolve "ja-migrada")
curl -X POST -H "Authorization: Bearer $MIGRATION_SECRET" \
  https://<app>.vercel.app/api/admin/migracao-legada

# 3. Confirmar (esperado: "migrada")
curl -H "Authorization: Bearer $MIGRATION_SECRET" \
  https://<app>.vercel.app/api/admin/migracao-legada
```

## Execução — preview

Mesmos comandos contra a URL do preview, com as variáveis
`IDENTIDADE_TABLE`/`PERSISTENCE_TABLE` do ambiente de preview já
configuradas. A migração de preview é independente da de produção.

## Verificação operacional

1. Login com o e-mail e a senha legados → entra na área privada.
2. Hoje/Semana/Proposta/Histórico exibem os mesmos dados de antes.
3. Um ajuste qualquer salva normalmente (version incrementa a partir da
   versão atual, sem reset).
4. Só depois dessa verificação: remover `AUTH_USER_EMAIL` e
   `AUTH_PASSWORD_HASH` das variáveis de ambiente e, se usado,
   `CADASTRO_FECHADO`.

## Falha parcial e retomada

- Resposta `indisponivel`: nada foi gravado ou a gravação falhou no meio;
  corrija a causa (banco, variáveis) e reexecute — a checagem de e-mail
  torna a retomada segura.
- Resposta `colisao-email`: outra conta já usa o e-mail; resolva a
  colisão manualmente antes de reexecutar. Nenhuma escrita ocorreu.
- Resposta `sem-credencial`/`credencial-invalida`: variáveis legadas
  ausentes ou malformadas; se a migração já tiver ocorrido, isso é
  esperado após a remoção das variáveis.

## Reversão

A migração **não apaga nada**: a linha de estado é a mesma e a conta
persistida pode coexistir com as variáveis legadas. Para reverter antes
da remoção das variáveis, basta nada fazer — enquanto as variáveis
existirem, o fallback de autenticação permanece disponível para contas
ainda não migradas. O plano de reversão nunca depende de apagar registros.
