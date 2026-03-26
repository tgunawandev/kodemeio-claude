---
name: openclaw-admin
description: >
  OpenClaw AI Agent Gateway administration for kodemeio infrastructure.
  Covers agent management, cron scheduling, channel configuration, MCP servers,
  skill management, model routing, gateway operations, memory search, browser
  automation, security audits, plugin management, and troubleshooting.
  Use when working with openclaw CLI or managing openclaw.kodeme.io.
version: 1.0.0
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# OpenClaw Administration for Kodemeio

## System Overview

- **OpenClaw 2026.3.24** at `https://openclaw.kodeme.io`
- **Gateway**: WebSocket on port 18789, Traefik reverse proxy (HTTPS + WS)
- **5 Agents**: 4 autonomous company operators + 1 team assistant
- **28 MCP Servers**: 17 custom + 11 external
- **27 Cron Jobs**: Opus for strategy, Sonnet for content, Flash for routine
- **Deployed**: Dokploy with Docker on `dokploy.kodeme.io`

## CLI Tool: openclaw

The CLI is installed globally via npm and available as `npx openclaw`:

```bash
# Local execution (on dev machine)
npx openclaw <command>

# Remote execution (inside Docker container)
npx openclaw --container kodemeio-openclaw <command>

# Docker compose execution (from project root)
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  run --rm openclaw-cli <command>
```

### Global Options

```bash
openclaw [--container <name>] [--profile <name>] [--dev] [--log-level <level>] [--no-color] <command>
```

| Flag | Description |
|------|-------------|
| `--container <name>` | Run inside a Docker/Podman container |
| `--profile <name>` | Use a named profile (isolates state) |
| `--dev` | Dev profile: isolate state under ~/.openclaw-dev |
| `--log-level <level>` | Log level: silent\|fatal\|error\|warn\|info\|debug\|trace |
| `--no-color` | Disable ANSI colors |
| `-V, --version` | Show version |

## Agents (5 Bots)

| Agent | Bot | Company | Model |
|-------|-----|---------|-------|
| KodemeioDevBot | @KodemeioDevBot | kodeme.io | Opus 4.6 |
| KontenosDevBot | @KontenosDevBot | kontenos.com | Sonnet 4 |
| JournaltxDevBot | @JournaltxDevBot | journaltx.com | Sonnet 4 |
| KidneuroDevBot | @KidneuroDevBot | kidneuro.io | Sonnet 4 |
| KodemeioTeam | @KodemeioTeamBot | team assistant | Sonnet 4 |

### Agent Management

```bash
openclaw agents list                           # List configured agents
openclaw agents add                            # Add a new isolated agent
openclaw agents delete <id>                    # Delete agent and prune workspace
openclaw agents set-identity <id>              # Update name/theme/emoji/avatar
openclaw agents bind <id>                      # Add routing bindings
openclaw agents unbind <id>                    # Remove routing bindings
openclaw agents bindings                       # List all routing bindings
```

## Channel Management

Channels connect OpenClaw to Telegram, Discord, WhatsApp, etc.

```bash
openclaw channels list                         # List configured channels + auth
openclaw channels status                       # Gateway channel status
openclaw channels status --probe               # Deep status check with probes
openclaw channels add --channel telegram --token <token>  # Add channel
openclaw channels remove <channel>             # Disable or delete channel
openclaw channels login --channel whatsapp     # Link WhatsApp Web
openclaw channels logout --channel <ch>        # Log out of channel session
openclaw channels logs                         # Recent channel logs
openclaw channels resolve <channel> <name>     # Resolve name to ID
openclaw channels capabilities <channel>       # Show provider capabilities
```

## Cron Job Management

27 scheduled jobs across 3 model tiers.

```bash
openclaw cron list                             # List all cron jobs
openclaw cron status                           # Scheduler status
openclaw cron runs                             # Run history (JSONL-backed)
openclaw cron add                              # Add a cron job
openclaw cron edit <id>                        # Edit job (patch fields)
openclaw cron enable <id>                      # Enable a job
openclaw cron disable <id>                     # Disable a job
openclaw cron run <id>                         # Run job now (debug)
openclaw cron rm <id>                          # Remove a job
```

### Cron Model Routing

| Tier | Model | Use Case |
|------|-------|----------|
| Strategy | Opus 4.6 | Company strategy, financial planning |
| Content | Sonnet 4 | Social media, blog posts, marketing |
| Routine | Gemini Flash | Health checks, data collection, cleanup |

