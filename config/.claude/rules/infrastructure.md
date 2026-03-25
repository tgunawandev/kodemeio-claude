---
description: Infrastructure and deployment safety for Dokploy/Hetzner
globs: "**/docker-compose*.yml,**/Dockerfile*,**/terraform/**,**/*.tf,**/.env*"
---

# Infrastructure Rules

- Never expose ports directly — use Dokploy reverse proxy (dokploy.kodeme.io)
- All services must join `dokploy-network` (external: true)
- PostgreSQL 16 is the standard database version
- Always include healthchecks in docker-compose services
- Terraform changes require `terraform plan` review before `terraform apply`
- Use Authentik SSO (auth.kodeme.io) for all service authentication
- Docker images should use specific version tags, not `latest` in production
- All .env files must have a corresponding .env.example (sanitized)
- Resource limits (cpus, memory) are required in production compose files
- Restart policy: `unless-stopped` for production services
