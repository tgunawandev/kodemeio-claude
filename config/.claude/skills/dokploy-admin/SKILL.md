---
name: dokploy-admin
description: >
  Dokploy deployment platform administration for kodemeio infrastructure.
  Manages projects, compose services, deployments, domains, backups,
  environment variables, and logs. Use when working with kctl-dokploy CLI
  or managing dokploy.kodeme.io.
version: 1.0.0
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Dokploy Administration for Kodemeio

## System Overview

- **URL**: dokploy.kodeme.io
- **Server**: Hetzner cx42 (8 vCPU, 16 GB, 168.119.233.161)
- **Architecture**: Cloudflare Edge → cloudflared tunnel → Traefik → Dokploy → ~55 containers
- **CLI**: `kctl-dokploy` (Python, installed via `uv tool install ./cli`)
- **Config**: `~/.config/kodemeio/config.yaml` → `profiles.<profile>.dokploy`

## Quick Reference

| Command | Description |
|---------|-------------|
| `kctl-dokploy status` | Platform dashboard |
| `kctl-dokploy projects list` | List all projects |
| `kctl-dokploy projects get <name>` | Project details |
| `kctl-dokploy apps list` | All compose services |
| `kctl-dokploy deployments list` | Recent deployments |
| `kctl-dokploy domains list` | All configured domains |
| `kctl-dokploy env list <compose-id>` | Environment variables |
| `kctl-dokploy logs <compose-id>` | Service logs |
| `kctl-dokploy deploy <compose-id>` | Trigger deployment |
| `kctl-dokploy backups list` | Backup inventory |
| `kctl-dokploy health check` | API connectivity |
| `kctl-dokploy cleanup stats` | Docker cleanup stats |
| `kctl-dokploy config init` | First-time setup |
| `kctl-dokploy config test` | Test connection |
| `kctl-dokploy config show` | Show config (masked) |

## Global Options

| Flag | Description |
|------|-------------|
| `--json` | JSON output (for piping) |
| `--quiet`, `-q` | Suppress info messages |
| `--profile`, `-p` | Config profile name |
| `--url` | API URL override |
| `--api-key` | API key override |
| `--version`, `-V` | Show version |

## Deployment Workflow

```bash
# Check current state
kctl-dokploy status

# Find the compose service ID
kctl-dokploy apps list

# Check environment
kctl-dokploy env list <compose-id>

# Deploy
kctl-dokploy deploy <compose-id>

# Check logs
kctl-dokploy logs <compose-id>
```

## Troubleshooting

### Deployment stuck
1. `kctl-dokploy deployments list` — check status
2. `kctl-dokploy logs <id>` — check container logs
3. `docker ps --filter name=<service>` — check container state

### Service not accessible
1. `kctl-dokploy domains list` — check domain config
2. `kctl-dokploy health check` — verify API is up
3. Check Traefik: `docker logs traefik --tail 50`

### Environment issues
1. `kctl-dokploy env list <id>` — check current env
2. Compare with `.env.example` in the project repo