## Configuration

```bash
openclaw configure                             # Interactive setup wizard
openclaw config file                           # Print active config file path
openclaw config get <dot.path>                 # Get config value
openclaw config set <dot.path> <value>         # Set config value
openclaw config unset <dot.path>               # Remove config value
openclaw config validate                       # Validate against schema
```

### Config Set Examples

```bash
# Simple value
openclaw config set gateway.port 19001 --strict-json

# Secret reference (env var)
openclaw config set channels.discord.token \
  --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN

# Secrets provider
openclaw config set secrets.providers.vault \
  --provider-source file --provider-path /etc/openclaw/secrets.json --provider-mode json

# Batch from file
openclaw config set --batch-file ./config-set.batch.json --dry-run
```

### Key Config Files (baked into Docker image)

| File | Purpose |
|------|---------|
| `config/openclaw.json` | Main config (models, agents, tools, profiles, gateway, cron) |
| `config/config.json` | MCP server registry (28 servers) |
| `config/cron/jobs.json` | 27 cron job definitions |
| `config/skills/` | 9 main skills (dev + business + utility) |
| `config/agents/` | 3 agent workspaces + 6 per-agent skills |
| `config/workspace/` | KodemeioDevBot workspace (SOUL.md, AGENTS.md, TOOLS.md, PLAYBOOK.md, HEARTBEAT.md, IDENTITY.md, USER.md) |

## Gateway Management

```bash
openclaw gateway run                           # Run gateway (foreground)
openclaw gateway status                        # Service status + probe
openclaw gateway health                        # Fetch gateway health
openclaw gateway start                         # Start service (systemd/launchd)
openclaw gateway stop                          # Stop service
openclaw gateway restart                       # Restart service
openclaw gateway install                       # Install service
openclaw gateway uninstall                     # Uninstall service
openclaw gateway discover                      # Discover gateways (Bonjour)
openclaw gateway probe                         # Reachability + health summary
openclaw gateway call <method>                 # Call a gateway RPC method
openclaw gateway usage-cost                    # Usage cost from session logs
```

### Gateway Run Options

```bash
openclaw gateway run \
  --port 18789 \
  --bind loopback \              # loopback|lan|tailnet|auto|custom
  --auth token \                 # none|token|password|trusted-proxy
  --token <token> \
  --compact \                    # Compact WS logs
  --verbose                      # Verbose logging
```

## Model Management

```bash
openclaw models list                           # List configured models
openclaw models status                         # Current model state
openclaw models set <model>                    # Set default model
openclaw models set-image <model>              # Set image model
openclaw models scan                           # Scan OpenRouter free models
openclaw models auth                           # Manage model auth profiles
openclaw models aliases                        # Manage model aliases
openclaw models fallbacks                      # Manage fallback list
openclaw models image-fallbacks                # Manage image fallback list
```

### Model Routing (Kodemeio Setup)

```
Brain:   Opus 4.6 (strategy, complex reasoning)
Worker:  Sonnet 4 (content, coding, sub-agents)
Routine: Gemini Flash (health checks, data collection)
Image:   Gemini 2.5 Flash (built-in generation)
```

## Skill Management

```bash
openclaw skills list                           # List all skills (ready + needs setup)
openclaw skills check                          # Check ready vs missing requirements
openclaw skills info <name>                    # Detailed skill info
openclaw skills search <query>                 # Search ClawHub skills
openclaw skills install <name>                 # Install from ClawHub
openclaw skills update                         # Update ClawHub-installed skills
```

### Custom Skills (15 total)

9 in `config/skills/`:

| Category | Skills |
|----------|--------|
| Development | kodemeio-dev (routes to Claude Code) |
| Business | kodemeio-strategy, kodemeio-content, kodemeio-finance, revenue-engine, product-factory |
| Utility | self-improving, tilawah, remotion-server |

6 per-agent skills in `config/agents/`:

| Agent | Skills |
|-------|--------|
| KontenosDevBot | kontenos-dev, kontenos-strategy |
| JournaltxDevBot | journaltx-dev, journaltx-strategy |
| KidneuroDevBot | kidneuro-dev, kidneuro-strategy |

## Memory Management

Vector memory with BM25+vector hybrid search and temporal decay.

