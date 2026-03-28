# Kodemeio Empire — Claude Code Global Context

You are developing code for 4 companies, 34 repos.

## Companies
- Kodemeio (kodeme.io): B2B SaaS — React 11 apps, Odoo 53 modules, FastAPI 12 services, Next.js 6 sites
- Kontenos (kontenos.com): Content platform — Next.js, FastAPI, React PWAs, Postiz scheduler
- JournalTX (journaltx.com): Trading — Freqtrade, QuantConnect, Hummingbot, 6 repos
- KidNeuro (kidneuro.io): Healthcare — Godot games, Savant video AI, Immich media

## Shared Infrastructure (kodemeio-core + kodemeio-infra)
- 12 services: Authentik SSO, PostgreSQL 16, Mailcow, Plane, Gatus, GlitchTip...
- 3 IaC: Hetzner (Terraform), Cloudflare, Dokploy
- Server: dokploy.kodeme.io (Hetzner cx42, 8 vCPU, 16 GB)

## Conventions
- Conventional Commits
- Docker Compose for all deployments
- PostgreSQL 16 shared database
- Authentik SSO across all services
- pnpm (Node.js), uv (Python)

## Workspace Layout (Container)
- /opt/dev/kodemeio-app/ — 11 React PWA apps, Odoo 53 modules, FastAPI 12 services, Next.js 6 sites
- /opt/dev/kodemeio-core/ — Shared infra repos (authentik, mailcow, postgres, plane, glitchtip, etc.)
- /opt/dev/kodemeio-ext/ — 3rd-party integrations (1password, etc.)
- /opt/dev/kodemeio-infra/ — Terraform, Cloudflare, Dokploy IaC
- /opt/dev/kontenos-app/ — Content platform repos
- /opt/dev/journaltx-app/ — Trading bot repos
- /opt/dev/kidneuro-app/ — Healthcare/gaming repos

## Key Services
- Authentik SSO: auth.kodeme.io
- PostgreSQL 16: db.kodeme.io (shared, SSH tunnel via kctl-pg)
- Mailcow: mail.kodeme.io
- Plane: plane.kodeme.io (project management)
- GlitchTip: glitchtip.kodeme.io (error tracking)
- Gatus: gatus.kodeme.io (uptime monitoring)
- Outline: outline.kodeme.io (wiki)
- Zulip: zulip.kodeme.io (team chat)
- RMM: rmm.kodeme.io (remote monitoring)

## Infrastructure CLI (kctl-*)
All available via `kctl-<service>` commands:
- `kctl-ak` (Authentik), `kctl-pg` (PostgreSQL), `kctl-mailcow`, `kctl-plane`
- `kctl-zulip`, `kctl-rmm`, `kctl-mdm`, `kctl-outline`, `kctl-glitchtip`
- `kctl-odoo` (Odoo 18), `kctl-1password`
- `kctl-dokploy` (Dokploy), `kctl-cloudflare` (Cloudflare), `kctl-hetzner` (Hetzner Cloud)
- Config: ~/.config/kodemeio/config.yaml (profiles: kodemeio, abcfood)

## Common Tasks
- Deploy: `git push` triggers Dokploy auto-deploy
- Docker inspect: `docker ps` (socket mounted read-only)
- Switch workspace: `tmux` sessions (kodemeio, kontenos, journaltx, kidneuro, infra, core)
