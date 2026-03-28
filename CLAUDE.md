# CLAUDE.md — kodemeio-claude

## Project Overview

**Purpose:** Docker-based Claude Code remote development platform for the Kodemeio empire (4 companies, 34 repos). Deploys to Hetzner via Dokploy with full toolchain, 14 kctl-* infrastructure CLIs, 24 skills, SDK REST API, and KodeClaw daemon (heartbeat, cron, Telegram, dashboard).

**Stack:** Docker, Node.js 22, Bash, TypeScript (SDK server)
**Location:** `/home/tgunawan/project/00-new-projects/kodemeio-core/kodemeio-claude/`

## Quick Reference

```bash
# ─── Production (Hetzner/Dokploy) ───────────────────────────
make up              # Start full dev container
make down            # Stop container
make shell           # Shell into container
make kodemeio        # Attach to kodemeio tmux session
make health          # Run health checks
make task            # Run headless Claude Code task

# ─── KodeClaw Daemon ─────────────────────────────────────────
make daemon-status   # Daemon subsystem status
make daemon-jobs     # List recent job runs
make daemon-queue    # Task queue depth
make daemon-history  # Run history
make daemon-dashboard # Dashboard URL

# ─── SDK API ─────────────────────────────────────────────────
make sdk-up          # Start SDK-only container
curl http://localhost:3100/health
curl -X POST http://localhost:3100/task \
  -H "Authorization: Bearer $SDK_API_KEY" \
  -d '{"prompt":"...", "workspace":"kodemeio-app"}'

# ─── Local Setup ─────────────────────────────────────────────
make setup-local     # Install Claude Code + sync config locally
make sync-config     # Sync local config → repo for Docker image
make sync-secrets    # Deploy credentials to Hetzner

# ─── Environment ─────────────────────────────────────────────
make generate-env    # Interactive .env generator
make check-env       # Validate .env
make deploy-env      # Deploy .env to Hetzner
```

## Project Structure

```
kodemeio-claude/
├── docker/
│   ├── Dockerfile              # Full dev container (Node 22 + toolchain)
│   ├── Dockerfile.sdk          # Lightweight SDK-only for API mode
│   ├── entrypoint.sh           # Pre-flight + tmux session setup
│   ├── entrypoint-sdk.sh       # SDK API server entrypoint
│   └── init-firewall.sh        # Network security rules (optional)
├── config/
│   ├── .claude/                # Claude Code config (baked into image)
│   │   ├── settings.json       # Permissions, plugins, hooks
│   │   ├── keybindings.json    # Custom keyboard shortcuts
│   │   ├── CLAUDE.md           # Global empire context
│   │   ├── agents/             # 4 subagents (code-reviewer, docs, architect, test)
│   │   ├── skills/             # 19 custom skills (kctl admin, dev frameworks)
│   │   ├── commands/           # Custom slash commands
│   │   └── rules/              # 5 path-specific rule files
│   ├── kodemeio/               # kctl-* credential config template
│   ├── tmux.conf               # Multi-pane layout per company
│   └── zshrc                   # Shell customization + aliases
├── sdk/
│   ├── server.ts               # REST API + daemon bootstrap
│   ├── package.json
│   ├── tsconfig.json
│   ├── daemon/                 # KodeClaw daemon subsystems
│   │   ├── index.ts            # Orchestrator
│   │   ├── config.ts           # Hot-reload YAML config (30s)
│   │   ├── types.ts            # Shared interfaces
│   │   ├── logger.ts           # Structured JSON logger
│   │   ├── security.ts         # Security tier enforcement
│   │   ├── session/            # Session manager + executor + queue
│   │   ├── heartbeat/          # Per-workspace heartbeat timers
│   │   ├── cron/               # Markdown job scheduler
│   │   ├── telegram/           # Bot + workspace routing + voice
│   │   └── dashboard/          # Web dashboard (SPA + API)
│   └── config/                 # Daemon runtime config
│       ├── daemon.yaml         # Main configuration
│       ├── IDENTITY.md         # Persona identity
│       ├── SOUL.md             # Persona communication style
│       ├── heartbeat/*.md      # Per-workspace heartbeat prompts
│       └── jobs/*.md           # Cron job definitions
├── scripts/
│   ├── generate-env.sh         # Interactive .env generator
│   ├── setup.sh                # First-time: clone repos on Hetzner
│   ├── setup-local.sh          # Reproduce local dev environment
│   ├── health.sh               # Container health check
│   ├── run-task.sh             # Trigger headless task via CLI
│   ├── install-kctl.sh         # Install 14 kctl-* CLI tools
│   ├── sync-config.sh          # Sync local config → repo for Docker
│   ├── sync-secrets.sh         # Deploy credentials to Hetzner
│   ├── backup-runtime.sh       # Backup container runtime volume
│   ├── remote-access.sh        # SSH into container from laptop
│   ├── verify-scores.sh        # Verify config completeness (14 checks)
│   └── collect.sh              # Collect CLAUDE.md files (legacy)
├── docker-compose.prod.yml     # Production — full dev container
├── docker-compose.sdk.yml      # Production — SDK API only
├── docker-compose.yml          # Development (local)
├── .env.example                # Environment template (committed)
├── .env                   # Production secrets (generated, gitignored)
├── Makefile                    # Convenience commands
└── CLAUDE.md                   # This file
```

