# Conteúdo para publicação — Apoio à Rotina

Material de divulgação do projeto. Prints em `./prints/`.

---

## Métricas reais (coletadas em 09/10/2026)

### Git / repositório

| Métrica | Valor |
|---|---|
| Tempo de desenvolvimento | ~10h (primeiro commit 08/10 22:34 → último 09/10 08:26) |
| Commits na `main` | 25 |
| Issues no GitHub | 18 (1 setup + 17 slices de implementação), todas fechadas |
| Pull requests | 14 |
| Arquivos alterados | 104 |
| Linhas adicionadas (total) | ~25.700 (incl. lockfile) |
| Código-fonte (`src/`) | 55 arquivos, ~8.300 linhas |
| Testes (`tests/`) | 31 arquivos, ~5.900 linhas, ~330 casos de teste |
| Documentação | briefing 20 linhas → PRD 602 linhas → spec 370 linhas |

### Stack e pipeline

- Next.js 16 + React 19 + TypeScript
- PostgreSQL (Neon) com estado versionado; `pg-mem` nos testes
- Deploy automático na Vercel (push na `main` → produção; PR → preview com smoke test)
- CI obrigatório (lint + typecheck + testes) com branch protection
- Acessibilidade validada com `jest-axe`

### Métricas do agente (Devin)

- Pipeline de skills: `grill-me` (entrevista de produto) → `to-prd` (PRD) → `grill-me-with-docs` (spec técnica) → `to-tickets` (18 issues ordenadas por dependência)
- 18 issues executadas ponta a ponta em uma única sessão overnight
- Cada slice entregue com testes, CI verde e merge via PR
- Zero retrabalho de arquitetura: o módulo de persistência já nasceu atrás de interface (CSV planejado → Postgres real sem reescrever domínio)

---

## Post — LinkedIn

**Versão longa:**

Ontem à noite eu transformei um briefing de 20 linhas em um produto completo, em produção, em uma única sessão com agente de IA. E o mais interessante não foi a velocidade — foi o processo.

O projeto: um planejador pessoal de baixa carga cognitiva para apoio à rotina de uma pessoa com TDAH — trabalho híbrido, paternidade, terapia, alimentação, estudos e música. O usuário abre o app na véspera para planejar o dia e no fim do dia para revisar, sem culpa e sem gamificação.

O pipeline que usei com o Devin:

1️⃣ **Briefing com o usuário** — 20 linhas de necessidades reais: jornada de 8h, presencial quarta e quinta, terapia às quintas, filho de 4 anos, orquestra aos sábados, plano alimentar em PDF.

2️⃣ **Grill-me** — a skill me "entrevistou" (e ao usuário) implacavelmente antes de escrever qualquer coisa. Foi aqui que nasceram os princípios de produto: planejar por capacidade, no máximo 3 prioridades por dia, linguagem factual sem julgamento.

3️⃣ **To-PRD** — gerou um PRD de 600 linhas com persona, objetivos, não-objetivos ("não vigiar o usuário", "não transformar pendência em acúmulo") e princípios claros.

4️⃣ **Contexto técnico** — adicionei restrições: React, CI obrigatório, deploy na Vercel, persistência simples no MVP.

5️⃣ **Grill-me-with-docs** — gerou a spec técnica de 370 linhas já incorporando PRD + contexto. A decisão-chave saiu daqui: persistência atrás de uma interface, porque CSV em serverless seria efêmero — o slice 5 migrou para Postgres sem tocar no domínio.

6️⃣ **To-tickets** — decompôs a spec em 18 issues no GitHub, ordenadas por dependência, com critérios de aceite e `Blocked by` explícito.

Depois disso, o agente executou os 17 slices de implementação em sequência — cada um com testes, CI verde e PR mergeado.

📊 Os números de uma noite:
• 25 commits | 14 PRs | 104 arquivos
• ~8.300 linhas de código + ~5.900 linhas de testes (~330 casos)
• Next.js 16 + React 19 + TypeScript + Postgres (Neon) na Vercel
• Preview deploy com smoke test em cada PR, branch protection na main
• Acessibilidade validada com jest-axe

