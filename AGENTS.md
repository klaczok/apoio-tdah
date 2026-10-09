## Agent skills

### Issue tracker

Os tickets são armazenados no GitHub Issues do repositório `klaczok/apoio-tdah`. Consulte `docs/agents/issue-tracker.md`.

### Triage labels

As cinco funções canônicas de triagem são mapeadas para labels em português. Consulte `docs/agents/triage-labels.md`.

### Domain docs

Este repositório usa documentação de domínio single-context. Consulte `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
