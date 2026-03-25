---
name: hetzner-admin
description: >
  Hetzner Cloud infrastructure administration for kodemeio. Full CRUD for
  servers, volumes, firewalls, networks, SSH keys, IPs, snapshots, load
  balancers, and DNS. Cost reporting and infrastructure dashboard.
  Use when working with kctl-hetzner CLI or managing Hetzner Cloud resources.
version: 1.0.0
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Hetzner Cloud Administration for Kodemeio

## System Overview

- **Server**: cx42 (8 vCPU, 16 GB RAM) at fsn1 datacenter
- **IP**: 168.119.233.161 (dokploy.kodeme.io)
- **APIs**: Hetzner Cloud API v1 + Hetzner DNS API v1 (separate tokens)
- **CLI**: `kctl-hetzner` (Python, installed via `uv tool install ./cli`)
- **Config**: `~/.config/kodemeio/config.yaml` → `profiles.<profile>.hetzner`

## Implemented Commands

| Command | Description |
|---------|-------------|
| `kctl-hetzner servers list` | All servers |
| `kctl-hetzner servers get <name>` | Server details |
| `kctl-hetzner status show` | Infrastructure dashboard |
| `kctl-hetzner health check` | API connectivity |
| `kctl-hetzner config init` | First-time setup |

## Global Options

| Flag | Description |
|------|-------------|
| `--json` | JSON output |
| `--quiet`, `-q` | Suppress info |
| `--profile`, `-p` | Config profile |
| `--token` | Cloud API token override |
| `--dns-token` | DNS API token override |
| `--version`, `-V` | Show version |

## Server Management

```bash
# Create a new server
kctl-hetzner servers create my-server \
  --type cx22 \
  --image ubuntu-24.04 \
  --location fsn1 \
  --ssh-keys my-key

# Power operations
kctl-hetzner servers reboot my-server
kctl-hetzner servers shutdown my-server
kctl-hetzner servers power-off my-server

# Rebuild (reinstall OS)
kctl-hetzner servers rebuild my-server --image ubuntu-24.04
```

## DNS Management

DNS uses a SEPARATE API with a different token (`dns_token`).

```bash
# List zones
kctl-hetzner dns zones

# List records
kctl-hetzner dns records kodeme.io

# Create record
kctl-hetzner dns create-record kodeme.io \
  --type A --name www --value 168.119.233.161
```

## Cost Monitoring

```bash
# Get estimated monthly costs
kctl-hetzner costs estimate

# Check server sizes and pricing
kctl-hetzner servers list --json | jq '.[].server_type'
```

## Troubleshooting

### Server unreachable
1. `kctl-hetzner servers get <name>` — check status (running?)
2. `kctl-hetzner firewalls list` — check firewall rules
3. `kctl-hetzner ips list` — verify IP assignment
4. SSH test: `ssh root@<ip> echo ok`

### Volume full
1. `kctl-hetzner volumes list` — check sizes
2. Expand: resize via Hetzner console (API doesn't support resize)
3. `df -h` inside server to verify

### DNS not resolving
1. `kctl-hetzner dns records <zone>` — check record exists
2. Note: Hetzner DNS is separate from Cloudflare DNS
3. If using Cloudflare as DNS, use kctl-cloudflare instead
