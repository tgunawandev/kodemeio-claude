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
- Never run `docker rm -f` or `docker system prune` without explicit permission
- Never stop Dokploy's own containers (dokploy, traefik)
- Always use `docker compose -f <project>/docker-compose.yml` — never bare `docker run`
- Before `terraform apply`, always run `terraform plan` and show the output first
- Never run `git push --force` to 18.0 branch (Odoo production)
- Never display plaintext secrets in `config show` output — always mask with `****`
- Never write API keys, tokens, or passwords into CLAUDE.md, README.md, or any committed docs
- When showing config with secrets, use masking pattern: first4****last4