## 3 Operating Modes

### Mode 1: Interactive Development (Boss via SSH/tmux)
```bash
ssh dokploy.kodeme.io
docker exec -it kodemeio-claude tmux attach -t kodemeio
claude   # Start Claude Code
```

### Mode 2: Remote Control (Boss via Phone)
```bash
# Inside container:
claude --remote
# Then open claude.ai/code or Claude mobile app
```

### Mode 3: Programmatic/API (CI/CD)
```bash
# Headless CLI
docker exec kodemeio-claude claude -p "Fix auth bug" --output-format json

# SDK REST API
curl -X POST http://kodemeio-claude:3100/task \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"prompt": "Run tests", "workspace": "kodemeio-app"}'
```

### Mode 4: KodeClaw Daemon (Always-On Automation)
```bash
# Enable in .env: ENABLE_DAEMON=true
# Subsystems: heartbeat, cron, Telegram, dashboard

# Dashboard: http://localhost:3100/dashboard
# Telegram: message the bot directly, use @workspace prefix to route
# Cron: add .md files to sdk/config/jobs/
# Heartbeat: auto-checks workspaces every N minutes
```

## Deployment

### First-time setup on Hetzner
```bash
# 1. Generate production env
make generate-env          # Creates .env interactively

# 2. Deploy secrets
make sync-secrets          # Deploys kctl credentials to Hetzner
make deploy-env            # Deploys .env to Hetzner

# 3. Clone repos on server
ssh root@dokploy.kodeme.io
docker exec kodemeio-claude /opt/scripts/setup.sh

# 4. Start
make up
```

### Updating config
```bash
# After changing skills/agents/rules locally:
make sync-config           # Sync to repo
git add -A && git commit   # Commit
git push                   # Dokploy auto-deploys
```

## Script Conventions

- Color codes: RED/GREEN/YELLOW/BLUE/CYAN + logging functions (log_info/log_success/log_warn/log_error)
- `set -euo pipefail` in all scripts
- Same header format with `================================================================` banners

## Security

- Non-root user `dev` (UID 1000) with sudo
- Docker socket read-write (can docker compose up/down/build on host)
- SSH keys read-only
- SDK API requires bearer token (warns if empty)
- Concurrency limit (MAX_CONCURRENT=3, returns 429)
- Path traversal protection on workspace parameter
- Tool name validation against allowlist
- Optional firewall (init-firewall.sh) restricts outbound to whitelisted domains
- `bypassPermissions` mode — this container IS the isolated sandbox
- Credentials never baked into image — injected via env vars and mounted volumes
