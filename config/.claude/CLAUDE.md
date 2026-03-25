# Kodemeio Empire — Claude Code Global Context

You are developing code for 4 companies, 34 repos.

## Companies
- Kodemeio (kodeme.io): B2B SaaS — React 11 apps, Odoo 53 modules, FastAPI 12 services, Next.js 6 sites
- Kontenos (kontenos.com): Content platform — Next.js, FastAPI, React PWAs, Postiz scheduler
- JournalTX (journaltx.com): Trading — Freqtrade, QuantConnect, Hummingbot, 6 repos
- KidNeuro (kidneuro.io): Healthcare — Godot games, Savant video AI, Immich media

## Shared Infrastructure (kodemeio-core + kodemeio-infra)
- 13 services: Authentik SSO, PostgreSQL 16, Mailcow, Plane, Gatus, GlitchTip, OpenClaw...
- 3 IaC: Hetzner (Terraform), Cloudflare, Dokploy
- Server: dokploy.kodeme.io (Hetzner cx42, 8 vCPU, 16 GB)

## Conventions
- Conventional Commits
- Docker Compose for all deployments
- PostgreSQL 16 shared database
- Authentik SSO across all services
- pnpm (Node.js), uv (Python)
