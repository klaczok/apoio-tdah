# Validação manual — experiência multiusuário (issue 32)

Checklist operacional da validação que não é automatizável. Executar em
preview e depois em produção, **antes** de remover `CADASTRO_FECHADO`.

## Coberto pela suíte automatizada

- `tests/app/acessibilidade.test.tsx` — jest-axe em login, cadastro
  (incl. formulário inválido), onboarding, Hoje, Amanhã, Semana (vazia,
  populada e com erro), Proposta, Histórico (lista+detalhe) e
  `/semana/novo` (incl. erro).
- `tests/app/isolamento.test.tsx` — duas contas não leem nem gravam dados
  uma da outra; `userId` do cliente nunca é autoridade; sessão ausente
  redireciona; conta legada permanece na linha `usuario`.
- `tests/auth/session.test.ts` — expiração e assinatura do cookie.
- `tests/migracao/` — migração idempotente, colisões e guarda de segredo.
- Build, lint, typecheck e Prettier rodam no check `validate`.

## Revisão manual pendente

- [ ] Contraste real (axe desabilita `color-contrast` em jsdom) nos
  temas/estados: vazio, denso, alerta, erro, formulário inválido, painel
  de detalhe aberto — desktop e celular.
- [ ] Zoom 200% e 400%, sem scroll horizontal em conteúdo principal.
- [ ] Toque: alvos ≥44px, safe-area na navegação inferior, nenhum
  conteúdo coberto pelo cabeçalho/nav.
- [ ] Teclado: ordem de foco pela sidebar/nav/agenda/formulários, foco
  visível, Escape/fechamento e restauração de foco no painel de detalhe.
- [ ] Leitor de tela: regiões, `aria-current` no dia selecionado,
  títulos/datas de blocos, proteção de fixos, `role=status`/`alert`.
- [ ] Duas contas reais na Vercel: cadastro → login → logout →
  expiração de sessão; nenhuma leitura/escrita cruzada.
- [ ] Conta legada pós-migração (`docs/operacao/migracao-legado.md`):
  login, dados íntegros, escrita incrementa `version`.
- [ ] Preview e produção isolados (`PERSISTENCE_TABLE` distintas).
- [ ] Ausência confirmada: recorrência nova, seleção multidia,
  drag-and-drop, auditoria, filtros, personalização de categorias.
- [ ] Sessões controladas de usabilidade (compreensão da semana, fixos,
  espaço livre, ajuste contextual, navegação móvel, cadastro).

## Abertura controlada do cadastro

1. Todos os itens acima verificados.
2. Vercel → variáveis de ambiente → remover `CADASTRO_FECHADO` (ou
   definir `0`) e fazer redeploy — variáveis de ambiente na Vercel só
   passam a valer no deploy seguinte. A abertura fica assim controlada
   por configuração, independente de mudança de código.
3. Smoke test: cadastrar conta nova, sair, entrar de novo.
4. Manter `MIGRATION_SECRET` e as variáveis legadas até a validação da
   conta migrada estar concluída.
