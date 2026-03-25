---
description: Enforce conventional commits and package manager standards
globs: "**/*"
---

# Commit & Package Conventions

- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `ci:`
- Always include `Co-Authored-By: Claude <noreply@anthropic.com>` in AI-generated commits
- Never commit `.env`, `.credentials.json`, or files containing API keys/tokens
- Use pnpm (not npm/yarn) for all Node.js projects
- Use uv (not pip) for all Python projects
- Lock files (pnpm-lock.yaml, uv.lock) must be committed
- Branch naming: `feat/`, `fix/`, `chore/` prefixes matching commit type