```bash
openclaw memory status                         # Index and provider status
openclaw memory status --deep                  # Probe embedding provider
openclaw memory index --force                  # Force full reindex
openclaw memory search "meeting notes"         # Quick search
openclaw memory search --query "deploy" --max-results 20  # Limited search
openclaw memory status --json                  # Machine-readable JSON
```

## Session Management

```bash
openclaw sessions                              # List all sessions
openclaw sessions --agent <id>                 # Sessions for one agent
openclaw sessions --all-agents                 # Aggregate across agents
openclaw sessions --active 120                 # Only last 2 hours
openclaw sessions --json                       # Machine-readable output
openclaw sessions cleanup                      # Run session maintenance
```

## Security

```bash
openclaw security audit                        # Local security audit
openclaw security audit --deep                 # Include live gateway probes
openclaw security audit --deep --token <tok>   # With explicit token
openclaw security audit --fix                  # Apply safe remediations
openclaw security audit --json                 # Machine-readable output
```

## Secrets Management

```bash
openclaw secrets audit                         # Audit plaintext secrets and refs
openclaw secrets configure                     # Interactive secrets helper
openclaw secrets reload                        # Re-resolve and swap runtime snapshot
openclaw secrets apply                         # Apply a generated secrets plan
```

## Plugin Management

```bash
openclaw plugins list                          # List discovered plugins
openclaw plugins install <spec>                # Install (path, npm, clawhub:pkg)
openclaw plugins uninstall <name>              # Uninstall a plugin
openclaw plugins enable <name>                 # Enable in config
openclaw plugins disable <name>                # Disable in config
openclaw plugins inspect <name>                # Plugin details
openclaw plugins doctor                        # Report load issues
openclaw plugins update                        # Update installed plugins
openclaw plugins marketplace                   # Browse marketplace
```

## Hook Management

```bash
openclaw hooks list                            # List all hooks
openclaw hooks info <name>                     # Detailed hook info
openclaw hooks enable <name>                   # Enable a hook
openclaw hooks disable <name>                  # Disable a hook
openclaw hooks check                           # Check eligibility status
```

## Message / Broadcast

```bash
openclaw message send --target <id> --message "Hi"
openclaw message send --target <id> --message "Hi" --media photo.jpg
openclaw message read --channel telegram --target <chat_id>
openclaw message broadcast --targets <id1,id2> --message "Update"
openclaw message edit --channel <ch> --target <id> --message-id <mid> --message "edited"
openclaw message delete --channel <ch> --target <id> --message-id <mid>
openclaw message pin --channel <ch> --target <id> --message-id <mid>
openclaw message react --channel <ch> --target <id> --message-id <mid> --emoji "check"
openclaw message poll --channel discord --target <ch> --poll-question "?" --poll-option A --poll-option B
```

## Browser Automation

Built-in Chromium with Playwright-like controls.

```bash
openclaw browser status                        # Browser status
openclaw browser start                         # Start browser
openclaw browser stop                          # Stop browser
openclaw browser tabs                          # List open tabs
openclaw browser open <url>                    # Open URL in new tab
openclaw browser navigate <url>                # Navigate current tab
openclaw browser screenshot                    # Capture screenshot
openclaw browser screenshot --full-page        # Full page screenshot
openclaw browser screenshot --ref 12           # Element screenshot
openclaw browser snapshot                      # AI snapshot (default)
openclaw browser snapshot --format aria        # Accessibility tree
openclaw browser click <ref>                   # Click element
openclaw browser type <ref> "text"             # Type into element
openclaw browser press Enter                   # Press key
openclaw browser fill --fields '[{"ref":"1","value":"Ada"}]'  # Fill form
openclaw browser evaluate --fn '(el) => el.textContent' --ref 7
openclaw browser pdf                           # Save page as PDF
openclaw browser console --level error         # Console messages
openclaw browser profiles                      # List browser profiles
openclaw browser create-profile <name>         # Create profile
```

## Backup & Restore

```bash
openclaw backup create                         # Create backup archive
openclaw backup verify <archive>               # Validate backup + manifest
```

Project-level scripts:
```bash
./scripts/backup.sh                            # Full backup
./scripts/restore.sh backups/                  # Restore from backup
```

## Device & Node Management

