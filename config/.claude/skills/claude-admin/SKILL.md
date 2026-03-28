---
name: claude-admin
description: >
  Claude Code environment administration for kodemeio infrastructure.
  Covers status dashboard, config sync (local ↔ repo), health checks,
  SDK API management, environment setup, backup/restore, update checks,
  and verification. Use when working with kctl-claude CLI or managing
  Claude Code setup on local machines or Hetzner containers.
version: 1.0.0
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Claude Code Administration

## System Overview

| Component | Description |
|-----------|-------------|
| **CLI Tool** | `kctl-claude` — Python CLI (Typer + Rich) |
| **Repo** | `kodemeio-claude` — Docker-based Claude Code platform |
| **Container** | `kodemeio-claude` on Hetzner via Dokploy |
| **SDK API** | REST API at `:3100` (task execution + health) |
| **MCP Bridge** | 2 tools for OpenClaw integration |
| **Config** | `~/.claude/` (agents, skills, commands, rules, settings) |

## CLI Tool — kctl-claude

### Installation

```bash
# From kodemeio-claude repo:
uv tool install --editable ./cli

# Or inside Docker container:
uv tool install --editable /opt/dev/kodemeio-claude/cli
```

### Global Options

| Flag | Description |
|------|-------------|
| `--json` | Machine-readable JSON output |
| `-q, --quiet` | Suppress info messages |
| `-V, --version` | Show version |

### Command Reference

#### status — Dashboard & Health

```bash
# Full one-page dashboard (local + repo + server + tools + updates)
kctl-claude status

# Quick health check (exit code 0=ok, 1=issues)
kctl-claude status health

# Check for Claude Code updates + show changelog link
kctl-claude status updates

# JSON output for scripting
kctl-claude --json status
kctl-claude --json status health
```

#### sync — Config Synchronization

```bash
# Push local config → repo (before git push / deploy)
kctl-claude sync push

# Pull repo config → local (after git pull / teammate changes)
kctl-claude sync pull

# Preview what push would change (dry-run)
kctl-claude sync diff

# Deploy kctl credentials to Hetzner
kctl-claude sync secrets
```

**Sync directions:**
- `push`: `~/.claude/{agents,skills,commands,rules}` → `config/.claude/` in repo
- `pull`: `config/.claude/` in repo → `~/.claude/`
- `secrets`: `~/.config/kodemeio/config.yaml` → Hetzner server

**NOT synced (intentionally):**
- `settings.json` — local and container versions differ (different hooks/plugins)
- `.credentials.json` — secrets, never committed

#### verify — Config Audit

```bash
# Run 14-point config verification
kctl-claude verify

# Checks: rules (≥3), agents (≥2), skills (≥10), settings.json,
#   hooks (PreToolUse/PostToolUse), plugins, credentials
```

#### api — SDK REST API

```bash
# Check SDK API health
kctl-claude api health

# Send a task to Claude Code via API
kctl-claude api task "Fix the login bug" --workspace kodemeio-app
kctl-claude api task "Run tests" --workspace kodemeio-app --bare

# Uses env vars: SDK_BASE_URL (default: http://localhost:3100), SDK_API_KEY
```

#### env — Environment Management

```bash
# Interactive .env generator
kctl-claude env generate

# Validate existing .env
kctl-claude env check

# Deploy .env to Hetzner
kctl-claude env deploy
```

#### backup — Runtime Backup/Restore

```bash
# Backup container runtime volume
kctl-claude backup create

# Restore from backup
kctl-claude backup restore /path/to/backup/
```

## Architecture

### Config Sync Flow

```
Local (~/.claude/)        kodemeio-claude repo        Hetzner Container
──────────────────       ──────────────────          ────────────────────
Edit skills/agents  ──→  kctl-claude sync push  ──→  Docker image bakes
                         then: git commit && push    config at build time
                    ←──
                    kctl-claude sync pull
                    (repo → local)
```

### Repo Directory Layout

```
kodemeio-claude/
├── cli/                    # kctl-claude Python CLI
│   ├── pyproject.toml
│   └── src/kctl_claude/
│       ├── cli.py          # Entry point + command groups
│       ├── core/           # Context, output, paths, checks
│       └── commands/       # status, sync, verify, api, env, backup
├── config/.claude/         # Baked into Docker image
│   ├── agents/             # 4 subagents
│   ├── skills/             # 29+ skills (including this one)
│   ├── commands/           # Custom slash commands
│   ├── rules/              # 5 development rules
│   └── settings.json       # Container-specific settings
├── sdk/
│   └── server.ts           # REST API (:3100)
├── mcp-servers/
│   └── kodemeio-claude-bridge.mjs  # 2 MCP tools
├── docker/                 # Dockerfile, entrypoints
└── scripts/                # Shell scripts (wrapped by kctl-claude)
```

### SDK API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check (status, inFlight, maxConcurrent) |
| `POST` | `/task` | Execute Claude Code task (auth required) |

**POST /task body:**
```json
{
  "prompt": "Fix the bug in auth.py",
  "workspace": "kodemeio-app",
  "tools": ["Bash", "Read", "Edit"],
  "bare": false
}
```

## Common Workflows

### First-time local setup
```bash
cd kodemeio-claude
uv tool install --editable ./cli
kctl-claude sync pull          # Get latest config
kctl-claude verify             # Check everything is configured
kctl-claude status             # Full dashboard
```

### After editing skills/agents locally
```bash
kctl-claude sync diff          # Preview changes
kctl-claude sync push          # Push to repo
git add -A && git commit -m "chore: sync skills"
git push                       # Dokploy auto-deploys
```

### Check for Claude Code updates
```bash
kctl-claude status updates
# If update available:
npm update -g @anthropic-ai/claude-code
```

### Deploy to Hetzner
```bash
kctl-claude env check          # Validate .env
kctl-claude env deploy         # scp .env to server
kctl-claude sync secrets       # Deploy kctl credentials
# Then: make build && make up
```

### Monitor running container
```bash
kctl-claude api health         # SDK API status
kctl-claude status             # Full dashboard
kctl-claude --json status      # For scripting / monitoring
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `kctl-claude: command not found` | `cd kodemeio-claude && uv tool install --editable ./cli` |
| `Repo not found` | Run from inside kodemeio-claude, or check well-known paths |
| `SDK API unreachable` | Container not running, or `ENABLE_SDK_API=false` |
| `Config out of sync` | `kctl-claude sync push` (local → repo) or `sync pull` (repo → local) |
| `settings.json missing` | `kctl-claude sync pull` (creates from repo template) |
| `Credentials missing` | Run `claude login` interactively |
| `Update available` | `npm update -g @anthropic-ai/claude-code` |

## Environment Variables

| Variable | Used By | Default |
|----------|---------|---------|
| `SDK_BASE_URL` | `kctl-claude api` | `http://localhost:3100` |
| `SDK_API_KEY` | `kctl-claude api task` | (empty) |
| `HETZNER_SSH` | `kctl-claude env deploy` | `root@dokploy.kodeme.io` |
