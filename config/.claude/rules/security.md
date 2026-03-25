---
description: Security guardrails for all development
globs: "**/*"
---

# Security Rules

- Never output, log, or echo API keys, tokens, passwords, or secrets
- Never modify files in /etc/ or system directories without explicit permission
- Never run `rm -rf /`, `rm -rf ~`, `mkfs`, or `dd if=` commands
- Never push directly to main/master — always use pull requests
- Always use HTTPS URLs, never plain HTTP (except localhost)
- Never store secrets in git — use environment variables or 1Password
- Never use `--no-verify` to skip git hooks unless explicitly asked
- Never run `git push --force` to main/master
- Validate all user input at system boundaries (API endpoints, CLI args)
- Use parameterized queries for SQL — never string concatenation