```bash
# Devices (mobile app pairing)
openclaw devices list                          # List pending and paired
openclaw devices approve <id>                  # Approve pairing request
openclaw devices reject <id>                   # Reject pairing request
openclaw devices remove <id>                   # Remove paired device
openclaw devices revoke <id>                   # Revoke device token
openclaw devices rotate <id>                   # Rotate device token

# Nodes (remote machines)
openclaw nodes status                          # Nodes with connection status
openclaw nodes list                            # List pending and paired
openclaw nodes pending                         # List pending pairing requests
openclaw nodes approve <id>                    # Approve pairing
openclaw nodes reject <id>                     # Reject pairing
openclaw nodes describe <id>                   # Node capabilities + commands
openclaw nodes rename <id> <name>              # Rename display name
openclaw nodes invoke <id> <command>           # Invoke command on node
openclaw nodes run --node <id> --raw "cmd"     # Run shell on node (mac)
openclaw nodes notify --node <id>              # Send local notification (mac)
openclaw nodes camera snap --node <id>         # Capture photo
openclaw nodes canvas --node <id>              # Canvas content capture/render
openclaw nodes screen --node <id>              # Screen recording
openclaw nodes location --node <id>            # Fetch location
openclaw nodes push --node <id>                # APNs test push (iOS)
```

## System & Health

```bash
openclaw health                                # Quick health check
openclaw doctor                                # Health checks + quick fixes
openclaw doctor --fix                          # Auto-fix common issues
openclaw status                                # Channel health + recent sessions
openclaw logs                                  # Tail gateway logs via RPC
openclaw dashboard                             # Open the Control UI
openclaw tui                                   # Terminal UI connected to gateway
openclaw docs                                  # Search live OpenClaw docs

openclaw system heartbeat                      # Heartbeat controls
openclaw system event                          # Enqueue system event
openclaw system presence                       # List presence entries
```

## First-Run Setup

```bash
openclaw setup                                 # Initialize local config + workspace
openclaw onboard                               # Interactive onboarding wizard
openclaw configure                             # Guided config for credentials + channels
```

## Updates

```bash
openclaw update                                # Update OpenClaw
openclaw update status                         # Version and channel status
openclaw update wizard                         # Interactive update wizard
openclaw update --channel beta                 # Switch to beta channel
openclaw update --channel dev                  # Switch to dev channel
openclaw update --dry-run                      # Preview without changes
openclaw update --yes                          # Non-interactive
openclaw update --no-restart                   # Skip gateway restart
```

## Approvals & Pairing

```bash
# Exec approvals
openclaw approvals get                         # Fetch approvals snapshot
openclaw approvals set <file.json>             # Replace with JSON file
openclaw approvals allowlist                   # Edit per-agent allowlist

# DM pairing
openclaw pairing list                          # Pending pairing requests
openclaw pairing approve <code>                # Approve and allow sender
```

## Directory Lookup

```bash
openclaw directory self --channel telegram     # Current account identity
openclaw directory peers list --channel telegram --query "name"  # Search contacts
openclaw directory groups list --channel telegram   # List groups
openclaw directory groups members --channel telegram --group-id <id>
```

## ACP (Agent Control Protocol)

Bridge for IDE <-> OpenClaw communication.

```bash
openclaw acp                                   # Run ACP bridge
openclaw acp --session <key>                   # With session key
openclaw acp --url <ws-url> --token <token>    # Custom gateway
openclaw acp --reset-session                   # Reset session before use
```

## Sandbox Management

Docker-based agent isolation.

```bash
openclaw sandbox list                          # List sandbox containers
openclaw sandbox list --browser                # Browser containers only
openclaw sandbox recreate --all                # Recreate all containers
openclaw sandbox recreate --session main       # Recreate specific session
openclaw sandbox recreate --agent mybot        # Recreate agent containers
openclaw sandbox explain                       # Explain effective policy
```

## Webhooks & DNS

```bash
openclaw webhooks gmail                        # Gmail Pub/Sub hooks
openclaw dns setup                             # CoreDNS for wide-area discovery
```

## MCP Servers (28 total)

### Custom (17 -- in mcp-servers/*.mjs)

