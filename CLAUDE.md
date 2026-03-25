# CLAUDE.md — kodemeio-claude

## Project Overview

**Purpose:** Dual-purpose repo — (1) Knowledge base collecting all CLAUDE.md files across the Kodemeio empire, and (2) Docker-based Claude Code remote development platform for all 4 companies.

**Stack:** Docker, Node.js 22, Bash, TypeScript (SDK server)
**Location:** `/home/tgunawan/project/00-new-projects/kodemeio-core/kodemeio-claude/`

## Quick Reference

```bash
# ─── Remote Development ──────────────────────────────────────
make up              # Start full dev container (production)
make down            # Stop container
make shell           # Shell into container
make kodemeio        # Attach to kodemeio tmux session
make kontenos        # Attach to kontenos tmux session
make health          # Run health checks
make task            # Run headless Claude Code task (interactive)

# ─── SDK API ─────────────────────────────────────────────────
make sdk-up          # Start SDK-only container
make sdk-down        # Stop SDK container
curl http://localhost:3100/health                     # Health check
curl -X POST http://localhost:3100/task \
  -H "Authorization: Bearer $SDK_API_KEY" \
  -d '{"prompt":"...", "workspace":"kodemeio-app"}'   # Run task

# ─── Knowledge Base ──────────────────────────────────────────
make collect         # Collect all CLAUDE.md files
./scripts/collect.sh --dry-run    # Preview
./scripts/collect.sh --stats      # Statistics only
grep -r 'keyword' docs/           # Search
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
│   ├── .claude/                # Claude Code settings + global context
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
│   ├── server.ts               # REST API to trigger Claude Code tasks
│   ├── package.json            # SDK server dependencies
│   └── tsconfig.json
├── mcp-servers/
│   ├── kodemeio-claude-bridge.mjs  # MCP bridge for OpenClaw
│   └── package.json
├── scripts/
│   ├── collect.sh              # Collect CLAUDE.md files (knowledge base)
│   ├── setup.sh                # First-time: clone repos on Hetzner
│   ├── setup-local.sh          # Reproduce local dev environment
│   ├── health.sh               # Container health check
│   ├── run-task.sh             # Trigger headless task via CLI
│   ├── install-kctl.sh         # Install 11 kctl-* CLI tools
│   ├── sync-config.sh          # Sync local config → repo for Docker
│   ├── sync-secrets.sh         # Deploy credentials to Hetzner
│   ├── backup-runtime.sh       # Backup container runtime volume
│   ├── remote-access.sh        # SSH into container from laptop
│   └── verify-scores.sh        # Verify config completeness (14 checks)
├── knowledge-base/             # Claude Code knowledge docs (01-20)
├── docs/                       # [Generated] Collected CLAUDE.md copies
├── docker-compose.prod.yml     # Production — full dev container
├── docker-compose.sdk.yml      # Production — SDK API only
├── docker-compose.yml          # Development (local)
├── .env.example                # Environment template
├── Makefile                    # Convenience commands
├── CLAUDE.md                   # This file
├── INDEX.md                    # [Generated] Categorized index
├── GAPS.md                     # [Generated] Gap analysis
└── ALL-CLAUDE.md               # [Generated] Concatenated docs
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

### Mode 3: Programmatic/API (OpenClaw or CI/CD)
```bash
# Headless CLI
docker exec kodemeio-claude claude -p "Fix auth bug" --output-format json

# SDK REST API
curl -X POST http://kodemeio-claude:3100/task \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"prompt": "Run tests", "workspace": "kodemeio-app"}'
```

## Knowledge Base

### Generated Files
All files in `docs/`, `INDEX.md`, `GAPS.md`, and `ALL-CLAUDE.md` are generated by `scripts/collect.sh`. Tracked in git for browsability.

### Categories
- **ERP Systems:** `*odoo*`, `*frappe*`
- **Odoo Modules:** Projects under `src/private/`
- **Data Integration:** `*sync*`, `*airflow*`, `*dbt*`, `*clickhouse*`
- **Infrastructure:** `*hetzner*`, `*cloudflare*`, `*dokploy*`, `*monitoring*`, `*postgres*`, `*redis*`
- **Security & Identity:** `*authentik*`, `*1password*`
- **Collaboration:** `*plane*`, `*mattermost*`, `*jitsi*`

## Script Conventions

- Same color codes (RED/GREEN/YELLOW/BLUE/CYAN), logging functions as other kodemeio scripts
- Same exclusion patterns (node_modules, .venv, .git, etc.)
- Same header format with `================================================================` banners

## Security

- Non-root user `dev` with sudo
- Docker socket read-only
- SSH keys read-only
- SDK API requires bearer token
- Optional firewall (init-firewall.sh) restricts outbound to whitelisted domains
- `--dangerously-skip-permissions` is enabled by default (via `config/.claude/settings.json` `bypassPermissions` mode + CLI flag in headless scripts) — this container IS the isolated sandbox
