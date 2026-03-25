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

## Commands

| Command | Description |
|---------|-------------|
| `kctl-dokploy status show` | Platform dashboard (projects, services) |
| `kctl-dokploy projects list` | List all projects |
| `kctl-dokploy projects get <name>` | Project details |
| `kctl-dokploy apps list` | All compose services across projects |
| `kctl-dokploy servers list` | List all servers |
| `kctl-dokploy deployments list` | Recent deployments |
| `kctl-dokploy domains list` | All configured domains |
| `kctl-dokploy backups list` | Backup inventory |
| `kctl-dokploy env list <compose-id>` | List environment variables |
| `kctl-dokploy env get <compose-id> <key>` | Get single env var |
| `kctl-dokploy logs show <compose-id> [--lines N]` | Service logs |
| `kctl-dokploy deploy run <compose-id>` | Trigger deployment |
| `kctl-dokploy notify test` | Test notification channel |
| `kctl-dokploy cleanup stats` | Docker container stats |
| `kctl-dokploy health check` | API connectivity |
| `kctl-dokploy config init` | First-time setup |
| `kctl-dokploy config show` | Show config (masked) |
| `kctl-dokploy config test` | Test connection |
| `kctl-dokploy config use <profile>` | Switch profile |

## Global Options

`--json` `--quiet` `-q` `--profile` `-p` `--url` `--api-key` `--version` `-V`

## Deployment Workflow

```bash
kctl-dokploy status show           # Dashboard
kctl-dokploy apps list             # Find compose ID
kctl-dokploy deploy run <id>       # Deploy
kctl-dokploy logs show <id>        # Check logs
```

## Troubleshooting

- Deployment stuck: `deployments list` → `logs show <id>` → `docker ps`
- Service down: `health check` → `domains list` → Traefik logs
- Env issues: `env list <id>` → compare with .env.example