| Server | Tools | Purpose |
|--------|-------|---------|
| kodemeio-mcp-odoo | 35 | Odoo 18 ERP |
| kodemeio-mcp-prometheus | 8 | Prometheus metrics |
| kodemeio-mcp-gatus | 5 | Gatus health monitoring |
| kodemeio-mcp-glitchtip | 5 | GlitchTip error tracking |
| kodemeio-mcp-authentik | 5 | Authentik SSO |
| kodemeio-mcp-mailcow | 4 | Mailcow email |
| kodemeio-mcp-zulip | 7 | Zulip messaging |
| kodemeio-mcp-chatwoot | 7 | Chatwoot support |
| kodemeio-mcp-claude-code | 4 | Claude Code bridge |
| kodemeio-mcp-ai-router | 6 | AI cost analytics |
| kontenos-mcp-content | 9 | Meta + content |
| journaltx-mcp-trading | 21 | Trading bots |
| journaltx-mcp-onchain | 16 | Blockchain |
| kidneuro-mcp-platform | 11 | Healthcare |
| kodemeio-mcp-waha | 8 | WhatsApp |
| kodemeio-mcp-plane | 10 | Plane projects |
| kodemeio-mcp-outline | 9 | Outline wiki |

### External (11 -- npm packages)

github, brave-search, memory, filesystem, sequential-thinking, context7, stripe, twitter, linkedin, google-sheets, google-drive

### Tool Profiles (6)

| Profile | Agent | Servers |
|---------|-------|---------|
| default (14) | KodemeioDevBot | odoo, prometheus, gatus, glitchtip, authentik, mailcow, zulip, chatwoot, ai-router, stripe, memory, brave-search, context7, claude-code |
| content (6) | KontenosDevBot | kontenos-content, brave-search, memory, filesystem, twitter, linkedin |
| trading (5) | JournaltxDevBot | trading, onchain, brave-search, memory, claude-code |
| kidneuro (8) | KidneuroDevBot | kidneuro-platform, prometheus, gatus, github, filesystem, memory, context7, claude-code |
| team (12) | KodemeioTeam | odoo, plane, outline, prometheus, gatus, glitchtip, chatwoot, waha, ai-router, memory, brave-search, context7 (NO claude-code, 30 denied write tools) |
| all | Override | everything |

## Docker Deployment

```bash
# Start
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Logs
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f

# CLI inside container
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  run --rm openclaw-cli <command>

# Security audit
bash scripts/security-audit.sh
```

### Volumes

| Volume | Mount | Purpose |
|--------|-------|---------|
| `openclaw-data` | `/home/node/.openclaw/` | Config + auth + sessions |
| `openclaw-workspace` | `/home/node/.openclaw/workspace/` | Agent memory + workspace |

### Docker Image

- Base: `node:22.22-bookworm-slim`
- System packages: ffmpeg, imagemagick, pandoc, poppler-utils, jq, git, python3
- Optional: Chromium (`OPENCLAW_INSTALL_BROWSER=1`)
- MCP servers at `/opt/mcp-servers/`
- Config baked at `/opt/openclaw-config/`, synced to volume on first run

## Troubleshooting

### Gateway won't start
1. `openclaw doctor` -- identify issues
2. `openclaw doctor --fix` -- auto-fix common problems
3. `openclaw config validate` -- check config syntax
4. Check logs: `docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f`

### Agent not responding
1. `openclaw channels status --probe` -- check channel connectivity
2. `openclaw agents list` -- verify agent is configured
3. `openclaw agents bindings` -- check routing bindings
4. `openclaw sessions --agent <id> --active 60` -- recent sessions

### Cron jobs not running
1. `openclaw cron status` -- check scheduler status
2. `openclaw cron list` -- verify job is enabled
3. `openclaw cron runs` -- check run history for errors
4. `openclaw cron run <id>` -- test run manually

### MCP server issues
1. Check `config/config.json` for server configuration
2. Verify env vars in `.env.prod` for API keys
3. Check container logs for MCP server stderr output
4. `openclaw plugins doctor` -- report plugin load issues

### Memory search not working
1. `openclaw memory status --deep` -- check index + embedding provider
2. `openclaw memory index --force` -- force reindex

### Security concerns
1. `openclaw security audit --deep` -- full security audit
2. `openclaw security audit --fix` -- apply remediations
3. `bash scripts/security-audit.sh` -- 15-point pre-deployment check

## Server Info

- **Host**: dokploy.kodeme.io (168.119.233.161) | Hetzner cx42
- **Domain**: openclaw.kodeme.io
- **Gateway Port**: 18789
- **Image**: ghcr.io/kodemeio/kodemeio-openclaw
- **Version**: 2026.3.24 (CLI), image tag via `${IMAGE_TAG:-latest}` in docker-compose
- **Allowed Telegram Users**: [634688702]