O que mais me impressionou: o valor não está em "a IA escreveu código rápido". Está em o funil briefing → PRD → spec → tickets ter forçado decisões de produto antes de qualquer linha de código. Quando a implementação começou, não havia ambiguidade — cada slice era pequeno, verificável e independente.

A parte humana continua sendo a mais importante: saber o que pedir, revisar as decisões e manter o critério. O agente acelera a execução, não o discernimento.

#AI #SoftwareEngineering #Devin #ProductDevelopment #NextJS #TDAH

---

**Versão curta (alternativa):**

De um briefing de 20 linhas a um produto em produção em uma noite.

Usei um pipeline de skills de IA: `grill-me` entrevistou o usuário → `to-prd` gerou o PRD → `grill-me-with-docs` gerou a spec técnica → `to-tickets` decompôs em 18 issues → o agente implementou os 17 slices com testes, CI e deploy na Vercel.

O resultado: ~14k linhas de código e testes, 330 casos de teste, Postgres na Neon, preview com smoke test por PR — tudo em ~10h.

A lição: a velocidade veio da clareza. Cada artefato do funil eliminou ambiguidade antes do código existir.

#AI #SoftwareEngineering #Devin

---

## Post — Instagram

**Caption:**

De 20 linhas de briefing a um app em produção. Em uma noite. 🤯

Esse é o Apoio à Rotina: um planejador pessoal de baixa carga cognitiva que construí com agente de IA para apoiar a rotina de uma pessoa com TDAH — trabalho, filho de 4 anos, terapia, orquestra, estudos e alimentação, sem culpa e sem gamificação.

O processo foi o mais legal:
📝 Briefing com o usuário (20 linhas)
🔍 Grill-me: a IA me entrevistou até o produto fazer sentido
📋 To-PRD: documento de produto com 600 linhas
⚙️ Contexto técnico: React, CI, Vercel, Postgres
📐 Grill-me-with-docs: spec técnica de 370 linhas
🎫 To-tickets: 18 issues no GitHub ordenadas por dependência
🤖 Agente executou os 17 slices: cada um com testes, CI verde e PR mergeado

Os números:
→ 25 commits | 14 PRs | ~10 horas
→ ~8.300 linhas de código + ~5.900 de testes (330 casos)
→ Next.js 16 + React 19 + Postgres (Neon) na Vercel
→ Smoke test automático em cada deploy de preview

O segredo não foi a IA escrever rápido — foi o funil de documentação eliminar toda ambiguidade ANTES do código existir. Quando a implementação começou, era só executar.

A parte humana? Saber o que pedir e revisar as decisões. Isso ninguém delega. 💡

#devlife #ai #coding #webdev #nextjs #react #programacao #techbr #tdah #produtividade

---

**Sugestão de carrossel (ordem dos prints em `prints/`):**

1. `00-login.png` — capa: "De briefing a produção em 1 noite"
2. `03-semana.png` — visão semanal com dados reais (o print mais rico visualmente)
3. `02-amanha.png` — planejamento da véspera
4. `04-proposta.png` — proposta semanal gerada pelo app
5. `01-hoje.png` — revisão do dia (estados factuais)
6. `07-hoje-mobile.png` — mostrar responsividade

Texto de overlay sugerido para o slide 1:
> "20 linhas de briefing → app em produção
> Pipeline: grill-me → PRD → spec → 18 tickets → 17 slices
> Swipe para ver o resultado →"

---

## Notas

- Não publicar URL do app: é um produto pessoal com dados privados (login único).
- Os prints foram gerados em ambiente local com dados reais do banco de desenvolvimento — revisar se algum dado pessoal aparece antes de postar (ex.: anotação "teste de anotação" no print `01-hoje.png`).
- A senha do app aparece no briefing original — não incluir em nenhum post.
